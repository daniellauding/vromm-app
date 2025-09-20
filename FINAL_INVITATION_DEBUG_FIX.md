# FINAL INVITATION DEBUG FIX

## The Issue:
1. **"Invitation not found"** - The invitation ID being passed doesn't exist in `pending_invitations`
2. **Foreign key error** - Still trying to use the old broken collection ID `43cdb003-3df7-4f07-9d04-9055f897c798`

## Quick Fix:

### 1. Run the debug script first:
```sql
-- Run DEBUG_INVITATION_IDS.sql in Supabase to see what's happening
```

### 2. Update the bulletproof function to handle missing invitations better:

```sql
-- Update the function to be more robust
CREATE OR REPLACE FUNCTION public.accept_invitation_ultimate(
  p_invitation_id UUID,
  p_accepted_by UUID
)
RETURNS JSON AS $$
DECLARE
  invitation_record RECORD;
  student_id UUID;
  supervisor_id UUID;
  collection_id UUID;
  sharing_role TEXT;
  collection_exists BOOLEAN;
BEGIN
  -- Get the invitation details
  SELECT * INTO invitation_record 
  FROM pending_invitations 
  WHERE id = p_invitation_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invitation not found', 'invitation_id', p_invitation_id);
  END IF;
  
  -- Check if already accepted
  IF invitation_record.accepted_by IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invitation already accepted');
  END IF;
  
  -- ALWAYS set student_id to the person accepting (this fixes the null error)
  student_id := p_accepted_by;
  supervisor_id := invitation_record.invited_by;
  
  -- Validate both IDs exist
  IF student_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'student_id is null');
  END IF;
  
  IF supervisor_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'supervisor_id is null');
  END IF;
  
  -- Extract collection info safely
  IF invitation_record.metadata IS NOT NULL THEN
    collection_id := (invitation_record.metadata->>'collection_id')::UUID;
    sharing_role := invitation_record.metadata->>'sharingRole';
    
    -- Check if collection exists (this fixes the preset_id error)
    IF collection_id IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM map_presets WHERE id = collection_id) INTO collection_exists;
      
      -- If collection doesn't exist, skip the map_preset_members part
      IF NOT collection_exists THEN
        RAISE WARNING 'Collection % does not exist, skipping map_preset_members', collection_id;
        collection_id := NULL;
      END IF;
    END IF;
  END IF;
  
  -- Update the invitation as accepted
  UPDATE pending_invitations 
  SET accepted_by = p_accepted_by,
      accepted_at = NOW(),
      status = 'accepted'
  WHERE id = p_invitation_id;
  
  -- Create student_supervisor_relationships (with explicit NOT NULL check)
  INSERT INTO student_supervisor_relationships (
    student_id,
    supervisor_id,
    relationship_type,
    created_at
  ) VALUES (
    student_id,
    supervisor_id,
    COALESCE(sharing_role, 'student'),
    NOW()
  ) ON CONFLICT (student_id, supervisor_id) DO NOTHING;
  
  -- Create supervisor_student_relationships (with explicit NOT NULL check)
  INSERT INTO supervisor_student_relationships (
    student_id,
    supervisor_id,
    relationship_type,
    created_at
  ) VALUES (
    student_id,
    supervisor_id,
    COALESCE(sharing_role, 'student'),
    NOW()
  ) ON CONFLICT (student_id, supervisor_id) DO NOTHING;
  
  -- Handle map_preset_members if collection exists
  IF collection_id IS NOT NULL AND sharing_role IS NOT NULL THEN
    INSERT INTO map_preset_members (preset_id, user_id, role)
    VALUES (collection_id, student_id, sharing_role)
    ON CONFLICT (preset_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  END IF;
  
  RETURN json_build_object('success', true, 'invitation_id', p_invitation_id);
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM, 'sqlstate', SQLSTATE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Add better error handling to the app:

```typescript
// In your invitation acceptance code, add this:
const { data, error } = await supabase.rpc('accept_invitation_ultimate', {
  p_invitation_id: invitationId,
  p_accepted_by: userId
});

if (error) {
  console.error('RPC error:', error);
  throw error;
}

if (!data.success) {
  console.error('Function error:', data.error);
  console.error('Invitation ID:', data.invitation_id);
  throw new Error(data.error);
}
```

## What this does:
- ✅ **Better error messages** - shows which invitation ID failed
- ✅ **Handles missing collections** - skips map_preset_members if collection doesn't exist
- ✅ **More robust error handling** - catches all edge cases
- ✅ **Debug information** - shows exactly what's happening

**Run the debug script first to see what invitations exist, then update the function!**
