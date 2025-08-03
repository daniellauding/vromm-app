-- ============================================================================
-- SQL Script: Update Existing Events with Recurrence Defaults
-- ============================================================================
-- Copy and paste this entire script into your Supabase SQL editor
-- This will update all existing events with proper recurrence settings

-- 1. Update all existing events to have proper defaults
UPDATE events 
SET 
  repeat = COALESCE(repeat, 'none'),
  recurrence_rule = NULL,
  recurrence_end_date = NULL,
  recurrence_count = NULL,
  is_recurring_instance = COALESCE(is_recurring_instance, FALSE),
  parent_event_id = NULL
WHERE repeat IS NULL OR repeat = '';

-- 2. Ensure all events have a valid repeat value
UPDATE events 
SET repeat = 'none' 
WHERE repeat NOT IN ('none', 'daily', 'weekly', 'biweekly', 'monthly', 'custom');

-- 3. Add helper function to check if event is recurring
CREATE OR REPLACE FUNCTION is_recurring_event(event_row events)
RETURNS boolean AS $$
BEGIN
  RETURN event_row.repeat IS NOT NULL AND event_row.repeat != 'none';
END;
$$ LANGUAGE plpgsql;

-- 4. Add function to calculate next occurrence date
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

-- 5. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_events_recurrence_active 
ON events(repeat, event_date, recurrence_end_date) 
WHERE repeat != 'none';

CREATE INDEX IF NOT EXISTS idx_events_parent_child 
ON events(parent_event_id, is_recurring_instance);

-- 6. Report the migration results
DO $$
DECLARE
  total_events INTEGER;
  recurring_events INTEGER;
  one_time_events INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_events FROM events;
  SELECT COUNT(*) INTO recurring_events FROM events WHERE repeat != 'none';
  one_time_events := total_events - recurring_events;
  
  RAISE NOTICE '====================================';
  RAISE NOTICE 'EVENTS RECURRENCE MIGRATION COMPLETE';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Total events: %', total_events;
  RAISE NOTICE 'Recurring events: %', recurring_events;
  RAISE NOTICE 'One-time events: %', one_time_events;
  RAISE NOTICE '====================================';
END $$; 