import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Types
export type Language = 'en' | 'sv';
export interface Translation {
  key: string;
  language: Language;
  value: string;
  platform?: string;
}

// Cache keys
const TRANSLATION_CACHE_KEY = 'translations_cache';
const TRANSLATION_VERSION_KEY = 'translations_version';
const CURRENT_LANGUAGE_KEY = 'current_language';

// Context type
interface TranslationContextType {
  translations: Record<string, string>;
  isLoading: boolean;
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  clearCache: () => Promise<void>;
}

// Create context with default values
const TranslationContext = createContext<TranslationContextType>({
  translations: {},
  isLoading: true,
  language: 'en',
  setLanguage: async () => {},
  t: key => key,
  clearCache: async () => {}
});

// Logger utility (simplified)
const logger = {
  info: (message: string, ...args: any[]) => {
    if (__DEV__) console.log(`[INFO] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  }
};

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  // Load the current language from storage
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const storedLanguage = await AsyncStorage.getItem(CURRENT_LANGUAGE_KEY);
        if (storedLanguage) {
          setLanguageState(storedLanguage as Language);
        }
      } catch (error) {
        logger.error('Error loading language:', error);
      }
    };

    loadLanguage();
  }, []);

  // Load translations whenever language changes
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        // Try to get from cache first
        const cachedTranslations = await getCachedTranslations(language);
        if (cachedTranslations) {
          setTranslations(cachedTranslations);
          setIsLoading(false);

          // Check for updates in background
          checkTranslationsVersion().then(needsUpdate => {
            if (needsUpdate) {
              fetchAndCacheTranslations(language);
            }
          });
          return;
        }

        // If no cache, fetch from Supabase
        await fetchAndCacheTranslations(language);
      } catch (error) {
        logger.error('Error loading translations:', error);
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [language]);

  // Fetch translations from Supabase and cache them
  const fetchAndCacheTranslations = async (lang: Language) => {
    try {
      const currentPlatform = Platform.OS === 'web' ? 'web' : 'mobile';

      const { data, error } = await supabase
        .from('translations')
        .select('key, value, platform')
        .eq('language', lang)
        .or(`platform.is.null,platform.eq.${currentPlatform}`);

      if (error) {
        logger.error('Error fetching translations:', error);
        setIsLoading(false);
        return;
      }

      // Convert to record for easy lookup
      const fetchedTranslations: Record<string, string> = {};
      data?.forEach(item => {
        fetchedTranslations[item.key] = item.value;
      });

      // Cache the translations
      await cacheTranslations(lang, fetchedTranslations);

      // Update state
      setTranslations(fetchedTranslations);
      setIsLoading(false);
    } catch (error) {
      logger.error('Error fetching translations:', error);
      setIsLoading(false);
    }
  };

  // Set the language
  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(CURRENT_LANGUAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      logger.error('Error setting language:', error);
    }
  };

  // Get a translation by key
  const t = (key: string): string => {
    return translations[key] || key;
  };

  // Clear the cache
  const clearCache = async () => {
    try {
      const keys = [
        `${TRANSLATION_CACHE_KEY}_en`,
        `${TRANSLATION_CACHE_KEY}_sv`,
        TRANSLATION_VERSION_KEY
      ];

      await AsyncStorage.multiRemove(keys);
      logger.info('Translation cache cleared');

      // Reload translations
      await fetchAndCacheTranslations(language);
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  };

  return (
    <TranslationContext.Provider
      value={{
        translations,
        isLoading,
        language,
        setLanguage,
        t,
        clearCache
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
};

// Hook to use the translation context
export const useTranslation = () => useContext(TranslationContext);

// Cache helpers
async function getCachedTranslations(language: Language): Promise<Record<string, string> | null> {
  try {
    const cacheKey = `${TRANSLATION_CACHE_KEY}_${language}`;
    const cachedData = await AsyncStorage.getItem(cacheKey);

    if (cachedData) {
      return JSON.parse(cachedData);
    }

    return null;
  } catch (error) {
    logger.error('Error getting cached translations:', error);
    return null;
  }
}

async function cacheTranslations(
  language: Language,
  translations: Record<string, string>
): Promise<void> {
  try {
    const cacheKey = `${TRANSLATION_CACHE_KEY}_${language}`;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(translations));

    // Also update the version timestamp
    await AsyncStorage.setItem(TRANSLATION_VERSION_KEY, Date.now().toString());
  } catch (error) {
    logger.error('Error caching translations:', error);
  }
}

async function checkTranslationsVersion(): Promise<boolean> {
  try {
    // Get the latest update time from Supabase
    const { data, error } = await supabase
      .from('translations')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      logger.error('Error checking translations version:', error);
      return false;
    }

    // If we have data, check against our stored version
    if (data && data.length > 0) {
      const latestUpdateTime = new Date(data[0].updated_at).getTime();
      const storedVersionStr = await AsyncStorage.getItem(TRANSLATION_VERSION_KEY);

      if (!storedVersionStr) {
        return true; // No stored version, need to refresh
      }

      const storedVersion = parseInt(storedVersionStr, 10);
      return latestUpdateTime > storedVersion;
    }

    return false;
  } catch (error) {
    logger.error('Error in checkTranslationsVersion:', error);
    return false;
  }
}
