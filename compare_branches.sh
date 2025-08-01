#!/bin/bash
# compare_branches.sh - Automated comparison script

WORKING_COMMIT="9622b61"
CURRENT_COMMIT=$(git rev-parse --short HEAD)
CURRENT_BRANCH=$(git branch --show-current || echo "detached")

echo "🔍 Vromm App Branch Comparison"
echo "=============================================="
echo "Working Version: $WORKING_COMMIT (commit: 'fixed exercises thing')"
echo "Current Version: $CURRENT_COMMIT (branch: $CURRENT_BRANCH)"
echo "=============================================="

echo ""
echo "📦 PACKAGE.JSON DIFFERENCES:"
echo "-----------------------------"
if git diff --quiet $WORKING_COMMIT HEAD -- package.json; then
    echo "✅ No differences in package.json"
else
    echo "❌ Found differences in package.json:"
    git diff $WORKING_COMMIT HEAD -- package.json --name-only
    echo ""
    echo "Key package version differences:"
    git diff $WORKING_COMMIT HEAD -- package.json | grep -E '^\+.*"(react-native|expo|tamagui|@tamagui)' || echo "No major package changes found"
fi

echo ""
echo "⚙️  CONFIGURATION FILE DIFFERENCES:"
echo "-----------------------------------"
config_files=("babel.config.js" "tamagui.config.ts" "metro.config.js" "eas.json" "app.json")

for file in "${config_files[@]}"; do
    if git diff --quiet $WORKING_COMMIT HEAD -- "$file"; then
        echo "✅ $file - No changes"
    else
        echo "❌ $file - HAS CHANGES"
        git diff --stat $WORKING_COMMIT HEAD -- "$file"
    fi
done

echo ""
echo "📝 COMMIT HISTORY DIFFERENCES:"
echo "------------------------------"
echo "Commits between working version and current:"
git log --oneline $WORKING_COMMIT..HEAD | head -10

if [ $(git log --oneline $WORKING_COMMIT..HEAD | wc -l) -eq 0 ]; then
    echo "✅ Current version is at or before working commit"
else
    echo "❌ Current version has $(git log --oneline $WORKING_COMMIT..HEAD | wc -l) commits after working version"
fi

echo ""
echo "🏗️  CRITICAL BUILD SETTINGS CHECK:"
echo "----------------------------------"

# Check Hermes setting in EAS
if grep -q '"USE_HERMES": "0"' eas.json 2>/dev/null; then
    echo "✅ Hermes is disabled (correct)"
else
    echo "❌ Hermes setting may be wrong or missing"
fi

# Check New Architecture setting
if grep -q '"RCT_NEW_ARCH_ENABLED": "0"' eas.json 2>/dev/null; then
    echo "✅ New Architecture is disabled (correct)"
else
    echo "❌ New Architecture setting may be wrong or missing"
fi

# Check iOS frameworks
if grep -q '"useFrameworks": "static"' eas.json 2>/dev/null; then
    echo "✅ iOS static frameworks enabled (correct)"
else
    echo "❌ iOS frameworks setting may be wrong or missing"
fi

echo ""
echo "🔧 RECOMMENDED ACTIONS:"
echo "----------------------"
if git diff --quiet $WORKING_COMMIT HEAD -- package.json babel.config.js tamagui.config.ts metro.config.js eas.json; then
    echo "✅ All critical files match working version"
else
    echo "❌ Critical differences found. Recommended actions:"
    echo "   1. Copy working configuration files:"
    echo "      git checkout $WORKING_COMMIT -- babel.config.js tamagui.config.ts metro.config.js eas.json"
    echo "   2. Check package.json for version mismatches"
    echo "   3. Run: npm run start-clean"
fi

echo ""
echo "📋 GENERATE ANALYSIS FILE:"
echo "-------------------------"
echo "To create analysis file for current branch:"
echo "cp PROJECT_COMPARISON_TEMPLATE.md PROJECT_ANALYSIS_BROKEN_${CURRENT_COMMIT}.md"
echo ""
echo "Comparison complete! 🎉"