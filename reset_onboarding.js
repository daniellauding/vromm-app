// Run this script to reset onboarding for testing
// Copy and paste this into the React Native console or add to a debug button

import AsyncStorage from '@react-native-async-storage/async-storage';

const resetOnboarding = async () => {
  try {
    console.log('🔄 Resetting all onboarding storage...');
    
    // Clear all onboarding-related storage
    await AsyncStorage.multiRemove([
      'vromm_first_login',
      'interactive_onboarding', 
      'vromm_onboarding',
      'show_onboarding',
      'onboarding_content_hash'
    ]);
    
    console.log('✅ Onboarding storage cleared!');
    console.log('📱 Restart the app or reload to see onboarding again');
    
    // Show current storage state
    const keys = await AsyncStorage.getAllKeys();
    const onboardingKeys = keys.filter(key => 
      key.includes('onboarding') || key.includes('first_login')
    );
    
    console.log('🔍 Remaining onboarding keys:', onboardingKeys);
    
  } catch (error) {
    console.error('❌ Error resetting onboarding:', error);
  }
};

// Call the function
resetOnboarding();
