-- Collection Invitations Migration
-- This migration creates the collection_invitations table for sharing collections

-- Create collection_invitations table
CREATE TABLE IF NOT EXISTS collection_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES map_presets(id) ON DELETE CASCADE,
  invited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_user_email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_by_name TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collection_invitations_collection_id ON collection_invitations(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_invitations_invited_user_id ON collection_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_collection_invitations_invited_by ON collection_invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_collection_invitations_status ON collection_invitations(status);
CREATE INDEX IF NOT EXISTS idx_collection_invitations_created_at ON collection_invitations(created_at);

-- Enable RLS
ALTER TABLE collection_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view invitations sent to them
CREATE POLICY "Users can view invitations sent to them" ON collection_invitations
  FOR SELECT USING (auth.uid() = invited_user_id);

-- Users can view invitations they sent
CREATE POLICY "Users can view invitations they sent" ON collection_invitations
  FOR SELECT USING (auth.uid() = invited_by);

-- Users can create invitations (if they have access to the collection)
CREATE POLICY "Users can create invitations" ON collection_invitations
  FOR INSERT WITH CHECK (
    auth.uid() = invited_by AND
    EXISTS (
      SELECT 1 FROM map_presets 
      WHERE id = collection_id 
      AND (creator_id = auth.uid() OR 
           EXISTS (
             SELECT 1 FROM map_preset_members 
             WHERE preset_id = collection_id 
             AND user_id = auth.uid()
           ))
    )
  );

-- Users can update invitations they sent or received
CREATE POLICY "Users can update their invitations" ON collection_invitations
  FOR UPDATE USING (auth.uid() = invited_by OR auth.uid() = invited_user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_collection_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS collection_invitations_updated_at ON collection_invitations;
CREATE TRIGGER collection_invitations_updated_at
  BEFORE UPDATE ON collection_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_collection_invitations_updated_at();

-- Add comment to table
COMMENT ON TABLE collection_invitations IS 'Stores invitations to join shared collections';
COMMENT ON COLUMN collection_invitations.status IS 'Invitation status: pending, accepted, or rejected';
COMMENT ON COLUMN collection_invitations.message IS 'Optional message from the inviter';
