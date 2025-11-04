import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { clearAllTranslationCaches } from '../services/translationService';

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

// Logger utility DISABLED to prevent console flooding
const logger = {
  info: (message: string, ...args: any[]) => {
    // Translation info logging disabled to prevent console flooding
  },
  error: (message: string, ...args: any[]) => {
    // Only log critical translation errors
    if (message.includes('ERROR') || message.includes('failed')) {
      console.error(`[TRANSLATION ERROR] ${message}`);
    }
  },
  debug: (message: string, ...args: any[]) => {
    // Translation debug logging disabled to prevent console flooding
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
  const lastFetchTime = useRef(0);

  // Fetch translations from Supabase and cache them
  const fetchAndCacheTranslations = useCallback(async (lang: Language, forceFresh = false) => {
    try {
      // Always fetch fresh in dev mode to see new translations immediately
      const shouldForceFresh = __DEV__ || forceFresh;
      
      // Check if we should use cache
      const now = Date.now();
      if (!shouldForceFresh && now - lastFetchTime.current < CACHE_MAX_AGE) {
        return;
      }

      setIsLoading(true);

      const currentPlatform = Platform.OS === 'web' ? 'web' : 'mobile';

      console.log('🌐 [TranslationContext] Fetching translations from Supabase...');
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
      console.log('🌐 [TranslationContext] ✅ Loaded', data?.length || 0, 'translations');

      // Convert to record for easy lookup
      const fetchedTranslations: Record<string, string> = {};
      data?.forEach((item) => {
        fetchedTranslations[item.key] = item.value;
      });
      
      // Log celebration keys specifically for debugging
      if (__DEV__) {
        console.log('🌐 [TranslationContext] Celebration keys:', {
          lessonComplete: fetchedTranslations['celebration.lessonComplete'],
          greatJob: fetchedTranslations['celebration.greatJob'],
          exercisesCompleted: fetchedTranslations['celebration.exercisesCompleted'],
        });
      }

      // Get local translations as fallback
      const localTranslations = getLocalTranslations(lang);

      // Merge database translations with local fallbacks
      const mergedTranslations = { ...localTranslations, ...fetchedTranslations };

      // Cache the merged translations
      await cacheTranslations(lang, mergedTranslations);

      // Update state
      setTranslations(mergedTranslations);
      lastFetchTime.current = now;
      setIsLoading(false);
    } catch (error) {
      logger.error('Error fetching translations:', error);
      // Fall back to local translations on error
      const localTranslations = getLocalTranslations(lang);
      setTranslations(localTranslations);
      setIsLoading(false);
    }
  }, []);

  // Clear the cache
  const clearCache = React.useCallback(async () => {
    try {
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

  // Set up real-time subscription for translation updates
  useEffect(() => {
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
          if (payload.new && (payload.new as any).language === language) {
            clearCache().then(() => {
              fetchAndCacheTranslations(language, true);
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [language, fetchAndCacheTranslations, clearCache]);

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
        // ALWAYS fetch fresh in dev mode - ignore cache completely
        if (__DEV__) {
          console.log('🌐 [TranslationContext] DEV MODE - Fetching fresh translations (ignoring cache)');
          await fetchAndCacheTranslations(language, true);
          return;
        }

        // Try to get from cache first (production only)
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
  const setLanguage = React.useCallback(async (lang: Language) => {
    try {
      await AsyncStorage.setItem(CURRENT_LANGUAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      logger.error('Error setting language:', error);
    }
  }, []);

  // Get a translation by key
  const t = React.useCallback(
    (key: string): string => {
      // If the key exists in translations but is explicitly empty, return empty string
      if (key in translations && translations[key] === '') {
        return '';
      }
      // If the key doesn't exist in translations, return the key itself
      if (!(key in translations)) {
        // Missing translation logging disabled to prevent console flooding
        return key;
      }
      // Otherwise return the translation
      return translations[key];
    },
    [translations],
  );

  // Force refresh translations
  const refreshTranslations = useCallback(async () => {
    // Manual refresh of translations without logging
    await clearCache();
    return fetchAndCacheTranslations(language, true);
  }, [language, fetchAndCacheTranslations, clearCache]);

  const contextValue: TranslationContextType = React.useMemo(
    () => ({
      translations,
      isLoading,
      language,
      setLanguage,
      t,
      clearCache,
      refreshTranslations,
    }),
    [translations, isLoading, language, setLanguage, t, clearCache, refreshTranslations],
  );

  return <TranslationContext.Provider value={contextValue}>{children}</TranslationContext.Provider>;
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
