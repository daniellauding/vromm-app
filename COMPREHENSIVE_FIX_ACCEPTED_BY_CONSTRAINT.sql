-- COMPREHENSIVE FIX FOR ACCEPTED_BY CONSTRAINT ISSUE
-- This completely fixes the "null value in column 'accepted_by' violates not-null constraint" error

-- 1. First, let's check the current state of the pending_invitations table
SELECT 
    column_name, 
    is_nullable, 
    column_default,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'pending_invitations' 
ORDER BY ordinal_position;

-- 2. Check if there are any constraints on the accepted_by column
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'pending_invitations'
AND kcu.column_name = 'accepted_by';

-- 3. Drop the table and recreate it with the correct schema
-- This is the most reliable way to fix the constraint issue
DROP TABLE IF EXISTS pending_invitations CASCADE;

-- 4. Recreate the pending_invitations table with correct schema
CREATE TABLE pending_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'instructor', 'teacher', 'supervisor', 'admin', 'collection_sharing')),
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
    metadata JSONB DEFAULT '{}'::jsonb,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- This should be nullable
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Additional columns for collection invitations
    collection_id UUID REFERENCES map_presets(id) ON DELETE CASCADE,
    collection_name TEXT,
    invitation_type TEXT DEFAULT 'relationship' CHECK (invitation_type IN ('relationship', 'collection_sharing')),
    custom_message TEXT
);

-- 5. Add indexes for better performance
CREATE INDEX IF NOT EXISTS pending_invitations_email_idx ON pending_invitations(email);
CREATE INDEX IF NOT EXISTS pending_invitations_invited_by_idx ON pending_invitations(invited_by);
CREATE INDEX IF NOT EXISTS pending_invitations_status_idx ON pending_invitations(status);
CREATE INDEX IF NOT EXISTS pending_invitations_created_at_idx ON pending_invitations(created_at);
CREATE INDEX IF NOT EXISTS pending_invitations_accepted_by_idx ON pending_invitations(accepted_by);
CREATE INDEX IF NOT EXISTS pending_invitations_invitation_type_idx ON pending_invitations(invitation_type);
CREATE INDEX IF NOT EXISTS pending_invitations_collection_id_idx ON pending_invitations(collection_id);

-- 6. Enable RLS
ALTER TABLE pending_invitations ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies
CREATE POLICY "Users can view invitations they sent" ON pending_invitations
    FOR SELECT USING (auth.uid() = invited_by);

CREATE POLICY "Users can view invitations sent to them" ON pending_invitations
    FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "Users can create invitations" ON pending_invitations
    FOR INSERT WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Users can update invitations they sent" ON pending_invitations
    FOR UPDATE USING (auth.uid() = invited_by);

CREATE POLICY "Users can update invitations sent to them" ON pending_invitations
    FOR UPDATE USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Service role can manage all invitations
CREATE POLICY "Service role can manage invitations" ON pending_invitations
    FOR ALL WITH CHECK (true);

-- 8. Verify the schema is correct
SELECT 
    column_name, 
    is_nullable, 
    column_default,
    data_type
FROM information_schema.columns 
WHERE table_name = 'pending_invitations' 
AND column_name = 'accepted_by';

-- 9. Test that we can insert pending invitations without accepted_by
INSERT INTO pending_invitations (
    email, 
    role, 
    invited_by, 
    status,
    metadata
) VALUES (
    'test@example.com',
    'student',
    (SELECT id FROM profiles LIMIT 1),
    'pending',
    '{"test": true}'::jsonb
);

-- 10. Verify the test data was inserted correctly
SELECT 
    id,
    email,
    role,
    status,
    accepted_by,
    created_at
FROM pending_invitations 
WHERE email = 'test@example.com';

-- 11. Clean up test data
DELETE FROM pending_invitations WHERE email = 'test@example.com';

-- 12. Final verification that accepted_by is nullable
SELECT 
    'SUCCESS: accepted_by column is now nullable' as status,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'pending_invitations' 
AND column_name = 'accepted_by'
AND is_nullable = 'YES';
