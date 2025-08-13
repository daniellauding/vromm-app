-- Create pending_invitations table
-- Migration: 20250813_create_pending_invitations_table.sql

CREATE TABLE IF NOT EXISTS pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'instructor', 'teacher', 'supervisor', 'admin')),
  invited_by UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'failed')),
  metadata JSONB DEFAULT '{}'::jsonb,
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS pending_invitations_email_idx ON pending_invitations(email);
CREATE INDEX IF NOT EXISTS pending_invitations_invited_by_idx ON pending_invitations(invited_by);
CREATE INDEX IF NOT EXISTS pending_invitations_status_idx ON pending_invitations(status);
CREATE INDEX IF NOT EXISTS pending_invitations_created_at_idx ON pending_invitations(created_at);

-- Enable RLS
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view invitations they sent" ON pending_invitations
  FOR SELECT USING (auth.uid() = invited_by);

CREATE POLICY "Users can update invitations they sent" ON pending_invitations
  FOR UPDATE USING (auth.uid() = invited_by);

-- Service role can insert/update any invitations
CREATE POLICY "Service role can manage invitations" ON pending_invitations
  FOR ALL WITH CHECK (true);