// Script to fix Firebase analytics for Android builds
const fs = require('fs');
const path = require('path');

console.log('Patching Firebase Analytics for Android compatibility...');

// Path to expo-firebase-analytics build.gradle
const firebaseAnalyticsGradlePath = path.join(
  __dirname, 
  'node_modules',
  'expo-firebase-analytics',
  'android',
  'build.gradle'
);

// Check if the file exists
if (fs.existsSync(firebaseAnalyticsGradlePath)) {
  console.log(`Found Firebase Analytics Gradle file at: ${firebaseAnalyticsGradlePath}`);
  
  // Read the file
  let content = fs.readFileSync(firebaseAnalyticsGradlePath, 'utf8');
  
  // Fix classifier property
  content = content.replace(
    /classifier = "sources"/g, 
    'archiveClassifier = "sources"'
  );
  
  // Add compileSdkVersion if it's missing
  if (!content.includes('compileSdkVersion')) {
    content = content.replace(
      /apply plugin: "kotlin-android"/,
      'apply plugin: "kotlin-android"\ncompileSdkVersion 35'
    );
  }
  
  // Write the changes back to the file
  fs.writeFileSync(firebaseAnalyticsGradlePath, content, 'utf8');
  console.log('Successfully patched Firebase Analytics for Android');
} else {
  console.log('Could not find Firebase Analytics build.gradle file');
}

// Update top-level build.gradle to add Google Services plugin
const androidBuildGradlePath = path.join(__dirname, 'android', 'build.gradle');

if (fs.existsSync(androidBuildGradlePath)) {
  console.log(`Found Android build.gradle at: ${androidBuildGradlePath}`);
  
  let content = fs.readFileSync(androidBuildGradlePath, 'utf8');
  
  // Add Google Services plugin if it's not already there
  if (!content.includes('google-services')) {
    content = content.replace(
      /dependencies \{([^}]*)\}/,
      'dependencies {\n    classpath("com.google.gms:google-services:4.4.0")$1}'
    );
  }
  
  fs.writeFileSync(androidBuildGradlePath, content, 'utf8');
  console.log('Successfully updated Android build.gradle');
} else {
  console.log('Could not find Android build.gradle');
}

// Update app build.gradle to apply Google Services plugin
const appBuildGradlePath = path.join(__dirname, 'android', 'app', 'build.gradle');

if (fs.existsSync(appBuildGradlePath)) {
  console.log(`Found App build.gradle at: ${appBuildGradlePath}`);
  
  let content = fs.readFileSync(appBuildGradlePath, 'utf8');
  
  // Add Google Services plugin if it's not already there
  if (!content.includes('apply plugin: "com.google.gms.google-services"')) {
    content = content.replace(
      /apply plugin: "com\.facebook\.react"/,
      'apply plugin: "com.facebook.react"\napply plugin: "com.google.gms.google-services"'
    );
  }
  
  // Add Firebase dependencies if not already there
  if (!content.includes('firebase-analytics')) {
    content = content.replace(
      /dependencies \{([^}]*)\}/,
      'dependencies {\n    implementation("com.google.firebase:firebase-analytics:21.5.1")\n    implementation("com.google.firebase:firebase-core:21.1.1")$1}'
    );
  }
  
  fs.writeFileSync(appBuildGradlePath, content, 'utf8');
  console.log('Successfully updated App build.gradle');
} else {
  console.log('Could not find App build.gradle');
}

console.log('Firebase patching complete!'); 