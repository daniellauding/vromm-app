# Project Comparison Template

## How to Use This Template

1. **Working Version Analysis**: `PROJECT_ANALYSIS_WORKING_9622b61.md` (already created)
2. **Broken Version Analysis**: Create `PROJECT_ANALYSIS_BROKEN_[COMMIT].md` for main branch
3. **Comparison**: Use this template to compare both versions

## Quick Setup Commands

```bash
# 1. Copy this template when analyzing main branch
cp PROJECT_COMPARISON_TEMPLATE.md PROJECT_ANALYSIS_BROKEN_$(git rev-parse --short HEAD).md

# 2. Edit the new file with main branch details
# 3. Use diff commands below to compare
```

## Comparison Structure

### File Naming Convention
- `PROJECT_ANALYSIS_WORKING_9622b61.md` ← Working version (commit 9622b61)
- `PROJECT_ANALYSIS_BROKEN_[COMMIT].md` ← Broken version (main branch)
- `PROJECT_COMPARISON_RESULTS.md` ← Final comparison results

### Key Comparison Points

#### 1. Git Information
```bash
# Compare commits
git log --oneline working-commit..main-commit

# Compare specific files
git diff 9622b61 main -- package.json
git diff 9622b61 main -- babel.config.js
git diff 9622b61 main -- tamagui.config.ts
```

#### 2. Package Versions
```bash
# Extract versions from both branches
git show 9622b61:package.json | jq '.dependencies' > working_deps.json
git show main:package.json | jq '.dependencies' > main_deps.json
diff working_deps.json main_deps.json
```

#### 3. Configuration Files
Critical files to compare:
- `tamagui.config.ts`
- `src/tamagui.config.ts`  
- `babel.config.js`
- `metro.config.js`
- `eas.json`
- `app.json`

#### 4. Build Settings Comparison
```bash
# Compare EAS build settings
git diff 9622b61 main -- eas.json

# Compare Expo config
git diff 9622b61 main -- app.json
```

## Analysis Template for Broken Branch

Copy this section to your new analysis file:

```markdown
# Vromm App - Broken Branch Analysis

## Version Control & Environment Information

### Git Repository
- **Repository**: https://github.com/daniellauding/vromm-app.git
- **Current Commit**: `[COMMIT_HASH]`
- **Branch**: [BRANCH_NAME]
- **Latest Commit**: "[COMMIT_MESSAGE]"

### Recent Commits (Last 10)
[INSERT GIT LOG]

### Development Environment
- **Node.js**: [VERSION]
- **npm**: [VERSION]
- **Expo CLI**: [VERSION]
- **EAS CLI**: [VERSION]
- **Platform**: [PLATFORM]

### Issues Found
- [ ] Package version mismatches
- [ ] Configuration file differences  
- [ ] Build setting problems
- [ ] Missing dependencies
- [ ] Other: ___________

## Package Version Comparison
| Package | Working (9622b61) | Broken (main) | Status |
|---------|-------------------|---------------|---------|
| react-native | 0.79.3 | [VERSION] | ✅/❌ |
| expo | 53.0.9 | [VERSION] | ✅/❌ |
| tamagui | 1.121.12 | [VERSION] | ✅/❌ |

## Configuration Differences
[INSERT DIFF RESULTS]

## Error Logs
[INSERT ERROR MESSAGES]

## Fix Actions Required
- [ ] Downgrade package X to version Y
- [ ] Update configuration file Z
- [ ] Fix build setting A
- [ ] Other: ___________
```

## Automated Comparison Script

Create this script to automate comparison:

```bash
#!/bin/bash
# compare_branches.sh

WORKING_COMMIT="9622b61"
CURRENT_COMMIT=$(git rev-parse --short HEAD)

echo "Comparing Working ($WORKING_COMMIT) vs Current ($CURRENT_COMMIT)"
echo "================================================"

echo "📦 Package Differences:"
git diff $WORKING_COMMIT HEAD -- package.json

echo "⚙️  Config Differences:"
git diff $WORKING_COMMIT HEAD -- babel.config.js tamagui.config.ts metro.config.js eas.json

echo "📝 Commit Differences:"
git log --oneline $WORKING_COMMIT..HEAD

echo "🏗️  Build Setting Differences:"
git diff $WORKING_COMMIT HEAD -- app.json
```

## Next Steps

1. Checkout to main branch
2. Create analysis file: `PROJECT_ANALYSIS_BROKEN_[COMMIT].md`
3. Run comparison commands
4. Document differences
5. Apply fixes based on working version
6. Create final comparison results file