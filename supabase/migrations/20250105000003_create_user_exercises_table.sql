-- Create user_exercises table for rich, user-generated exercises
CREATE TABLE IF NOT EXISTS user_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Core identification
  title JSONB NOT NULL, -- { "en": "string", "sv": "string" } or just "string"
  description JSONB, -- { "en": "string", "sv": "string" } or just "string"
  
  -- Basic properties
  duration TEXT,
  repetitions TEXT,
  order_index INTEGER DEFAULT 0,
  
  -- Rich media support
  youtube_url TEXT,
  icon TEXT,
  image TEXT,
  embed_code TEXT,
  language_specific_media BOOLEAN DEFAULT false,
  custom_media_attachments JSONB DEFAULT '[]'::jsonb, -- Array of media objects
  
  -- Quiz and assessment features
  has_quiz BOOLEAN DEFAULT false,
  quiz_required BOOLEAN DEFAULT false,
  quiz_pass_score INTEGER DEFAULT 70,
  quiz_data JSONB, -- Full quiz structure
  
  -- Learning progression features
  is_repeat BOOLEAN DEFAULT false,
  original_id UUID REFERENCES user_exercises(id) ON DELETE SET NULL,
  repeat_number INTEGER DEFAULT 1,
  repeat_count INTEGER DEFAULT 1,
  bypass_order BOOLEAN DEFAULT false,
  
  -- Access control
  is_locked BOOLEAN DEFAULT false,
  lock_password TEXT,
  
  -- Monetization features (for future use)
  paywall_enabled BOOLEAN DEFAULT false,
  price_usd DECIMAL(10, 2),
  price_sek DECIMAL(10, 2),
  
  -- User-Generated Content Management
  visibility TEXT NOT NULL CHECK (visibility IN ('private', 'public', 'unlisted')) DEFAULT 'private',
  is_user_generated BOOLEAN DEFAULT true,
  category TEXT NOT NULL DEFAULT 'user-created',
  tags TEXT[] DEFAULT '{}',
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner',
  vehicle_type TEXT CHECK (vehicle_type IN ('manual', 'automatic', 'both')) DEFAULT 'both',
  
  -- Community & Quality
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  rating DECIMAL(3, 2) DEFAULT 0.0, -- Average rating
  rating_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  report_count INTEGER DEFAULT 0,
  
  -- Admin Promotion System
  admin_notes TEXT,
  promotion_status TEXT CHECK (promotion_status IN ('none', 'nominated', 'under_review', 'approved', 'promoted')) DEFAULT 'none',
  promoted_to_learning_path_id UUID, -- Reference to learning_paths table
  quality_score DECIMAL(5, 2) DEFAULT 0.0,
  
  -- Creator and timestamps
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_exercises_creator ON user_exercises(creator_id);
CREATE INDEX IF NOT EXISTS idx_user_exercises_visibility ON user_exercises(visibility);
CREATE INDEX IF NOT EXISTS idx_user_exercises_category ON user_exercises(category);
CREATE INDEX IF NOT EXISTS idx_user_exercises_difficulty ON user_exercises(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_user_exercises_vehicle_type ON user_exercises(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_user_exercises_featured ON user_exercises(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_user_exercises_verified ON user_exercises(is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_user_exercises_rating ON user_exercises(rating) WHERE rating > 0;
CREATE INDEX IF NOT EXISTS idx_user_exercises_tags ON user_exercises USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_user_exercises_promotion_status ON user_exercises(promotion_status);

-- Enable RLS
ALTER TABLE user_exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_exercises
CREATE POLICY "Users can view public user exercises" 
ON user_exercises FOR SELECT 
USING (visibility = 'public');

CREATE POLICY "Users can view their own user exercises" 
ON user_exercises FOR SELECT 
USING (auth.uid() = creator_id);

CREATE POLICY "Users can view unlisted exercises they have access to" 
ON user_exercises FOR SELECT 
USING (visibility = 'unlisted'); -- Additional access control can be added later

CREATE POLICY "Users can insert their own user exercises" 
ON user_exercises FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own user exercises" 
ON user_exercises FOR UPDATE 
USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own user exercises" 
ON user_exercises FOR DELETE 
USING (auth.uid() = creator_id);

-- Admins can view and modify all exercises (for moderation)
CREATE POLICY "Admins can view all user exercises" 
ON user_exercises FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  )
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_user_exercises
  BEFORE UPDATE ON user_exercises
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at();

-- Create user_exercise_ratings table for rating system
CREATE TABLE IF NOT EXISTS user_exercise_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL REFERENCES user_exercises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exercise_id, user_id) -- One rating per user per exercise
);

-- Indexes for ratings
CREATE INDEX IF NOT EXISTS idx_user_exercise_ratings_exercise ON user_exercise_ratings(exercise_id);
CREATE INDEX IF NOT EXISTS idx_user_exercise_ratings_user ON user_exercise_ratings(user_id);

-- RLS for ratings
ALTER TABLE user_exercise_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all exercise ratings" 
ON user_exercise_ratings FOR SELECT 
USING (true);

CREATE POLICY "Users can rate exercises" 
ON user_exercise_ratings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ratings" 
ON user_exercise_ratings FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ratings" 
ON user_exercise_ratings FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger to update exercise rating when ratings change
CREATE OR REPLACE FUNCTION update_exercise_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the average rating and count for the exercise
  UPDATE user_exercises 
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)::DECIMAL(3,2) 
      FROM user_exercise_ratings 
      WHERE exercise_id = COALESCE(NEW.exercise_id, OLD.exercise_id)
    ),
    rating_count = (
      SELECT COUNT(*) 
      FROM user_exercise_ratings 
      WHERE exercise_id = COALESCE(NEW.exercise_id, OLD.exercise_id)
    )
  WHERE id = COALESCE(NEW.exercise_id, OLD.exercise_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers to update ratings automatically
CREATE TRIGGER update_exercise_rating_on_insert
  AFTER INSERT ON user_exercise_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_exercise_rating();

CREATE TRIGGER update_exercise_rating_on_update
  AFTER UPDATE ON user_exercise_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_exercise_rating();

CREATE TRIGGER update_exercise_rating_on_delete
  AFTER DELETE ON user_exercise_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_exercise_rating();

-- Add updated_at trigger for ratings
CREATE TRIGGER set_updated_at_user_exercise_ratings
  BEFORE UPDATE ON user_exercise_ratings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_updated_at(); 