import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { clearAllTranslationCaches } from '../services/translationService';
import { LoadingScreen } from '../components/LoadingScreen';

// Import local JSON files as fallback
import enTranslations from '../translations/en.json';
import svTranslations from '../translations/sv.json';

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

// Configure cache lifetime (set to a short period for testing)
const CACHE_MAX_AGE = 10 * 1000; // 10 seconds for testing, you can increase later

// Context type
interface TranslationContextType {
  translations: Record<string, string>;
  isLoading: boolean;
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  clearCache: () => Promise<void>;
  refreshTranslations: () => Promise<void>;
}

// Create context with default values
const TranslationContext = createContext<TranslationContextType>({
  translations: {},
  isLoading: true,
  language: 'en',
  setLanguage: async () => {},
  t: (key) => key,
  clearCache: async () => {},
  refreshTranslations: async () => {},
});

// Logger utility (simplified) - fixed to prevent null logging
const logger = {
  info: (message: string, ...args: any[]) => {
    const validArgs = args.filter(arg => arg !== null && arg !== undefined);
    if (__DEV__) {
      if (validArgs.length > 0) {
        console.log(`[TRANSLATION] ${message}`, ...validArgs);
      } else {
        console.log(`[TRANSLATION] ${message}`);
      }
    }
  },
  error: (message: string, ...args: any[]) => {
    const validArgs = args.filter(arg => arg !== null && arg !== undefined);
    if (validArgs.length > 0) {
      console.error(`[TRANSLATION ERROR] ${message}`, ...validArgs);
    } else {
      console.error(`[TRANSLATION ERROR] ${message}`);
    }
  },
  debug: (message: string, ...args: any[]) => {
    const validArgs = args.filter(arg => arg !== null && arg !== undefined);
    if (__DEV__) {
      if (validArgs.length > 0) {
        console.log(`[TRANSLATION DEBUG] ${message}`, ...validArgs);
      } else {
        console.log(`[TRANSLATION DEBUG] ${message}`);
      }
    }
  },
};

// Helper function to flatten nested JSON objects
const flattenTranslations = (obj: any, prefix = ''): Record<string, string> => {
  const result: Record<string, string> = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        Object.assign(result, flattenTranslations(obj[key], newKey));
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  
  return result;
};

// Get local fallback translations
const getLocalTranslations = (language: Language): Record<string, string> => {
  const localTranslations = language === 'en' ? enTranslations : svTranslations;
  return flattenTranslations(localTranslations);
};

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Fetch translations from Supabase and cache them
  const fetchAndCacheTranslations = useCallback(
    async (lang: Language, forceFresh = false) => {
      try {
        // Check if we should use cache
        const now = Date.now();
        if (!forceFresh && now - lastFetchTime < CACHE_MAX_AGE) {
          logger.debug(`Using recently fetched translations (${now - lastFetchTime}ms old)`);
          return;
        }

        logger.info(`Fetching translations for ${lang}${forceFresh ? ' (forced)' : ''}`);
        setIsLoading(true);

        const currentPlatform = Platform.OS === 'web' ? 'web' : 'mobile';

        const { data, error } = await supabase
          .from('translations')
          .select('key, value, platform, updated_at')
          .eq('language', lang)
          .or(`platform.is.null,platform.eq.${currentPlatform}`);

        if (error) {
          logger.error('Error fetching translations:', error);
          // Fall back to local translations on error
          const localTranslations = getLocalTranslations(lang);
          setTranslations(localTranslations);
          setIsLoading(false);
          return;
        }

        logger.info(`Received ${data?.length || 0} translations from Supabase`);

        // Convert to record for easy lookup
        const fetchedTranslations: Record<string, string> = {};
        data?.forEach((item) => {
          fetchedTranslations[item.key] = item.value;
          // Disabled debug logging for individual translations to reduce console spam
          // logger.debug(`Translation: ${item.key} = ${item.value} (updated ${item.updated_at})`);
        });

        // Get local translations as fallback
        const localTranslations = getLocalTranslations(lang);
        
        // Merge database translations with local fallbacks
        const mergedTranslations = { ...localTranslations, ...fetchedTranslations };
        
        // Cache the merged translations
        await cacheTranslations(lang, mergedTranslations);

        // Update state
        setTranslations(mergedTranslations);
        setLastFetchTime(now);
        setIsLoading(false);
      } catch (error) {
        logger.error('Error fetching translations:', error);
        // Fall back to local translations on error
        const localTranslations = getLocalTranslations(lang);
        setTranslations(localTranslations);
        setIsLoading(false);
      }
    },
    [lastFetchTime],
  );

  // Set up real-time subscription for translation updates
  useEffect(() => {
    logger.info('Setting up real-time translation updates');

    const subscription = supabase
      .channel('translations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'translations',
        },
        (payload) => {
          logger.info('Translation change detected:', payload);

          // If the change is for our current language, immediately refresh
          if (payload.new && (payload.new as any).language === language) {
            logger.info('Current language translation changed, refreshing');
            // Clear cache and force a refresh
            clearCache().then(() => {
              fetchAndCacheTranslations(language, true);
            });
          }
        },
      )
      .subscribe((status) => {
        logger.info(`Real-time subscription status: ${status}`);
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [language, fetchAndCacheTranslations]);

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
          logger.debug('Using cached translations');
          setTranslations(cachedTranslations);
          setIsLoading(false);

          // Always check for updates and refresh if needed
          const needsUpdate = await checkTranslationsVersion();
          if (needsUpdate) {
            logger.info('Cache is stale, refreshing translations');
            await fetchAndCacheTranslations(language, true);
          } else {
            // Even if the cache is valid, refresh if it's older than our max age
            const now = Date.now();
            const timestamp = parseInt(
              (await AsyncStorage.getItem(TRANSLATION_VERSION_KEY)) || '0',
              10,
            );
            if (now - timestamp > CACHE_MAX_AGE) {
              logger.debug('Cache is older than max age, refreshing in background');
              fetchAndCacheTranslations(language, false);
            }
          }
          return;
        }

        // If no cache, fetch from Supabase
        await fetchAndCacheTranslations(language, true);
      } catch (error) {
        logger.error('Error loading translations:', error);
        setIsLoading(false);
      }
    };

    loadTranslations();
  }, [language, fetchAndCacheTranslations]);

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
  const t = React.useCallback(
    (key: string): string => {
      // If the key exists in translations but is explicitly empty, return empty string
      if (key in translations && translations[key] === '') {
        return '';
      }
      // If the key doesn't exist in translations, return the key itself
      if (!(key in translations)) {
        logger.debug(`Missing translation for key: ${key}`);
        return key;
      }
      // Otherwise return the translation
      return translations[key];
    },
    [translations],
  );

  // Force refresh translations
  const refreshTranslations = useCallback(async () => {
    logger.info('Manual refresh of translations requested');
    await clearCache();
    return fetchAndCacheTranslations(language, true);
  }, [language, fetchAndCacheTranslations]);

  // Clear the cache
  const clearCache = React.useCallback(async () => {
    try {
      logger.info('Clearing translation cache');

      // Clear both our cache and the translationService cache
      await clearAllTranslationCaches();

      // Also clear our local cache keys
      const keys = [
        `${TRANSLATION_CACHE_KEY}_en`,
        `${TRANSLATION_CACHE_KEY}_sv`,
        TRANSLATION_VERSION_KEY,
      ];

      await AsyncStorage.multiRemove(keys);
      logger.info('Translation cache cleared');
    } catch (error) {
      logger.error('Error clearing cache:', error);
    }
  }, []);

  return (
    <TranslationContext.Provider
      value={{
        translations,
        isLoading,
        language,
        setLanguage,
        t,
        clearCache,
        refreshTranslations,
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
  translations: Record<string, string>,
): Promise<void> {
  try {
    const cacheKey = `${TRANSLATION_CACHE_KEY}_${language}`;

    // Clear previous cache
    await AsyncStorage.removeItem(cacheKey);

    // Set new cache
    await AsyncStorage.setItem(cacheKey, JSON.stringify(translations));

    // Also update the version timestamp
    await AsyncStorage.setItem(TRANSLATION_VERSION_KEY, Date.now().toString());

    logger.debug(`Cached ${Object.keys(translations).length} translations for ${language}`);
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
        logger.debug('No stored version, need to refresh');
        return true; // No stored version, need to refresh
      }

      const storedVersion = parseInt(storedVersionStr, 10);
      const needsUpdate = latestUpdateTime > storedVersion;

      if (needsUpdate) {
        logger.debug(
          `Cache is outdated: ${new Date(storedVersion).toISOString()} vs ${new Date(
            latestUpdateTime,
          ).toISOString()}`,
        );
      }

      return needsUpdate;
    }

    return false;
  } catch (error) {
    logger.error('Error in checkTranslationsVersion:', error);
    return false;
  }
}
