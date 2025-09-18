-- Create collection_invitations table for the missing invitation system
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
  
  -- Basic unique constraint (we'll add a partial unique index below)
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

-- RLS Policies
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
CREATE TRIGGER trigger_handle_invitation_acceptance
  BEFORE UPDATE ON collection_invitations
  FOR EACH ROW
  EXECUTE FUNCTION handle_invitation_acceptance();

-- Function to clean up expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  UPDATE collection_invitations 
  SET status = 'archived'
  WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired invitations (if pg_cron is available)
-- This would need to be set up separately in your database
-- SELECT cron.schedule('cleanup-expired-invitations', '0 2 * * *', 'SELECT cleanup_expired_invitations();');

COMMENT ON TABLE collection_invitations IS 'Manages invitations to join collections/presets';
COMMENT ON COLUMN collection_invitations.role IS 'Role the user will have if they accept the invitation';
COMMENT ON COLUMN collection_invitations.status IS 'Current status of the invitation';
COMMENT ON COLUMN collection_invitations.expires_at IS 'When the invitation expires (default 30 days)';
