#!/usr/bin/env node

/**
 * Clear caches and free up memory
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🧹 Clearing caches and freeing memory...');

// Clear various caches
const cachesToClear = [
  'node_modules/.cache',
  '.expo',
  'dist',
  'dist-web',
  'ios/build',
  'android/build'
];

cachesToClear.forEach(cache => {
  const cachePath = path.join(process.cwd(), cache);
  if (fs.existsSync(cachePath)) {
    console.log(`Clearing ${cache}...`);
    try {
      fs.rmSync(cachePath, { recursive: true, force: true });
      console.log(`✅ Cleared ${cache}`);
    } catch (error) {
      console.log(`⚠️  Could not clear ${cache}: ${error.message}`);
    }
  }
});

// Clear npm cache
console.log('Clearing npm cache...');
try {
  execSync('npm cache clean --force', { stdio: 'inherit' });
  console.log('✅ Cleared npm cache');
} catch (error) {
  console.log('⚠️  Could not clear npm cache');
}

// Clear yarn cache
console.log('Clearing yarn cache...');
try {
  execSync('yarn cache clean', { stdio: 'inherit' });
  console.log('✅ Cleared yarn cache');
} catch (error) {
  console.log('⚠️  Could not clear yarn cache');
}

// Force garbage collection if available
if (global.gc) {
  console.log('Running garbage collection...');
  global.gc();
  console.log('✅ Garbage collection completed');
}

console.log('🎉 Cache clearing completed!');
