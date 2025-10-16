-- Add media_uri and media_type columns to daily_status table
-- Run this if the columns don't exist yet

ALTER TABLE daily_status 
ADD COLUMN IF NOT EXISTS media_uri TEXT,
ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_daily_status_media ON daily_status(user_id, date) WHERE media_uri IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN daily_status.media_uri IS 'Public URL of uploaded photo or video from Supabase Storage';
COMMENT ON COLUMN daily_status.media_type IS 'Type of media: image or video';

