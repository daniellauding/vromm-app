-- Create translations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  language TEXT NOT NULL,
  value TEXT NOT NULL,
  platform TEXT DEFAULT 'mobile',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(key, language)
);

-- Add RLS policies for translations
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" 
  ON public.translations
  FOR SELECT 
  TO authenticated, anon
  USING (true);

-- Insert translations
INSERT INTO public.translations (key, language, value, platform)
VALUES
  -- Auth screens
  ('auth.signIn.title', 'en', 'Time to find a new exercise route', 'mobile'),
  ('auth.signIn.title', 'sv', 'Dags att hitta en ny övningsrutt', 'mobile'),
  ('auth.signIn.slogan', 'en', 'Discover perfect practice driving routes near you. Filter by difficulty, length and more', 'mobile'),
  ('auth.signIn.slogan', 'sv', 'Upptäck perfekta övningskörningsrutter nära dig. Filtrera efter svårighetsgrad, längd och mer', 'mobile'),
  ('auth.signIn.emailLabel', 'en', 'Email', 'mobile'),
  ('auth.signIn.emailLabel', 'sv', 'E-post', 'mobile'),
  ('auth.signIn.emailPlaceholder', 'en', 'Your email address', 'mobile'),
  ('auth.signIn.emailPlaceholder', 'sv', 'Din e-postadress', 'mobile'),
  ('auth.signIn.passwordLabel', 'en', 'Password', 'mobile'),
  ('auth.signIn.passwordLabel', 'sv', 'Lösenord', 'mobile'),
  ('auth.signIn.passwordPlaceholder', 'en', 'Your password', 'mobile'),
  ('auth.signIn.passwordPlaceholder', 'sv', 'Ditt lösenord', 'mobile'),
  ('auth.signIn.signInButton', 'en', 'Sign In', 'mobile'),
  ('auth.signIn.signInButton', 'sv', 'Logga in', 'mobile'),
  ('auth.signIn.forgotPassword', 'en', 'Forgot Password?', 'mobile'),
  ('auth.signIn.forgotPassword', 'sv', 'Glömt lösenord?', 'mobile'),
  ('auth.signIn.noAccount', 'en', 'Don''t have an account?', 'mobile'),
  ('auth.signIn.noAccount', 'sv', 'Har du inget konto?', 'mobile'),
  ('auth.signIn.signUpLink', 'en', 'Create Account', 'mobile'),
  ('auth.signIn.signUpLink', 'sv', 'Skapa konto', 'mobile'),
  ('auth.signIn.readMore', 'en', 'Read more about Vromm', 'mobile'),
  ('auth.signIn.readMore', 'sv', 'Läs mer om Vromm', 'mobile'),
  ('auth.signIn.helpImprove', 'en', 'Help Us Improve Driver Training', 'mobile'),
  ('auth.signIn.helpImprove', 'sv', 'Hjälp oss förbättra körkortsutbildningen', 'mobile'),
  ('auth.signIn.forLearners', 'en', 'For Learners', 'mobile'),
  ('auth.signIn.forLearners', 'sv', 'För elever', 'mobile'),
  ('auth.signIn.forSchools', 'en', 'For Schools', 'mobile'),
  ('auth.signIn.forSchools', 'sv', 'För trafikskolor', 'mobile'),

  -- Sign up screen
  ('auth.signUp.title', 'en', 'Create Account', 'mobile'),
  ('auth.signUp.title', 'sv', 'Skapa konto', 'mobile'),
  ('auth.signUp.subtitle', 'en', 'Sign up to start creating and sharing routes', 'mobile'),
  ('auth.signUp.subtitle', 'sv', 'Registrera dig för att börja skapa och dela rutter', 'mobile'),
  ('auth.signUp.emailLabel', 'en', 'Email', 'mobile'),
  ('auth.signUp.emailLabel', 'sv', 'E-post', 'mobile'),
  ('auth.signUp.emailPlaceholder', 'en', 'Your email address', 'mobile'),
  ('auth.signUp.emailPlaceholder', 'sv', 'Din e-postadress', 'mobile'),
  ('auth.signUp.passwordLabel', 'en', 'Password', 'mobile'),
  ('auth.signUp.passwordLabel', 'sv', 'Lösenord', 'mobile'),
  ('auth.signUp.passwordPlaceholder', 'en', 'Choose a password', 'mobile'),
  ('auth.signUp.passwordPlaceholder', 'sv', 'Välj ett lösenord', 'mobile'),
  ('auth.signUp.confirmPasswordLabel', 'en', 'Confirm Password', 'mobile'),
  ('auth.signUp.confirmPasswordLabel', 'sv', 'Bekräfta lösenord', 'mobile'),
  ('auth.signUp.confirmPasswordPlaceholder', 'en', 'Confirm your password', 'mobile'),
  ('auth.signUp.confirmPasswordPlaceholder', 'sv', 'Bekräfta ditt lösenord', 'mobile'),
  ('auth.signUp.signUpButton', 'en', 'Create Account', 'mobile'),
  ('auth.signUp.signUpButton', 'sv', 'Skapa konto', 'mobile'),
  ('auth.signUp.hasAccount', 'en', 'Already have an account?', 'mobile'),
  ('auth.signUp.hasAccount', 'sv', 'Har du redan ett konto?', 'mobile'),
  ('auth.signUp.signInLink', 'en', 'Sign In', 'mobile'),
  ('auth.signUp.signInLink', 'sv', 'Logga in', 'mobile'),

  -- Reset Password screen
  ('auth.resetPassword.title', 'en', 'Reset Password', 'mobile'),
  ('auth.resetPassword.title', 'sv', 'Återställ lösenord', 'mobile'),
  ('auth.resetPassword.subtitle', 'en', 'Enter your email address and we will send you instructions to reset your password', 'mobile'),
  ('auth.resetPassword.subtitle', 'sv', 'Ange din e-postadress så skickar vi instruktioner för att återställa ditt lösenord', 'mobile'),
  ('auth.resetPassword.emailLabel', 'en', 'Email', 'mobile'),
  ('auth.resetPassword.emailLabel', 'sv', 'E-post', 'mobile'),
  ('auth.resetPassword.emailPlaceholder', 'en', 'Your email address', 'mobile'),
  ('auth.resetPassword.emailPlaceholder', 'sv', 'Din e-postadress', 'mobile'),
  ('auth.resetPassword.resetButton', 'en', 'Reset Password', 'mobile'),
  ('auth.resetPassword.resetButton', 'sv', 'Återställ lösenord', 'mobile'),
  ('auth.resetPassword.backToLogin', 'en', 'Back to Login', 'mobile'),
  ('auth.resetPassword.backToLogin', 'sv', 'Tillbaka till inloggning', 'mobile')
ON CONFLICT (key, language) DO NOTHING;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS set_translations_updated_at ON public.translations;

-- Create trigger
CREATE TRIGGER set_translations_updated_at
BEFORE UPDATE ON public.translations
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at(); 