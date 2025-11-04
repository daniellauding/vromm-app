#!/bin/bash

# Force clear all translation cache for iOS and Android

echo "🧹 Clearing translation cache..."

# For iOS Simulator (if running)
if command -v xcrun &> /dev/null; then
  echo "📱 Clearing iOS cache..."
  xcrun simctl get_app_container booted se.vromm.app data 2>/dev/null | xargs -I {} find {} -name "*translation*" -delete 2>/dev/null || echo "iOS simulator not running or app not installed"
fi

# For Android (if device/emulator connected)
if command -v adb &> /dev/null; then
  echo "🤖 Clearing Android cache..."
  adb shell "run-as se.vromm.app find /data/data/se.vromm.app -name '*translation*' -delete" 2>/dev/null || echo "Android device not connected or app not installed"
fi

echo "✅ Cache cleared! Now restart your app to see fresh translations."
echo ""
echo "OR run this in your app console:"
echo "AsyncStorage.clear().then(() => console.log('Cache cleared'))"

