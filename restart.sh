#!/bin/bash
# NUCLEAR RESTART - NO WATCHMAN NEEDED

echo "🔥 Killing all Expo/Metro processes..."
pkill -f "node.*expo"
pkill -f "node.*metro"

sleep 2

echo "🗑️ Clearing all caches..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf /tmp/metro-* 2>/dev/null
rm -rf /tmp/react-* 2>/dev/null

echo "🚀 Starting fresh Expo server..."
npx expo start --clear --reset-cache

