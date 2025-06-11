const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning up translation migration files...');

const migrationsDir = path.resolve(__dirname, '../supabase/migrations');

// Files to check
const filesToCheck = [
  '20240601000000_create_translations_table.sql',
  '20240601000001_convert_content_to_translations.sql',
  '20240601000002_default_auth_translations.sql',
];

try {
  // Check if the migrations directory exists
  if (!fs.existsSync(migrationsDir)) {
    console.log('⚠️ No migrations directory found at:', migrationsDir);
    process.exit(0);
  }

  // Make sure our main migration file exists
  const mainFile = path.join(migrationsDir, '20240605000000_setup_translations.sql');
  if (!fs.existsSync(mainFile)) {
    console.error('❌ Main migration file not found:', mainFile);
    process.exit(1);
  }

  console.log('✅ Found main migration file');

  // Check and remove old files
  let filesRemoved = 0;
  for (const file of filesToCheck) {
    const filePath = path.join(migrationsDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`🗑️ Removing old migration file: ${file}`);
      fs.unlinkSync(filePath);
      filesRemoved++;
    }
  }

  console.log(`✅ Cleanup complete, removed ${filesRemoved} files`);
} catch (error) {
  console.error('❌ Error during cleanup:', error.message);
  process.exit(1);
}
