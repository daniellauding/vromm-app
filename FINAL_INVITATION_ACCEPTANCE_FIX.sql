-- FINAL INVITATION ACCEPTANCE FIX
-- This creates a function that handles BOTH notification-based and pending_invitations-based invitations

CREATE OR REPLACE FUNCTION accept_any_invitation(
    p_invitation_id TEXT,
    p_accepted_by UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record RECORD;
    notification_record RECORD;
    student_id UUID;
    supervisor_id UUID;
    collection_id UUID;
    sharing_role TEXT;
    collection_exists BOOLEAN;
    result JSON;
BEGIN
    -- First, try to find it in pending_invitations
    SELECT * INTO invitation_record 
    FROM pending_invitations 
    WHERE id::TEXT = p_invitation_id;
    
    IF FOUND THEN
        -- Handle pending_invitations
        RAISE NOTICE 'Found invitation in pending_invitations: %', invitation_record.id;
        
        -- Determine student_id and supervisor_id based on role and relationship type
        IF invitation_record.role = 'instructor' THEN
            -- This is a supervisor invitation
            supervisor_id := p_accepted_by;
            student_id := invitation_record.invited_by;
        ELSIF invitation_record.role = 'student' THEN
            -- This is a student invitation  
            student_id := p_accepted_by;
            supervisor_id := invitation_record.invited_by;
        ELSE
            -- Handle collection sharing
            IF invitation_record.role = 'collection_sharing' THEN
                -- Get collection info from metadata
                collection_id := (invitation_record.metadata->>'collectionId')::UUID;
                sharing_role := invitation_record.metadata->>'sharingRole';
                
                -- Check if collection exists
                IF collection_id IS NOT NULL THEN
                    SELECT EXISTS(SELECT 1 FROM map_presets WHERE id = collection_id) INTO collection_exists;
                    
                    IF collection_exists THEN
                        INSERT INTO map_preset_members (preset_id, user_id, role)
                        VALUES (collection_id, p_accepted_by, COALESCE(sharing_role, 'viewer'))
                        ON CONFLICT (preset_id, user_id) DO UPDATE SET role = EXCLUDED.role;
                    ELSE
                        RAISE WARNING 'Collection % does not exist, skipping map_preset_members', collection_id;
                    END IF;
                END IF;
                
                -- Update invitation status
                UPDATE pending_invitations 
                SET status = 'accepted', accepted_at = NOW(), accepted_by = p_accepted_by
                WHERE id = invitation_record.id;
                
                RETURN json_build_object('success', true, 'message', 'Collection invitation accepted');
            END IF;
        END IF;
        
        -- Ensure we have valid IDs
        IF student_id IS NULL OR supervisor_id IS NULL THEN
            RETURN json_build_object('success', false, 'error', 'Could not determine student_id or supervisor_id');
        END IF;
        
        -- Update invitation status
        UPDATE pending_invitations 
        SET status = 'accepted', accepted_at = NOW(), accepted_by = p_accepted_by
        WHERE id = invitation_record.id;
        
        -- Create relationships
        INSERT INTO student_supervisor_relationships (student_id, supervisor_id, status)
        VALUES (student_id, supervisor_id, 'active')
        ON CONFLICT (student_id, supervisor_id) DO NOTHING;
        
        INSERT INTO supervisor_student_relationships (supervisor_id, student_id, status)
        VALUES (supervisor_id, student_id, 'active')
        ON CONFLICT (supervisor_id, student_id) DO NOTHING;
        
        RETURN json_build_object('success', true, 'message', 'Invitation accepted successfully');
        
    ELSE
        -- Try to find it in notifications
        SELECT * INTO notification_record 
        FROM notifications 
        WHERE id::TEXT = p_invitation_id;
        
        IF FOUND THEN
            RAISE NOTICE 'Found invitation in notifications: %', notification_record.id;
            
            -- Handle notification-based invitations
            IF notification_record.type = 'collection_invitation' THEN
                collection_id := (notification_record.metadata->>'collection_id')::UUID;
                sharing_role := notification_record.metadata->>'sharingRole';
                
                -- Only proceed if we have a valid collection_id
                IF collection_id IS NOT NULL THEN
                    -- Check if collection exists
                    SELECT EXISTS(SELECT 1 FROM map_presets WHERE id = collection_id) INTO collection_exists;
                    
                    IF collection_exists THEN
                        INSERT INTO map_preset_members (preset_id, user_id, role)
                        VALUES (collection_id, p_accepted_by, COALESCE(sharing_role, 'viewer'))
                        ON CONFLICT (preset_id, user_id) DO UPDATE SET role = EXCLUDED.role;
                    ELSE
                        RAISE WARNING 'Collection % does not exist, skipping map_preset_members', collection_id;
                    END IF;
                ELSE
                    RAISE WARNING 'No collection_id found in notification metadata, skipping map_preset_members';
                END IF;
                
                -- Mark notification as read
                UPDATE notifications 
                SET is_read = true, read_at = NOW()
                WHERE id = notification_record.id;
                
                RETURN json_build_object('success', true, 'message', 'Collection invitation accepted from notification');
                
            ELSIF notification_record.type = 'student_invitation' OR notification_record.type = 'supervisor_invitation' THEN
                -- Handle relationship invitations from notifications
                -- Extract relationship info from metadata
                student_id := (notification_record.metadata->>'student_id')::UUID;
                supervisor_id := (notification_record.metadata->>'supervisor_id')::UUID;
                
                -- If not in metadata, try to determine from actor_id and user roles
                IF student_id IS NULL OR supervisor_id IS NULL THEN
                    -- For student_invitation: actor is supervisor, user accepting is student
                    -- For supervisor_invitation: actor is student, user accepting is supervisor
                    IF notification_record.type = 'student_invitation' THEN
                        student_id := p_accepted_by;
                        supervisor_id := notification_record.actor_id;
                    ELSE
                        student_id := notification_record.actor_id;
                        supervisor_id := p_accepted_by;
                    END IF;
                END IF;
                
                -- Ensure we have valid IDs
                IF student_id IS NULL OR supervisor_id IS NULL THEN
                    RETURN json_build_object('success', false, 'error', 'Could not determine student_id or supervisor_id from notification');
                END IF;
                
                -- Create relationships
                INSERT INTO student_supervisor_relationships (student_id, supervisor_id, status)
                VALUES (student_id, supervisor_id, 'active')
                ON CONFLICT (student_id, supervisor_id) DO NOTHING;
                
                INSERT INTO supervisor_student_relationships (supervisor_id, student_id, status)
                VALUES (supervisor_id, student_id, 'active')
                ON CONFLICT (supervisor_id, student_id) DO NOTHING;
                
                -- Mark notification as read
                UPDATE notifications 
                SET is_read = true, read_at = NOW()
                WHERE id = notification_record.id;
                
                RETURN json_build_object('success', true, 'message', 'Relationship invitation accepted from notification');
            ELSE
                RETURN json_build_object('success', false, 'error', 'Unsupported notification type: ' || notification_record.type);
            END IF;
        ELSE
            RETURN json_build_object('success', false, 'error', 'Invitation not found in either pending_invitations or notifications');
        END IF;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
