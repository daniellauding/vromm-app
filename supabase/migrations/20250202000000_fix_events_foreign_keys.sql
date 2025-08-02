-- Fix events table foreign key references and RLS policies
-- This migration fixes the events table to reference profiles instead of auth.users
-- and resolves infinite recursion in RLS policies

DO $$ 
BEGIN
    -- Drop existing policies that might cause recursion
    IF EXISTS (SELECT FROM pg_policies WHERE tablename = 'events' AND policyname = 'Invited users can view private events') THEN
        DROP POLICY "Invited users can view private events" ON events;
        RAISE NOTICE 'Dropped old invite-only view policy for events';
    END IF;
    
    IF EXISTS (SELECT FROM pg_policies WHERE tablename = 'event_attendees' AND policyname = 'Event creators can manage attendees') THEN
        DROP POLICY "Event creators can manage attendees" ON event_attendees;
        RAISE NOTICE 'Dropped old creator manage policy for event_attendees';
    END IF;
    
    -- Drop and recreate foreign key constraints
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'events_created_by_fkey' 
        AND table_name = 'events'
    ) THEN
        ALTER TABLE events DROP CONSTRAINT events_created_by_fkey;
        RAISE NOTICE 'Dropped old events_created_by_fkey constraint';
    END IF;
    
    -- Add new foreign key constraint to profiles
    ALTER TABLE events 
    ADD CONSTRAINT events_created_by_fkey 
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added new events_created_by_fkey constraint to profiles';
    
    -- Fix event_attendees foreign key if needed
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'event_attendees_user_id_fkey' 
        AND table_name = 'event_attendees'
        AND table_schema = 'public'
    ) THEN
        -- Check if it references auth.users
        IF EXISTS (
            SELECT 1 FROM information_schema.referential_constraints rc
            JOIN information_schema.key_column_usage kcu ON rc.constraint_name = kcu.constraint_name
            WHERE rc.constraint_name = 'event_attendees_user_id_fkey'
            AND kcu.referenced_table_name = 'users'
        ) THEN
            ALTER TABLE event_attendees DROP CONSTRAINT event_attendees_user_id_fkey;
            ALTER TABLE event_attendees 
            ADD CONSTRAINT event_attendees_user_id_fkey 
            FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
            RAISE NOTICE 'Fixed event_attendees_user_id_fkey constraint to reference profiles';
        END IF;
    END IF;
    
    -- Recreate improved RLS policies
    CREATE POLICY "Invited users can view private events" 
    ON events FOR SELECT 
    USING (
        visibility = 'invite-only' AND 
        EXISTS (
            SELECT 1 FROM event_attendees 
            WHERE event_id = events.id AND user_id = auth.uid()
        )
    );
    RAISE NOTICE 'Created improved invite-only view policy for events';
    
    CREATE POLICY "Event creators can manage attendees" 
    ON event_attendees FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM events 
            WHERE events.id = event_attendees.event_id 
            AND events.created_by = auth.uid()
        )
    );
    RAISE NOTICE 'Created improved creator manage policy for event_attendees';
    
END $$;