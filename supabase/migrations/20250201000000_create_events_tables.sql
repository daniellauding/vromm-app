-- Create events and event attendees tables
-- Safe migration that only creates what doesn't already exist

-- Create events table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events') THEN
        CREATE TABLE events (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            media JSONB,
            embeds JSONB, -- For RouteCards, Exercises, Learning Paths
            location TEXT,
            visibility TEXT CHECK (visibility IN ('public', 'private', 'invite-only')) NOT NULL DEFAULT 'public',
            reminders JSONB, -- Schedule for push/email reminders
            repeat TEXT CHECK (repeat IN ('none', 'daily', 'weekly', 'monthly', 'custom')) DEFAULT 'none',
            event_date TIMESTAMPTZ, -- When the event is scheduled
            created_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        RAISE NOTICE 'Created events table';
    ELSE
        RAISE NOTICE 'events table already exists';
    END IF;
END $$;

-- Create event_attendees table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'event_attendees') THEN
        CREATE TABLE event_attendees (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            event_id UUID REFERENCES events(id) ON DELETE CASCADE,
            user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
            status TEXT CHECK (status IN ('invited', 'accepted', 'rejected')) DEFAULT 'invited',
            invited_at TIMESTAMPTZ DEFAULT NOW(),
            responded_at TIMESTAMPTZ,
            UNIQUE(event_id, user_id)
        );
        
        RAISE NOTICE 'Created event_attendees table';
    ELSE
        RAISE NOTICE 'event_attendees table already exists';
    END IF;
END $$;

-- Add indexes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_events_created_by') THEN
        CREATE INDEX idx_events_created_by ON events(created_by);
        RAISE NOTICE 'Created index idx_events_created_by';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_events_visibility') THEN
        CREATE INDEX idx_events_visibility ON events(visibility);
        RAISE NOTICE 'Created index idx_events_visibility';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_events_event_date') THEN
        CREATE INDEX idx_events_event_date ON events(event_date);
        RAISE NOTICE 'Created index idx_events_event_date';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_event_attendees_event_id') THEN
        CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);
        RAISE NOTICE 'Created index idx_event_attendees_event_id';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_indexes WHERE indexname = 'idx_event_attendees_user_status') THEN
        CREATE INDEX idx_event_attendees_user_status ON event_attendees(user_id, status);
        RAISE NOTICE 'Created index idx_event_attendees_user_status';
    END IF;
END $$;

-- Enable RLS if not already enabled
DO $$ 
BEGIN
    -- Enable RLS on events
    IF NOT EXISTS (
        SELECT FROM pg_class c 
        JOIN pg_namespace n ON c.relnamespace = n.oid 
        WHERE n.nspname = 'public' AND c.relname = 'events' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE events ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on events';
    END IF;
    
    -- Enable RLS on event_attendees
    IF NOT EXISTS (
        SELECT FROM pg_class c 
        JOIN pg_namespace n ON c.relnamespace = n.oid 
        WHERE n.nspname = 'public' AND c.relname = 'event_attendees' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on event_attendees';
    END IF;
END $$;

-- Create RLS policies if they don't exist
DO $$ 
BEGIN
    -- Events policies
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'events' AND policyname = 'Owner can manage own events') THEN
        CREATE POLICY "Owner can manage own events" 
        ON events FOR ALL 
        USING (auth.uid() = created_by);
        RAISE NOTICE 'Created owner policy for events';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'events' AND policyname = 'Anyone can view public events') THEN
        CREATE POLICY "Anyone can view public events" 
        ON events FOR SELECT 
        USING (visibility = 'public');
        RAISE NOTICE 'Created public view policy for events';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'events' AND policyname = 'Invited users can view private events') THEN
        CREATE POLICY "Invited users can view private events" 
        ON events FOR SELECT 
        USING (
            visibility = 'invite-only' AND 
            EXISTS (
                SELECT 1 FROM event_attendees 
                WHERE event_id = events.id AND user_id = auth.uid()
            )
        );
        RAISE NOTICE 'Created invite-only view policy for events';
    END IF;
    
    -- Event attendees policies
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'event_attendees' AND policyname = 'Event creators can manage attendees') THEN
        CREATE POLICY "Event creators can manage attendees" 
        ON event_attendees FOR ALL 
        USING (
            EXISTS (
                SELECT 1 FROM events 
                WHERE events.id = event_attendees.event_id 
                AND events.created_by = auth.uid()
            )
        );
        RAISE NOTICE 'Created creator manage policy for event_attendees';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'event_attendees' AND policyname = 'Users can view their own attendance') THEN
        CREATE POLICY "Users can view their own attendance" 
        ON event_attendees FOR SELECT 
        USING (auth.uid() = user_id);
        RAISE NOTICE 'Created self view policy for event_attendees';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_policies WHERE tablename = 'event_attendees' AND policyname = 'Users can update their own attendance') THEN
        CREATE POLICY "Users can update their own attendance" 
        ON event_attendees FOR UPDATE 
        USING (auth.uid() = user_id);
        RAISE NOTICE 'Created self update policy for event_attendees';
    END IF;
END $$;

-- Add updated_at triggers if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.triggers 
        WHERE event_object_table = 'events' 
        AND trigger_name = 'set_updated_at_events'
    ) THEN
        CREATE TRIGGER set_updated_at_events
          BEFORE UPDATE ON events
          FOR EACH ROW
          EXECUTE FUNCTION trigger_set_updated_at();
        RAISE NOTICE 'Created updated_at trigger for events';
    END IF;
END $$;