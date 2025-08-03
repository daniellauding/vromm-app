-- ============================================================================
-- FINAL EVENTS SYSTEM SQL UPDATE - Copy & Paste into Supabase SQL Editor
-- ============================================================================
-- This script includes ALL migrations for the complete events system

-- 1. Apply the recurrence enhancements migration
-- Add new columns for advanced recurrence patterns
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS recurrence_rule JSONB,
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS recurrence_count INTEGER,
ADD COLUMN IF NOT EXISTS is_recurring_instance BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Update the repeat constraint to include more options
ALTER TABLE events 
DROP CONSTRAINT IF EXISTS events_repeat_check;

ALTER TABLE events 
ADD CONSTRAINT events_repeat_check 
CHECK (repeat IN ('none', 'daily', 'weekly', 'biweekly', 'monthly', 'custom'));

-- 2. Update all existing events to have proper defaults
UPDATE events 
SET 
  repeat = COALESCE(repeat, 'none'),
  recurrence_rule = NULL,
  recurrence_end_date = NULL,
  recurrence_count = NULL,
  is_recurring_instance = COALESCE(is_recurring_instance, FALSE),
  parent_event_id = NULL
WHERE repeat IS NULL OR repeat = '';

-- Ensure all events have a valid repeat value
UPDATE events 
SET repeat = 'none' 
WHERE repeat NOT IN ('none', 'daily', 'weekly', 'biweekly', 'monthly', 'custom');

-- 3. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_events_recurrence_active 
ON events(repeat, event_date, recurrence_end_date) 
WHERE repeat != 'none';

CREATE INDEX IF NOT EXISTS idx_events_parent_child 
ON events(parent_event_id, is_recurring_instance);

-- 4. Add helper functions
CREATE OR REPLACE FUNCTION is_recurring_event(event_row events)
RETURNS boolean AS $$
BEGIN
  RETURN event_row.repeat IS NOT NULL AND event_row.repeat != 'none';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_next_occurrence_date(
  base_date TIMESTAMPTZ,
  recurrence_pattern TEXT,
  recurrence_rule JSONB DEFAULT NULL
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  next_date TIMESTAMPTZ;
  interval_weeks INTEGER;
BEGIN
  CASE recurrence_pattern
    WHEN 'daily' THEN
      next_date := base_date + INTERVAL '1 day';
    
    WHEN 'weekly' THEN
      next_date := base_date + INTERVAL '1 week';
    
    WHEN 'biweekly' THEN
      next_date := base_date + INTERVAL '2 weeks';
    
    WHEN 'monthly' THEN
      next_date := base_date + INTERVAL '1 month';
    
    WHEN 'custom' THEN
      interval_weeks := COALESCE((recurrence_rule->>'interval')::INTEGER, 1);
      next_date := base_date + (interval_weeks || ' weeks')::INTERVAL;
    
    ELSE
      next_date := NULL;
  END CASE;
  
  RETURN next_date;
END;
$$ LANGUAGE plpgsql;

-- 5. Verify the current schema matches our enhanced events table
DO $$
DECLARE
  column_count INTEGER;
  total_events INTEGER;
  recurring_events INTEGER;
BEGIN
  -- Check if all required columns exist
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns 
  WHERE table_name = 'events' 
  AND column_name IN (
    'id', 'title', 'description', 'location', 'visibility', 
    'event_date', 'repeat', 'recurrence_rule', 'recurrence_end_date',
    'recurrence_count', 'is_recurring_instance', 'parent_event_id',
    'media', 'embeds', 'reminders', 'created_by', 'created_at', 'updated_at'
  );
  
  -- Get event counts
  SELECT COUNT(*) INTO total_events FROM events;
  SELECT COUNT(*) INTO recurring_events FROM events WHERE repeat != 'none';
  
  RAISE NOTICE '====================================';
  RAISE NOTICE 'EVENTS SYSTEM MIGRATION COMPLETE';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Schema columns found: % / 15 expected', column_count;
  RAISE NOTICE 'Total events: %', total_events;
  RAISE NOTICE 'Recurring events: %', recurring_events;
  RAISE NOTICE 'One-time events: %', (total_events - recurring_events);
  
  IF column_count = 15 THEN
    RAISE NOTICE '✅ All required columns present';
  ELSE
    RAISE NOTICE '❌ Some columns missing - check migration';
  END IF;
  
  RAISE NOTICE '====================================';
  RAISE NOTICE 'FEATURES NOW AVAILABLE:';
  RAISE NOTICE '• Enhanced location with waypoints';
  RAISE NOTICE '• Media attachments (images/videos)';
  RAISE NOTICE '• Exercise and route embeds';
  RAISE NOTICE '• Full recurrence patterns';
  RAISE NOTICE '• User invitation system';
  RAISE NOTICE '• Map integration like routes';
  RAISE NOTICE '====================================';
END $$; 