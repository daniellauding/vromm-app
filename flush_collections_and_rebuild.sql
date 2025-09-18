-- FLUSH COLLECTIONS DATA AND REBUILD SYSTEM
-- This script will clean up all collection data and rebuild the system properly

-- 1. First, let's see what we have before cleanup
SELECT 'BEFORE CLEANUP - Collections:' as status;
SELECT id, name, creator_id, created_at FROM map_presets ORDER BY created_at;

SELECT 'BEFORE CLEANUP - Members:' as status;
SELECT preset_id, user_id, role FROM map_preset_members;

SELECT 'BEFORE CLEANUP - Invitations:' as status;
SELECT preset_id, invited_user_id, role, status FROM collection_invitations;

-- 2. Clean up all collection-related data
-- Delete in correct order to avoid foreign key constraints

-- Delete collection invitations first
DELETE FROM collection_invitations;

-- Delete collection members
DELETE FROM map_preset_members;

-- Delete collection routes (if any)
DELETE FROM map_preset_routes;

-- Delete all collections except system ones
DELETE FROM map_presets WHERE name NOT IN ('VROMM', 'My Routes');

-- 3. Create a fresh, clean system
-- Create some test collections with proper structure

-- Create a test collection for user 06c73e75-0ef7-442b-acd0-ee204f83d1aa
INSERT INTO map_presets (id, name, description, visibility, creator_id, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Test Collection 1',
  'A test collection for debugging',
  'private',
  '06c73e75-0ef7-442b-acd0-ee204f83d1aa',
  NOW(),
  NOW()
);

-- Create a test collection for user 5ee16b4f-5ef9-41bd-b571-a9dc895027c1
INSERT INTO map_presets (id, name, description, visibility, creator_id, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Test Collection 2', 
  'Another test collection for debugging',
  'private',
  '5ee16b4f-5ef9-41bd-b571-a9dc895027c1',
  NOW(),
  NOW()
);

-- 4. Create the invitation system table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS collection_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id UUID NOT NULL REFERENCES map_presets(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'read' CHECK (role IN ('read', 'write', 'admin')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'archived')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  
  -- Basic unique constraint
  UNIQUE(preset_id, invited_user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collection_invitations_preset_id ON collection_invitations(preset_id);
CREATE INDEX IF NOT EXISTS idx_collection_invitations_invited_user_id ON collection_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_collection_invitations_status ON collection_invitations(status);
CREATE INDEX IF NOT EXISTS idx_collection_invitations_created_at ON collection_invitations(created_at);

-- Partial unique index to ensure only one pending invitation per user per collection
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitations 
ON collection_invitations(preset_id, invited_user_id) 
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE collection_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies (drop existing ones first)
DROP POLICY IF EXISTS "Users can view their own invitations" ON collection_invitations;
DROP POLICY IF EXISTS "Users can create invitations for their collections" ON collection_invitations;
DROP POLICY IF EXISTS "Users can respond to their invitations" ON collection_invitations;
DROP POLICY IF EXISTS "Users can delete invitations they sent" ON collection_invitations;

-- Users can view invitations sent to them or sent by them
CREATE POLICY "Users can view their own invitations" ON collection_invitations
  FOR SELECT USING (
    auth.uid() = invited_user_id OR 
    auth.uid() = invited_by_user_id
  );

-- Users can create invitations for collections they own or have admin access
CREATE POLICY "Users can create invitations for their collections" ON collection_invitations
  FOR INSERT WITH CHECK (
    auth.uid() = invited_by_user_id AND
    EXISTS (
      SELECT 1 FROM map_presets mp
      LEFT JOIN map_preset_members mpm ON mp.id = mpm.preset_id AND mpm.user_id = auth.uid()
      WHERE mp.id = preset_id AND (
        mp.creator_id = auth.uid() OR 
        mpm.role IN ('admin', 'write')
      )
    )
  );

-- Users can update invitations they received (accept/decline)
CREATE POLICY "Users can respond to their invitations" ON collection_invitations
  FOR UPDATE USING (auth.uid() = invited_user_id)
  WITH CHECK (auth.uid() = invited_user_id);

-- Users can delete invitations they sent
CREATE POLICY "Users can delete invitations they sent" ON collection_invitations
  FOR DELETE USING (auth.uid() = invited_by_user_id);

-- Function to automatically add user to collection when they accept invitation
CREATE OR REPLACE FUNCTION handle_invitation_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when status changes from pending to accepted
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    -- Add user to collection as member
    INSERT INTO map_preset_members (preset_id, user_id, role, created_at)
    VALUES (NEW.preset_id, NEW.invited_user_id, NEW.role, NOW())
    ON CONFLICT (preset_id, user_id) DO UPDATE SET
      role = NEW.role,
      updated_at = NOW();
    
    -- Set responded_at timestamp
    NEW.responded_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to handle invitation acceptance
DROP TRIGGER IF EXISTS trigger_handle_invitation_acceptance ON collection_invitations;
CREATE TRIGGER trigger_handle_invitation_acceptance
  BEFORE UPDATE ON collection_invitations
  FOR EACH ROW
  EXECUTE FUNCTION handle_invitation_acceptance();

-- 5. Create some test invitations
-- Get the collection IDs we just created
DO $$
DECLARE
    collection1_id UUID;
    collection2_id UUID;
BEGIN
    -- Get the collection IDs
    SELECT id INTO collection1_id FROM map_presets WHERE name = 'Test Collection 1' LIMIT 1;
    SELECT id INTO collection2_id FROM map_presets WHERE name = 'Test Collection 2' LIMIT 1;
    
    -- Create test invitations
    INSERT INTO collection_invitations (preset_id, invited_user_id, invited_by_user_id, role, message)
    VALUES 
        (collection1_id, 'f7898809-c27d-4e81-8051-e049cd68f803', '06c73e75-0ef7-442b-acd0-ee204f83d1aa', 'read', 'You are invited to join this test collection'),
        (collection2_id, 'c16a364f-3bc4-4d60-bca9-460e977fddea', '5ee16b4f-5ef9-41bd-b571-a9dc895027c1', 'write', 'You are invited to join this test collection with write access');
        
    RAISE NOTICE 'Created test invitations for collections: % and %', collection1_id, collection2_id;
END $$;

-- 6. Show the final state
SELECT 'AFTER CLEANUP - Collections:' as status;
SELECT id, name, creator_id, created_at FROM map_presets ORDER BY created_at;

SELECT 'AFTER CLEANUP - Invitations:' as status;
SELECT ci.id, mp.name as collection_name, ci.invited_user_id, ci.role, ci.status, ci.message
FROM collection_invitations ci
JOIN map_presets mp ON ci.preset_id = mp.id;

SELECT 'AFTER CLEANUP - Members:' as status;
SELECT preset_id, user_id, role FROM map_preset_members;

-- 7. Test the system
SELECT 'SYSTEM READY - You can now test the invitation system!' as status;
