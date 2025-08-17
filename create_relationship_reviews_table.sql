-- Create relationship reviews table for rating supervisor-student relationships
CREATE TABLE IF NOT EXISTS public.relationship_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  review_type TEXT NOT NULL CHECK (review_type IN ('student_reviews_supervisor', 'supervisor_reviews_student')),
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one review per relationship per reviewer
  UNIQUE(student_id, supervisor_id, reviewer_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_relationship_reviews_student ON relationship_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_relationship_reviews_supervisor ON relationship_reviews(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_relationship_reviews_reviewer ON relationship_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_relationship_reviews_rating ON relationship_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_relationship_reviews_type ON relationship_reviews(review_type);

-- Enable RLS
ALTER TABLE relationship_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view reviews where they are involved (student, supervisor, or reviewer)
CREATE POLICY "Users can view reviews they are involved in" ON relationship_reviews
  FOR SELECT USING (
    auth.uid() = student_id OR 
    auth.uid() = supervisor_id OR 
    auth.uid() = reviewer_id
  );

-- Users can create reviews for relationships they are part of
CREATE POLICY "Users can create reviews for their relationships" ON relationship_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    (auth.uid() = student_id OR auth.uid() = supervisor_id)
  );

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews" ON relationship_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews" ON relationship_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_relationship_review_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_relationship_review_timestamp ON relationship_reviews;
CREATE TRIGGER trigger_update_relationship_review_timestamp
  BEFORE UPDATE ON relationship_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_relationship_review_updated_at();

-- Function to get average rating for a user as supervisor
CREATE OR REPLACE FUNCTION get_supervisor_average_rating(supervisor_user_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG(rating), 0)
    FROM relationship_reviews
    WHERE supervisor_id = supervisor_user_id
    AND review_type = 'student_reviews_supervisor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get average rating for a user as student
CREATE OR REPLACE FUNCTION get_student_average_rating(student_user_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG(rating), 0)
    FROM relationship_reviews
    WHERE student_id = student_user_id
    AND review_type = 'supervisor_reviews_student'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add unique constraint to prevent duplicate invitations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_pending_invitation_per_relationship'
    AND table_name = 'pending_invitations'
  ) THEN
    ALTER TABLE pending_invitations 
    ADD CONSTRAINT unique_pending_invitation_per_relationship 
    UNIQUE (email, invited_by, status) 
    DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

-- Clean up duplicate invitations (keep the latest one per email/inviter combination)
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY email, invited_by, status 
      ORDER BY created_at DESC
    ) as rn
  FROM pending_invitations
  WHERE status = 'pending'
)
DELETE FROM pending_invitations 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);
