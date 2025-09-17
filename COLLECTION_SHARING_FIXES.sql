-- Collection Sharing Fixes
-- Run these SQL statements to fix collection sharing functionality

-- 1. Ensure pending_invitations table has the correct structure
CREATE TABLE IF NOT EXISTS pending_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pending_invitations_email ON pending_invitations(email);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_invited_by ON pending_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_pending_invitations_status ON pending_invitations(status);

-- 3. Ensure map_preset_members table exists with correct structure
-- First check if table exists and add missing columns
DO $$
BEGIN
    -- Create table if it doesn't exist
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'map_preset_members') THEN
        CREATE TABLE map_preset_members (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            preset_id UUID REFERENCES map_presets(id) ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            role TEXT DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
            invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(preset_id, user_id)
        );
    ELSE
        -- Add missing columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'map_preset_members' AND column_name = 'invited_by') THEN
            ALTER TABLE map_preset_members ADD COLUMN invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'map_preset_members' AND column_name = 'joined_at') THEN
            ALTER TABLE map_preset_members ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'map_preset_members' AND column_name = 'created_at') THEN
            ALTER TABLE map_preset_members ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'map_preset_members' AND column_name = 'updated_at') THEN
            ALTER TABLE map_preset_members ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        -- Add role column if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'map_preset_members' AND column_name = 'role') THEN
            ALTER TABLE map_preset_members ADD COLUMN role TEXT DEFAULT 'viewer';
            -- Add check constraint for role
            ALTER TABLE map_preset_members ADD CONSTRAINT map_preset_members_role_check CHECK (role IN ('viewer', 'editor', 'admin'));
        END IF;
    END IF;
END $$;

-- 4. Add indexes for map_preset_members
CREATE INDEX IF NOT EXISTS idx_map_preset_members_preset_id ON map_preset_members(preset_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_members_user_id ON map_preset_members(user_id);
CREATE INDEX IF NOT EXISTS idx_map_preset_members_invited_by ON map_preset_members(invited_by);

-- 5. Ensure notifications table supports collection_invitation type
-- Add collection_invitation to the notification types if not already present
-- This is handled by the application code, but ensure the table structure is correct

-- 6. Create a function to handle collection sharing invitations
DROP FUNCTION IF EXISTS handle_collection_sharing_invitation(UUID, UUID, TEXT);
CREATE OR REPLACE FUNCTION handle_collection_sharing_invitation(
    invitation_id UUID,
    target_user_id UUID,
    action TEXT -- 'accept' or 'decline'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    invitation_record RECORD;
    result JSONB;
BEGIN
    -- Get the invitation details
    SELECT * INTO invitation_record
    FROM pending_invitations
    WHERE id = invitation_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invitation not found or already processed');
    END IF;
    
    -- Extract metadata
    DECLARE
        collection_id UUID := (invitation_record.metadata->>'collectionId')::UUID;
        collection_name TEXT := invitation_record.metadata->>'collectionName';
        sharing_role TEXT := COALESCE(invitation_record.metadata->>'sharingRole', 'viewer');
    BEGIN
        IF action = 'accept' THEN
            -- Add user to collection
            INSERT INTO map_preset_members (preset_id, user_id, role, invited_by)
            VALUES (collection_id, target_user_id, sharing_role, invitation_record.invited_by)
            ON CONFLICT (preset_id, user_id) DO UPDATE SET
                role = EXCLUDED.role,
                updated_at = NOW();
            
            -- Mark invitation as accepted
            UPDATE pending_invitations
            SET status = 'accepted', updated_at = NOW()
            WHERE id = invitation_id;
            
            result := jsonb_build_object(
                'success', true,
                'message', 'Successfully joined collection: ' || collection_name,
                'collection_id', collection_id,
                'collection_name', collection_name
            );
            
        ELSIF action = 'decline' THEN
            -- Mark invitation as declined
            UPDATE pending_invitations
            SET status = 'declined', updated_at = NOW()
            WHERE id = invitation_id;
            
            result := jsonb_build_object(
                'success', true,
                'message', 'Declined invitation to collection: ' || collection_name
            );
        ELSE
            result := jsonb_build_object('success', false, 'error', 'Invalid action');
        END IF;
    END;
    
    RETURN result;
END;
$$;

-- 7. Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_collection_sharing_invitation TO authenticated;

-- 8. Create RLS policies for pending_invitations
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own invitations
DROP POLICY IF EXISTS "Users can view their own invitations" ON pending_invitations;
CREATE POLICY "Users can view their own invitations" ON pending_invitations
    FOR SELECT USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR invited_by = auth.uid()
    );

-- Policy for users to create invitations
DROP POLICY IF EXISTS "Users can create invitations" ON pending_invitations;
CREATE POLICY "Users can create invitations" ON pending_invitations
    FOR INSERT WITH CHECK (invited_by = auth.uid());

-- Policy for users to update their own invitations
DROP POLICY IF EXISTS "Users can update their own invitations" ON pending_invitations;
CREATE POLICY "Users can update their own invitations" ON pending_invitations
    FOR UPDATE USING (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        OR invited_by = auth.uid()
    );

-- 9. Create RLS policies for map_preset_members
ALTER TABLE map_preset_members ENABLE ROW LEVEL SECURITY;

-- Policy for users to see members of collections they have access to
DROP POLICY IF EXISTS "Users can view collection members" ON map_preset_members;
CREATE POLICY "Users can view collection members" ON map_preset_members
    FOR SELECT USING (
        user_id = auth.uid()
        OR preset_id IN (
            SELECT id FROM map_presets WHERE creator_id = auth.uid()
        )
        OR preset_id IN (
            SELECT preset_id FROM map_preset_members WHERE user_id = auth.uid()
        )
    );

-- Policy for collection creators to manage members
DROP POLICY IF EXISTS "Collection creators can manage members" ON map_preset_members;
CREATE POLICY "Collection creators can manage members" ON map_preset_members
    FOR ALL USING (
        preset_id IN (
            SELECT id FROM map_presets WHERE creator_id = auth.uid()
        )
    );

-- Policy for users to join collections they're invited to
DROP POLICY IF EXISTS "Users can join collections they're invited to" ON map_preset_members;
CREATE POLICY "Users can join collections they're invited to" ON map_preset_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND preset_id IN (
            SELECT (metadata->>'collectionId')::UUID
            FROM pending_invitations
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
            AND status = 'accepted'
        )
    );

-- 10. Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to pending_invitations
DROP TRIGGER IF EXISTS update_pending_invitations_updated_at ON pending_invitations;
CREATE TRIGGER update_pending_invitations_updated_at
    BEFORE UPDATE ON pending_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to map_preset_members
DROP TRIGGER IF EXISTS update_map_preset_members_updated_at ON map_preset_members;
CREATE TRIGGER update_map_preset_members_updated_at
    BEFORE UPDATE ON map_preset_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 11. Create a view for easier collection member management
CREATE OR REPLACE VIEW collection_members_with_details AS
SELECT 
    mpm.id,
    mpm.preset_id,
    mpm.user_id,
    mpm.role,
    mpm.invited_by,
    mpm.joined_at,
    mpm.created_at,
    mpm.updated_at,
    mp.name as collection_name,
    mp.creator_id as collection_creator_id,
    p.full_name as user_name,
    p.email as user_email,
    inviter.full_name as inviter_name,
    inviter.email as inviter_email
FROM map_preset_members mpm
JOIN map_presets mp ON mpm.preset_id = mp.id
LEFT JOIN profiles p ON mpm.user_id = p.id
LEFT JOIN profiles inviter ON mpm.invited_by = inviter.id;

-- Grant access to the view
GRANT SELECT ON collection_members_with_details TO authenticated;

-- 12. Create a function to get user's collection invitations
DROP FUNCTION IF EXISTS get_user_collection_invitations(TEXT);
CREATE OR REPLACE FUNCTION get_user_collection_invitations(user_email TEXT)
RETURNS TABLE (
    invitation_id UUID,
    collection_id UUID,
    collection_name TEXT,
    inviter_name TEXT,
    inviter_email TEXT,
    custom_message TEXT,
    sharing_role TEXT,
    invited_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pi.id as invitation_id,
        (pi.metadata->>'collectionId')::UUID as collection_id,
        pi.metadata->>'collectionName' as collection_name,
        pi.metadata->>'inviterName' as inviter_name,
        pi.metadata->>'inviterName' as inviter_email,
        pi.metadata->>'customMessage' as custom_message,
        COALESCE(pi.metadata->>'sharingRole', 'viewer') as sharing_role,
        pi.created_at as invited_at
    FROM pending_invitations pi
    WHERE pi.email = user_email
    AND pi.role = 'collection_sharing'
    AND pi.status = 'pending'
    ORDER BY pi.created_at DESC;
END;
$$;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION get_user_collection_invitations TO authenticated;

-- 13. Clean up old pending invitations (optional - run periodically)
-- DELETE FROM pending_invitations 
-- WHERE created_at < NOW() - INTERVAL '30 days' 
-- AND status IN ('declined', 'expired');

COMMENT ON TABLE pending_invitations IS 'Stores pending invitations for collection sharing and other features';
COMMENT ON TABLE map_preset_members IS 'Stores members of map preset collections with their roles';
COMMENT ON FUNCTION handle_collection_sharing_invitation IS 'Handles accepting or declining collection sharing invitations';
COMMENT ON FUNCTION get_user_collection_invitations IS 'Gets all pending collection invitations for a user';
