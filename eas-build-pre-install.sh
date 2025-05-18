#!/bin/bash

# Make the script exit if any command fails
set -e

# EAS Build Pre-install script
echo "Running pre-install script for React Native Firebase..."

# Create a directory that will signal to the post-install script that this is the first run
mkdir -p .eas-pre-install-ran

# Ensure the Google services files are in the correct locations
echo "Checking Google services files..."

if [ -f "GoogleService-Info.plist" ]; then
  echo "GoogleService-Info.plist found in project root."
else
  echo "Warning: GoogleService-Info.plist not found!"
fi

if [ -f "google-services.json" ]; then
  echo "google-services.json found in project root."
else
  echo "Warning: google-services.json not found!"
fi

# Specific handling for iOS builds to avoid Hermes/React-RCTRuntime conflicts
echo "Modifying build configuration to avoid React-RCTRuntime conflicts..."

# 1. Always use JSC in app.json
if [ -f "app.json" ]; then
  # Add jsEngine: jsc to app.json if not already there
  if ! grep -q '"jsEngine": "jsc"' app.json; then
    sed -i.bak 's/"newArchEnabled": false,/"newArchEnabled": false,\n    "jsEngine": "jsc",/g' app.json
    echo "Modified app.json to use JSC engine"
  fi
fi

# 2. Update Podfile to disable Hermes and fix module conflicts
if [ -f "ios/Podfile" ]; then
  # Back up Podfile first
  cp ios/Podfile ios/Podfile.backup
  
  # Add ENV settings to disable Hermes
  sed -i.bak '1i\
# Force disable Hermes\
ENV["USE_HERMES"] = "0"\
ENV["RCT_NEW_ARCH_ENABLED"] = "0"\
' ios/Podfile
  
  echo "Updated Podfile to force disable Hermes and New Architecture"
fi 