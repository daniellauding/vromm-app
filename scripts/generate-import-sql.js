const fs = require('fs');
const path = require('path');

console.log('📝 Generating translations import SQL...');

// The SQL we need to run
const sqlContent = `
-- Check if translations table has unique constraint
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM pg_constraint 
        WHERE conname = 'translations_key_language_unique'
        AND conrelid = 'public.translations'::regclass
    ) INTO constraint_exists;

    -- If the constraint doesn't exist, add it
    IF NOT constraint_exists THEN
        RAISE NOTICE 'Adding unique constraint on translations table...';
        ALTER TABLE public.translations 
        ADD CONSTRAINT translations_key_language_unique 
        UNIQUE (key, language);
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- Insert default translations if they don't exist
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
`;

try {
  // Create the output file
  const outputFile = path.join(__dirname, 'translations_import.sql');
  fs.writeFileSync(outputFile, sqlContent);

  console.log(`✅ SQL file created at: ${outputFile}`);
  console.log('\nHow to use:');
  console.log('1. Open your Supabase dashboard');
  console.log('2. Go to SQL Editor');
  console.log(`3. Open and run the SQL file: ${outputFile}`);
  console.log('\nAlternatively, copy this SQL and run it in the SQL Editor:');
  console.log('-----------------------------------------------------------------');
  console.log(sqlContent);
  console.log('-----------------------------------------------------------------');
} catch (error) {
  console.error('❌ Error generating SQL file:', error.message);
}
