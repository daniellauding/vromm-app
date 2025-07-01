-- Setup the translations table with proper security policies
BEGIN;

-- Check if translations table already exists
DO $$
DECLARE
    table_exists BOOLEAN;
    constraint_exists BOOLEAN;
BEGIN
    -- Check if translations table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'translations'
    ) INTO table_exists;

    -- If translations table doesn't exist, create it
    IF NOT table_exists THEN
        -- Create the translations table
        CREATE TABLE public.translations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            key TEXT NOT NULL,
            language TEXT NOT NULL,
            value TEXT NOT NULL,
            platform TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            CONSTRAINT translations_key_language_unique UNIQUE (key, language)
        );

        -- Add table comment
        COMMENT ON TABLE public.translations IS 'Stores application translations for dynamic content';

        -- Create an index to improve lookup performance
        CREATE INDEX IF NOT EXISTS translations_key_language_idx ON public.translations (key, language);

        -- Set up Row Level Security
        ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
    ELSE
        -- Check if the unique constraint exists
        SELECT EXISTS (
            SELECT FROM pg_constraint 
            WHERE conname = 'translations_key_language_unique'
            AND conrelid = 'public.translations'::regclass
        ) INTO constraint_exists;

        -- If the constraint doesn't exist, add it
        IF NOT constraint_exists THEN
            ALTER TABLE public.translations 
            ADD CONSTRAINT translations_key_language_unique 
            UNIQUE (key, language);
        END IF;

        -- Add platform column if it doesn't exist
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'translations'
            AND column_name = 'platform'
        ) THEN
            ALTER TABLE public.translations ADD COLUMN platform TEXT;
        END IF;
    END IF;
END $$;

-- Create policies for table access (these are idempotent)
DO $$
DECLARE
    profiles_exists BOOLEAN;
BEGIN
    -- Check if profiles table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
    ) INTO profiles_exists;

    -- Read policy for authenticated users
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'translations' AND policyname = 'translations_read_policy'
    ) THEN
        CREATE POLICY translations_read_policy ON public.translations
            FOR SELECT
            TO authenticated
            USING (true);
    END IF;

    -- Full access policy for admin users (only if profiles table exists)
    IF profiles_exists AND NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'translations' AND policyname = 'translations_admin_policy'
    ) THEN
        CREATE POLICY translations_admin_policy ON public.translations
            FOR ALL
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
                )
            );
    ELSIF NOT profiles_exists AND NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'translations' AND policyname = 'translations_admin_policy'
    ) THEN
        -- Fallback admin policy without profiles check
        CREATE POLICY translations_admin_policy ON public.translations
            FOR ALL
            TO authenticated
            USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create the trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'translations_updated_at'
    ) THEN
        CREATE TRIGGER translations_updated_at
            BEFORE UPDATE ON public.translations
            FOR EACH ROW
            EXECUTE FUNCTION handle_updated_at();
    END IF;
END $$;

-- Insert some default translations if they don't exist 
-- English translations
INSERT INTO public.translations (key, language, value, platform)
VALUES
    ('auth.welcome', 'en', 'Welcome', 'mobile'),
    ('auth.signup', 'en', 'Sign Up', 'mobile'),
    ('auth.login', 'en', 'Log In', 'mobile'),
    ('auth.email', 'en', 'Email', 'mobile'),
    ('auth.password', 'en', 'Password', 'mobile'),
    ('auth.forgot_password', 'en', 'Forgot Password?', 'mobile'),
    ('auth.reset_password', 'en', 'Reset Password', 'mobile'),
    ('auth.confirm_password', 'en', 'Confirm Password', 'mobile'),
    ('auth.submit', 'en', 'Submit', 'mobile'),
    ('auth.logout', 'en', 'Log Out', 'mobile'),
    ('nav.routes.discovery', 'en', 'Time to find a new exercise route, discover perfect driving routes near you, filter by difficulty, length and more!', 'mobile')
ON CONFLICT (key, language) DO NOTHING;

-- Swedish translations
INSERT INTO public.translations (key, language, value, platform)
VALUES
    ('auth.welcome', 'sv', 'Välkommen', 'mobile'),
    ('auth.signup', 'sv', 'Registrera dig', 'mobile'),
    ('auth.login', 'sv', 'Logga in', 'mobile'),
    ('auth.email', 'sv', 'E-post', 'mobile'),
    ('auth.password', 'sv', 'Lösenord', 'mobile'),
    ('auth.forgot_password', 'sv', 'Glömt lösenord?', 'mobile'),
    ('auth.reset_password', 'sv', 'Återställ lösenord', 'mobile'),
    ('auth.confirm_password', 'sv', 'Bekräfta lösenord', 'mobile'),
    ('auth.submit', 'sv', 'Skicka', 'mobile'),
    ('auth.logout', 'sv', 'Logga ut', 'mobile'),
    ('nav.routes.discovery', 'sv', 'Dags att hitta en ny träningsrutt, upptäck perfekta körvägar nära dig, filtrera efter svårighetsgrad, längd och mer!', 'mobile')
ON CONFLICT (key, language) DO NOTHING;

COMMIT; 