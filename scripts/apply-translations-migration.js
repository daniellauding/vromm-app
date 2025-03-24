const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('📚 Applying translations migration...');

try {
  // Ensure scripts directory exists
  const scriptsDir = path.resolve(__dirname);
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }

  // Apply the migration using Supabase CLI
  console.log('👉 Running Supabase migration...');
  execSync('npx supabase migration up', { stdio: 'inherit' });

  console.log('✅ Translations migration applied successfully');
} catch (error) {
  console.error('❌ Error applying translations migration:', error.message);
  process.exit(1);
}
