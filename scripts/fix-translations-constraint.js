const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔧 Fixing translations table constraint...');

// Direct SQL to fix the constraint issue
const fixConstraintSQL = `
BEGIN;

-- Check if the constraint already exists
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
        RAISE NOTICE 'Adding missing unique constraint on translations table...';
        ALTER TABLE public.translations 
        ADD CONSTRAINT translations_key_language_unique 
        UNIQUE (key, language);
    ELSE
        RAISE NOTICE 'Unique constraint already exists, no action needed.';
    END IF;
END $$;

COMMIT;
`;

try {
  // Create a temporary SQL file
  const tempFile = path.join(__dirname, 'temp_fix_constraint.sql');
  fs.writeFileSync(tempFile, fixConstraintSQL);

  console.log('🔍 Getting Supabase connection string...');
  const connectionString = execSync('npx supabase db remote get', { encoding: 'utf8' }).trim();

  if (!connectionString) {
    console.error('❌ Failed to get Supabase connection string');
    fs.unlinkSync(tempFile);
    process.exit(1);
  }

  // Apply the SQL directly
  console.log('👉 Running constraint fix...');
  try {
    execSync(`psql "${connectionString}" -f "${tempFile}"`, { stdio: 'inherit' });
    console.log('✅ Constraint fix applied successfully');
  } catch (err) {
    console.error('❌ Error applying constraint fix:', err.message);
  }

  // Clean up
  fs.unlinkSync(tempFile);
} catch (error) {
  console.error('❌ Error fixing constraint:', error.message);
  process.exit(1);
}
