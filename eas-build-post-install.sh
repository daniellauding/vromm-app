#!/bin/bash

# Make the script exit if any command fails
set -e

# Check if this is the first run (after pre-install script)
if [ -d ".eas-pre-install-ran" ]; then
  echo "Running post-install script for React Native Firebase..."
  
  # Ensure Firebase is properly set up in native projects
  
  # For iOS: Add post-integration script to fix modulemap conflicts
  if [ -f "ios/Podfile" ]; then
    echo "Checking Podfile for Firebase configurations..."
    
    # Add post_integrate hook to fix modulemap conflicts
    if ! grep -q "post_integrate" "ios/Podfile"; then
      cat << 'EOF' >> ios/Podfile
  
  # Fix potential module map conflicts
  post_integrate do |installer|
    # Find React-RCTRuntime module map and rename it to avoid conflicts
    Dir.glob("#{installer.sandbox.root}/Target Support Files/**/*.modulemap").each do |modulemap_path|
      if modulemap_path.include?("React-RCTRuntime") || modulemap_path.include?("React-RuntimeApple")
        content = File.read(modulemap_path)
        if content.include?("module react_runtime")
          modified_content = content.gsub(/module react_runtime/, "module react_runtime_modified")
          File.write(modulemap_path, modified_content)
          puts "Modified module map at #{modulemap_path} to avoid conflicts"
        end
      end
    end
  end
EOF
      echo "Added post_integrate hook to Podfile to fix modulemap conflicts"
    fi
    
    # Check if Firebase pods are properly configured
    if ! grep -q "@react-native-firebase/app" "ios/Podfile"; then
      echo "React Native Firebase appears to be missing from Podfile."
      echo "Running pod install to ensure Firebase is properly linked..."
      cd ios && pod install && cd ..
    fi
  fi
  
  # Remove the first-run marker
  rm -rf .eas-pre-install-ran
  
  echo "Post-install tasks completed."
else
  echo "Skipping post-install tasks (not first run after pre-install)"
fi 