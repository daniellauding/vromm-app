import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, translations } from '../i18n/translations';
import { NativeModules, Platform } from 'react-native';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = '@language';

function getDeviceLanguage(): Language {
  try {
    // Get device language
    let deviceLanguage = 'sv'; // Default to Swedish

    if (Platform.OS === 'ios') {
      deviceLanguage = 
        NativeModules.SettingsManager?.settings?.AppleLocale ||
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0] ||
        'sv';
    } else {
      deviceLanguage = NativeModules.I18nManager?.localeIdentifier || 'sv';
    }

    // Check if device language starts with 'sv' or 'en'
    const languageCode = deviceLanguage.toLowerCase().slice(0, 2);
    return languageCode === 'en' ? 'en' : 'sv'; // Default to Swedish if not English
  } catch (error) {
    console.warn('Failed to get device language:', error);
    return 'sv'; // Default to Swedish on error
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('sv'); // Start with Swedish
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load saved language preference or get device language
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((savedLanguage: string | null) => {
        if (savedLanguage === 'en' || savedLanguage === 'sv') {
          setLanguageState(savedLanguage);
        } else {
          const deviceLang = getDeviceLanguage();
          setLanguageState(deviceLang);
        }
      })
      .catch(() => {
        // On error, default to Swedish
        setLanguageState('sv');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  };

  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation missing for key: ${key}`);
        return key;
      }
    }
    
    return value;
  };

  if (isLoading) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}; 