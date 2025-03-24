-- This is a combined script that creates the translations table, 
-- migrates content, and adds default translations in a single transaction

BEGIN;

-- Create translations table for storing dynamic translations
CREATE TABLE IF NOT EXISTS public.translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('en', 'sv')),
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(key, language)
);

-- Add RLS policies
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Create policies only if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'translations' 
    AND policyname = 'Enable read access for authenticated users'
  ) THEN
    -- Grant read access to all authenticated users
    CREATE POLICY "Enable read access for authenticated users" 
      ON public.translations
      FOR SELECT 
      TO authenticated
      USING (true);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'translations' 
    AND policyname = 'Enable all access for admin users'
  ) THEN
    -- Grant all access to admin users
    CREATE POLICY "Enable all access for admin users" 
      ON public.translations
      FOR ALL 
      TO authenticated
      USING (auth.jwt() ->> 'role' = 'admin');
  END IF;
END $$;

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists to avoid errors on re-run
DROP TRIGGER IF EXISTS set_translations_updated_at ON public.translations;

-- Create trigger for updated_at
CREATE TRIGGER set_translations_updated_at
BEFORE UPDATE ON public.translations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to extract English or Swedish text from a JSONB field
CREATE OR REPLACE FUNCTION extract_translation(json_data JSONB, lang TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  -- Try to get the language-specific value
  result := json_data ->> lang;
  
  -- If not found and language is Swedish, try English as fallback
  IF result IS NULL AND lang = 'sv' THEN
    result := json_data ->> 'en';
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Insert auth content into translations table if content table exists
DO $$
DECLARE
  content_record RECORD;
BEGIN
  -- Skip if the content table doesn't exist
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'content') THEN
    -- Process each content item with content_type = 'auth'
    FOR content_record IN
      SELECT * FROM content WHERE content_type = 'auth' AND active = true
    LOOP
      -- Insert English translation
      INSERT INTO translations (key, language, value)
      VALUES (
        content_record.key, 
        'en', 
        extract_translation(content_record.title, 'en')
      )
      ON CONFLICT (key, language)
      DO UPDATE SET 
        value = extract_translation(content_record.title, 'en'),
        updated_at = NOW();
        
      -- Insert Swedish translation
      INSERT INTO translations (key, language, value)
      VALUES (
        content_record.key, 
        'sv', 
        extract_translation(content_record.title, 'sv')
      )
      ON CONFLICT (key, language)
      DO UPDATE SET 
        value = extract_translation(content_record.title, 'sv'),
        updated_at = NOW();
        
      -- If body content exists and isn't empty, create additional translation entries
      -- with a '_body' suffix for the key
      IF content_record.body IS NOT NULL AND 
         (content_record.body ->> 'en' != '' OR content_record.body ->> 'sv' != '') THEN
        
        -- Insert English body translation
        INSERT INTO translations (key, language, value)
        VALUES (
          content_record.key || '_body', 
          'en', 
          extract_translation(content_record.body, 'en')
        )
        ON CONFLICT (key, language)
        DO UPDATE SET 
          value = extract_translation(content_record.body, 'en'),
          updated_at = NOW();
          
        -- Insert Swedish body translation
        INSERT INTO translations (key, language, value)
        VALUES (
          content_record.key || '_body', 
          'sv', 
          extract_translation(content_record.body, 'sv')
        )
        ON CONFLICT (key, language)
        DO UPDATE SET 
          value = extract_translation(content_record.body, 'sv'),
          updated_at = NOW();
      END IF;
    END LOOP;
  END IF;
END $$;

-- Insert default auth-related translations
INSERT INTO translations (key, language, value)
VALUES
  -- Welcome screen content
  ('auth.signIn.title', 'en', 'Time to find a new exercise route'),
  ('auth.signIn.title', 'sv', 'Dags att hitta en ny övningsrutt'),
  ('auth.signIn.slogan', 'en', 'Discover perfect practice driving routes near you. Filter by difficulty, length and more'),
  ('auth.signIn.slogan', 'sv', 'Upptäck perfekta övningskörningsrutter nära dig. Filtrera efter svårighet, längd och mer'),
  ('auth.signIn.signInButton', 'en', 'Sign In'),
  ('auth.signIn.signInButton', 'sv', 'Logga in'),
  ('auth.signUp.signUpButton', 'en', 'Create Account'),
  ('auth.signUp.signUpButton', 'sv', 'Skapa konto'),
  ('auth.signIn.readMore', 'en', 'Read more about Vromm'),
  ('auth.signIn.readMore', 'sv', 'Läs mer om Vromm'),
  ('auth.signIn.helpImprove', 'en', 'Help Us Improve Driver Training'),
  ('auth.signIn.helpImprove', 'sv', 'Hjälp oss förbättra körkortsutbildningen'),
  ('auth.signIn.forLearners', 'en', 'For Learners'),
  ('auth.signIn.forLearners', 'sv', 'För elever'),
  ('auth.signIn.forSchools', 'en', 'For Schools'),
  ('auth.signIn.forSchools', 'sv', 'För trafikskolor'),

  -- Sign up screen
  ('auth.signUp.title', 'en', 'Create Account'),
  ('auth.signUp.title', 'sv', 'Skapa konto'),
  ('auth.signUp.subtitle', 'en', 'Sign up to start creating and sharing routes'),
  ('auth.signUp.subtitle', 'sv', 'Registrera dig för att börja skapa och dela rutter'),
  ('auth.signUp.emailLabel', 'en', 'Email'),
  ('auth.signUp.emailLabel', 'sv', 'E-post'),
  ('auth.signUp.emailPlaceholder', 'en', 'Your email address'),
  ('auth.signUp.emailPlaceholder', 'sv', 'Din e-postadress'),
  ('auth.signUp.passwordLabel', 'en', 'Password'),
  ('auth.signUp.passwordLabel', 'sv', 'Lösenord'),
  ('auth.signUp.passwordPlaceholder', 'en', 'Choose a password'),
  ('auth.signUp.passwordPlaceholder', 'sv', 'Välj ett lösenord'),
  ('auth.signUp.confirmPasswordLabel', 'en', 'Confirm Password'),
  ('auth.signUp.confirmPasswordLabel', 'sv', 'Bekräfta lösenord'),
  ('auth.signUp.confirmPasswordPlaceholder', 'en', 'Confirm your password'),
  ('auth.signUp.confirmPasswordPlaceholder', 'sv', 'Bekräfta ditt lösenord'),
  ('auth.signUp.hasAccount', 'en', 'Already have an account?'),
  ('auth.signUp.hasAccount', 'sv', 'Har du redan ett konto?'),
  ('auth.signUp.signInLink', 'en', 'Sign In'),
  ('auth.signUp.signInLink', 'sv', 'Logga in'),

  -- Login screen
  ('auth.signIn.emailLabel', 'en', 'Email'),
  ('auth.signIn.emailLabel', 'sv', 'E-post'),
  ('auth.signIn.emailPlaceholder', 'en', 'Your email address'),
  ('auth.signIn.emailPlaceholder', 'sv', 'Din e-postadress'),
  ('auth.signIn.passwordLabel', 'en', 'Password'),
  ('auth.signIn.passwordLabel', 'sv', 'Lösenord'),
  ('auth.signIn.passwordPlaceholder', 'en', 'Your password'),
  ('auth.signIn.passwordPlaceholder', 'sv', 'Ditt lösenord'),
  ('auth.signIn.forgotPassword', 'en', 'Forgot Password?'),
  ('auth.signIn.forgotPassword', 'sv', 'Glömt lösenord?'),
  ('auth.signIn.noAccount', 'en', 'Don''t have an account?'),
  ('auth.signIn.noAccount', 'sv', 'Har du inget konto?'),
  ('auth.signIn.signUpLink', 'en', 'Create Account'),
  ('auth.signIn.signUpLink', 'sv', 'Skapa konto'),
  
  -- Reset Password screen
  ('auth.resetPassword.title', 'en', 'Reset Password'),
  ('auth.resetPassword.title', 'sv', 'Återställ lösenord'),
  ('auth.resetPassword.subtitle', 'en', 'Enter your email address and we will send you instructions to reset your password'),
  ('auth.resetPassword.subtitle', 'sv', 'Ange din e-postadress så skickar vi instruktioner för att återställa ditt lösenord'),
  ('auth.resetPassword.emailLabel', 'en', 'Email'),
  ('auth.resetPassword.emailLabel', 'sv', 'E-post'),
  ('auth.resetPassword.emailPlaceholder', 'en', 'Your email address'),
  ('auth.resetPassword.emailPlaceholder', 'sv', 'Din e-postadress'),
  ('auth.resetPassword.resetButton', 'en', 'Reset Password'),
  ('auth.resetPassword.resetButton', 'sv', 'Återställ lösenord'),
  ('auth.resetPassword.backToLogin', 'en', 'Back to Login'),
  ('auth.resetPassword.backToLogin', 'sv', 'Tillbaka till inloggning')
  
ON CONFLICT (key, language)
DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

COMMIT; 