-- CREATE DAILY STATUS FEATURE
-- This creates the table and functionality for daily driving status

-- 1. Create daily_status table
CREATE TABLE IF NOT EXISTS daily_status (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('drove', 'didnt_drive')),
  how_it_went TEXT,
  challenges TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one status per user per day
  UNIQUE(user_id, date)
);

-- 2. Create index for faster queries
CREATE INDEX IF NOT EXISTS daily_status_user_date_idx ON daily_status(user_id, date);
CREATE INDEX IF NOT EXISTS daily_status_date_idx ON daily_status(date);

-- 3. Add RLS policies
ALTER TABLE daily_status ENABLE ROW LEVEL SECURITY;

-- Users can only see their own status
CREATE POLICY "Users can view own daily status" ON daily_status
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own status
CREATE POLICY "Users can insert own daily status" ON daily_status
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own status
CREATE POLICY "Users can update own daily status" ON daily_status
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own status
CREATE POLICY "Users can delete own daily status" ON daily_status
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Create function to get daily status
CREATE OR REPLACE FUNCTION get_daily_status(p_user_id UUID, p_date DATE)
RETURNS TABLE (
  id UUID,
  status TEXT,
  how_it_went TEXT,
  challenges TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.status,
    ds.how_it_went,
    ds.challenges,
    ds.notes,
    ds.created_at,
    ds.updated_at
  FROM daily_status ds
  WHERE ds.user_id = p_user_id 
  AND ds.date = p_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to upsert daily status
CREATE OR REPLACE FUNCTION upsert_daily_status(
  p_user_id UUID,
  p_date DATE,
  p_status TEXT,
  p_how_it_went TEXT DEFAULT NULL,
  p_challenges TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  status_id UUID;
BEGIN
  INSERT INTO daily_status (user_id, date, status, how_it_went, challenges, notes)
  VALUES (p_user_id, p_date, p_status, p_how_it_went, p_challenges, p_notes)
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    status = EXCLUDED.status,
    how_it_went = EXCLUDED.how_it_went,
    challenges = EXCLUDED.challenges,
    notes = EXCLUDED.notes,
    updated_at = NOW()
  RETURNING id INTO status_id;
  
  RETURN status_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create function to get weekly status summary
CREATE OR REPLACE FUNCTION get_weekly_status_summary(p_user_id UUID, p_start_date DATE)
RETURNS TABLE (
  date DATE,
  status TEXT,
  how_it_went TEXT,
  challenges TEXT,
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.date,
    ds.status,
    ds.how_it_went,
    ds.challenges,
    ds.notes
  FROM daily_status ds
  WHERE ds.user_id = p_user_id 
  AND ds.date >= p_start_date 
  AND ds.date < p_start_date + INTERVAL '7 days'
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON daily_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_status TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_daily_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_status_summary TO authenticated;
