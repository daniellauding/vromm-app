#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Color mapping from hardcoded to theme tokens
const colorMappings = {
  // Brand colors
  '#00E6C3': '$brandPrimary',
  '#00FFBC': '$brandPrimary',
  
  // Grays - dark theme
  '#1A1A1A': '$gray900',
  '#1F1F1F': '$gray800', 
  '#222': '$gray800',
  '#2D3130': '$gray800',
  '#333': '$gray700',
  '#666': '$gray600',
  '#888': '$gray500',
  '#AAAAAA': '$gray400',
  '#999': '$gray400',
  
  // Status colors
  '#EF4444': '$red500',
  '#FF9500': '$amber500',
  '#4B6BFF': '$indigo500',
  
  // Basic colors
  '#000000': '$black',
  '#ffffff': '$white',
  '#fff': '$white',
  '#000': '$black',
  
  // Keep rgba for transparency
  // 'rgba(0,0,0,0.7)' - keep as is for overlays
};

// Files to process
const filesToProcess = [
  'src/screens/ProgressScreen.tsx',
  'src/screens/ProfileScreen.tsx',
  'src/screens/explore/RoutesDrawer.tsx',
  'src/screens/HomeScreen/Header.tsx',
  'src/screens/HomeScreen/CommunityFeed.tsx',
  'src/screens/HomeScreen/DraftRoutes.tsx',
  'src/components/TabNavigator.tsx',
  'src/components/TourOverlay.tsx',
  'src/components/RelationshipManagementModal.tsx',
  'src/components/OnboardingInteractive.tsx',
  'src/components/ActionSheet.tsx',
  'src/screens/CommunityFeedScreen.tsx',
  'src/components/PromotionalModal.tsx',
  'src/components/RouteCard.tsx',
  'src/components/Button.tsx',
  'src/components/LoadingScreen.tsx',
  'src/components/SelectButton.tsx',
  'src/screens/CreateEventScreen.tsx',
  'src/screens/ConversationScreen.tsx',
  'src/screens/CreateRouteScreen.tsx',
  'src/screens/RoleSelectionScreen.tsx',
  'src/screens/MessagesScreen.tsx',
  'src/screens/EventDetailScreen.tsx',
  'src/screens/EventsScreen.tsx',
  'src/screens/NotificationsScreen.tsx',
  'src/screens/SearchScreen.tsx',
  'src/screens/UsersScreen.tsx',
  'src/screens/PublicProfileScreen.tsx',
  'src/screens/explore/SelectedRoute.tsx',
  'src/screens/AddReviewScreen.tsx',
  'src/components/AppHeader.tsx',
  'src/components/EventCard.tsx',
  'src/components/ReviewSection.tsx'
];

function replaceColors(content) {
  let updatedContent = content;
  
  // Replace hex colors in various contexts
  Object.entries(colorMappings).forEach(([hex, token]) => {
    // Skip rgba replacements
    if (hex.includes('rgba')) return;
    
    // Replace in style objects: backgroundColor: '#hex'
    const bgColorRegex = new RegExp(`backgroundColor:\\s*['"\`]${hex.replace('#', '#')}['"\`]`, 'gi');
    updatedContent = updatedContent.replace(bgColorRegex, `backgroundColor: '${token}'`);
    
    // Replace in color props: color="#hex"
    const colorPropRegex = new RegExp(`color=["']${hex.replace('#', '#')}["']`, 'gi');
    updatedContent = updatedContent.replace(colorPropRegex, `color="${token}"`);
    
    // Replace in style color: color: '#hex'
    const styleColorRegex = new RegExp(`color:\\s*['"\`]${hex.replace('#', '#')}['"\`]`, 'gi');
    updatedContent = updatedContent.replace(styleColorRegex, `color: '${token}'`);
    
    // Replace in borderColor: borderColor: '#hex'
    const borderColorRegex = new RegExp(`borderColor:\\s*['"\`]${hex.replace('#', '#')}['"\`]`, 'gi');
    updatedContent = updatedContent.replace(borderColorRegex, `borderColor: '${token}'`);
    
    // Replace in conditional expressions: ? '#hex' : '#hex'
    const ternaryRegex = new RegExp(`\\?\\s*['"\`]${hex.replace('#', '#')}['"\`]\\s*:`, 'gi');
    updatedContent = updatedContent.replace(ternaryRegex, `? '${token}' :`);
    
    const ternaryElseRegex = new RegExp(`:\\s*['"\`]${hex.replace('#', '#')}['"\`]([\\s,;\\)\\}])`, 'gi');
    updatedContent = updatedContent.replace(ternaryElseRegex, `: '${token}'$1`);
    
    // Replace in arrays/objects: ['#hex'] or { color: '#hex' }
    const arrayRegex = new RegExp(`\\[['"\`]${hex.replace('#', '#')}['"\`]\\]`, 'gi');
    updatedContent = updatedContent.replace(arrayRegex, `['${token}']`);
    
    // Replace shadowColor
    const shadowColorRegex = new RegExp(`shadowColor:\\s*['"\`]${hex.replace('#', '#')}['"\`]`, 'gi');
    updatedContent = updatedContent.replace(shadowColorRegex, `shadowColor: '${token}'`);
    
    // Replace tintColor  
    const tintColorRegex = new RegExp(`tintColor=["']${hex.replace('#', '#')}["']`, 'gi');
    updatedContent = updatedContent.replace(tintColorRegex, `tintColor="${token}"`);
    
    // Replace in colors array
    const colorsArrayRegex = new RegExp(`colors={\\[['"\`]${hex.replace('#', '#')}['"\`]\\]}`, 'gi');
    updatedContent = updatedContent.replace(colorsArrayRegex, `colors={['${token}']}`);
  });
  
  return updatedContent;
}

function processFile(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(fullPath, 'utf8');
    const updatedContent = replaceColors(content);
    
    if (content !== updatedContent) {
      fs.writeFileSync(fullPath, updatedContent);
      console.log(`✅ Fixed colors in: ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

console.log('🎨 Fixing hardcoded colors in the codebase...\n');

filesToProcess.forEach(processFile);

console.log('\n✨ Color replacement complete!');
console.log('\n📝 Next steps:');
console.log('1. Review the changes with: git diff');
console.log('2. Test the UI to ensure colors display correctly');
console.log('3. Update any remaining edge cases manually');
console.log('4. Consider adding ESLint rules to prevent hardcoded colors');