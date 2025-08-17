-- COMPLETE FIX: Create all missing tables and relationships system
-- Copy and paste this entire script to fix everything

-- Step 1: Create supervisor_student_relationships table
CREATE TABLE IF NOT EXISTS public.supervisor_student_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supervisor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  
  -- Prevent duplicate relationships
  UNIQUE(student_id, supervisor_id)
);

-- Create indexes for supervisor_student_relationships
CREATE INDEX IF NOT EXISTS idx_supervisor_student_relationships_student ON supervisor_student_relationships(student_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_student_relationships_supervisor ON supervisor_student_relationships(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_supervisor_student_relationships_status ON supervisor_student_relationships(status);

-- Enable RLS for supervisor_student_relationships
ALTER TABLE supervisor_student_relationships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supervisor_student_relationships
CREATE POLICY "Users can view their own relationships" ON supervisor_student_relationships
  FOR SELECT USING (
    auth.uid() = student_id OR auth.uid() = supervisor_id
  );

CREATE POLICY "Users can create relationships they are part of" ON supervisor_student_relationships
  FOR INSERT WITH CHECK (
    auth.uid() = student_id OR auth.uid() = supervisor_id
  );

-- Step 2: Create relationship reviews table with report functionality
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
  
  -- Report/Flag functionality
  is_reported BOOLEAN DEFAULT FALSE,
  report_count INTEGER DEFAULT 0,
  reported_by UUID[] DEFAULT '{}',
  admin_reviewed BOOLEAN DEFAULT FALSE,
  is_hidden BOOLEAN DEFAULT FALSE,
  
  -- Ensure one review per relationship per reviewer
  UNIQUE(student_id, supervisor_id, reviewer_id)
);

-- Create indexes for relationship_reviews
CREATE INDEX IF NOT EXISTS idx_relationship_reviews_student ON relationship_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_relationship_reviews_supervisor ON relationship_reviews(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_relationship_reviews_reviewer ON relationship_reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_relationship_reviews_rating ON relationship_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_relationship_reviews_type ON relationship_reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_relationship_reviews_reported ON relationship_reviews(is_reported);

-- Enable RLS for relationship_reviews
ALTER TABLE relationship_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for relationship_reviews
-- Users can view reviews where they are involved (student, supervisor, or reviewer)
CREATE POLICY "Users can view reviews they are involved in" ON relationship_reviews
  FOR SELECT USING (
    (auth.uid() = student_id OR auth.uid() = supervisor_id OR auth.uid() = reviewer_id)
    AND is_hidden = FALSE
  );

-- Users can create reviews for relationships they are part of
CREATE POLICY "Users can create reviews for their relationships" ON relationship_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    (auth.uid() = student_id OR auth.uid() = supervisor_id) AND
    EXISTS (
      SELECT 1 FROM supervisor_student_relationships 
      WHERE (student_id = NEW.student_id AND supervisor_id = NEW.supervisor_id)
        AND status = 'active'
    )
  );

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews" ON relationship_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id AND is_hidden = FALSE);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews" ON relationship_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- Admins can see and manage all reviews
CREATE POLICY "Admins can manage all reviews" ON relationship_reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Step 3: Add trigger for updated_at on relationship_reviews
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

-- Step 4: Create rating functions
CREATE OR REPLACE FUNCTION get_supervisor_average_rating(supervisor_user_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG(rating), 0)
    FROM relationship_reviews
    WHERE supervisor_id = supervisor_user_id
    AND review_type = 'student_reviews_supervisor'
    AND is_hidden = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_student_average_rating(student_user_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN (
    SELECT COALESCE(AVG(rating), 0)
    FROM relationship_reviews
    WHERE student_id = student_user_id
    AND review_type = 'supervisor_reviews_student'
    AND is_hidden = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create report review function
CREATE OR REPLACE FUNCTION report_review(review_id UUID, reporter_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_reports UUID[];
BEGIN
  -- Get current reported_by array
  SELECT reported_by INTO current_reports 
  FROM relationship_reviews 
  WHERE id = review_id;
  
  -- Check if user already reported
  IF reporter_id = ANY(current_reports) THEN
    RETURN FALSE; -- Already reported
  END IF;
  
  -- Add reporter to array and increment count
  UPDATE relationship_reviews 
  SET 
    reported_by = array_append(reported_by, reporter_id),
    report_count = report_count + 1,
    is_reported = TRUE,
    updated_at = NOW()
  WHERE id = review_id;
  
  -- Auto-hide if 3+ reports
  UPDATE relationship_reviews 
  SET is_hidden = TRUE 
  WHERE id = review_id AND report_count >= 3;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Fix pending_invitations unique constraint
DO $$ 
BEGIN
  -- First, clean up any remaining duplicates
  WITH duplicates AS (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY email, invited_by, status 
        ORDER BY created_at DESC, updated_at DESC
      ) as rn
    FROM pending_invitations
  )
  DELETE FROM pending_invitations 
  WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
  );

  -- Then add constraint if it doesn't exist
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

-- Step 7: Verification - Check everything is working
SELECT 
  'supervisor_student_relationships' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supervisor_student_relationships') 
    THEN 'EXISTS ✅' ELSE 'MISSING ❌' END as status

UNION ALL

SELECT 
  'relationship_reviews',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'relationship_reviews') 
    THEN 'EXISTS ✅' ELSE 'MISSING ❌' END

UNION ALL

SELECT 
  'unique constraint',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'unique_pending_invitation_per_relationship') 
    THEN 'APPLIED ✅' ELSE 'MISSING ❌' END

UNION ALL

SELECT 
  'rating functions',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'get_supervisor_average_rating') 
    THEN 'CREATED ✅' ELSE 'MISSING ❌' END

UNION ALL

SELECT 
  'report function',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'report_review') 
    THEN 'CREATED ✅' ELSE 'MISSING ❌' END;

-- Step 8: Show current state
SELECT 
  'Total pending invitations' as metric,
  COUNT(*)::text as value
FROM pending_invitations

UNION ALL

SELECT 
  'Total relationships',
  COUNT(*)::text
FROM supervisor_student_relationships

UNION ALL

SELECT 
  'Total reviews',
  COUNT(*)::text
FROM relationship_reviews;
