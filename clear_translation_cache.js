// Run this in Expo Go console or add to App.tsx temporarily
import AsyncStorage from '@react-native-async-storage/async-storage';

(async () => {
  const keys = await AsyncStorage.getAllKeys();
  console.log('📋 All AsyncStorage keys:', keys);
  
  const translationKeys = keys.filter(k => k.includes('translation'));
  console.log('🌐 Translation keys found:', translationKeys);
  
  if (translationKeys.length > 0) {
    await AsyncStorage.multiRemove(translationKeys);
    console.log('✅ Cleared', translationKeys.length, 'translation cache keys');
    console.log('🔄 Please restart the app now!');
  } else {
    console.log('ℹ️ No translation cache found');
  }
})();
