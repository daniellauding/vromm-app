const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📚 Manually applying translations SQL...');

try {
  // Path to the SQL file
  const sqlPath = path.resolve(
    __dirname,
    '../supabase/migrations/20240605000000_setup_translations.sql'
  );

  if (!fs.existsSync(sqlPath)) {
    console.error(`❌ SQL file not found: ${sqlPath}`);
    process.exit(1);
  }

  // Get Supabase connection string
  console.log('🔍 Getting Supabase connection string...');
  const connectionString = execSync('npx supabase db remote get', { encoding: 'utf8' }).trim();

  if (!connectionString) {
    console.error('❌ Failed to get Supabase connection string');
    process.exit(1);
  }

  // Apply SQL directly
  console.log('👉 Running SQL migration manually...');
  execSync(`psql "${connectionString}" -f "${sqlPath}"`, { stdio: 'inherit' });

  console.log('✅ SQL migration applied successfully');
} catch (error) {
  console.error('❌ Error applying SQL migration:', error.message);
  process.exit(1);
}
