-- Migration: Enhance events table with advanced recurrence support
-- This migration adds comprehensive recurrence functionality to events

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

-- Create an index for better query performance on recurring events
CREATE INDEX IF NOT EXISTS idx_events_recurrence ON events(repeat, recurrence_end_date);
CREATE INDEX IF NOT EXISTS idx_events_parent ON events(parent_event_id);

-- Comments for documentation
COMMENT ON COLUMN events.recurrence_rule IS 'JSONB storing complex recurrence patterns like {dayOfWeek: 4, interval: 2, pattern: "every_other_week"}';
COMMENT ON COLUMN events.recurrence_end_date IS 'When the recurrence should stop generating instances';
COMMENT ON COLUMN events.recurrence_count IS 'Maximum number of instances to generate (alternative to end_date)';
COMMENT ON COLUMN events.is_recurring_instance IS 'True if this event is a generated instance of a recurring event';
COMMENT ON COLUMN events.parent_event_id IS 'References the original recurring event if this is an instance'; 