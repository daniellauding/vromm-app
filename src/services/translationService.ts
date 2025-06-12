import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { Platform } from 'react-native';

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

// Set up real-time subscription
let subscriptionActive = false;

/**
 * Sets up real-time subscription for translation updates
 */
export const setupTranslationSubscription = (): void => {
  if (subscriptionActive) {
    logger.info('[TRANSLATIONS] Real-time subscription already active');
    return;
  }

  try {
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
          logger.info('[TRANSLATIONS] Real-time update received:', payload);
          console.log('[TRANSLATIONS] Translation changed, refreshing cache');
          // Force refresh translations when any change occurs
          forceRefreshTranslations().catch((err) =>
            logger.error('[TRANSLATIONS] Error refreshing after real-time update:', err),
          );
        },
      )
      .subscribe((status) => {
        logger.info(`[TRANSLATIONS] Subscription status: ${status}`);
        subscriptionActive = status === 'SUBSCRIBED';
        console.log(
          `[TRANSLATIONS] Real-time subscription ${subscriptionActive ? 'active' : 'failed'}`,
        );
      });

    // Cleanup function for when app is unmounted
    const cleanup = () => {
      if (subscription) {
        supabase.removeChannel(subscription);
        subscriptionActive = false;
        logger.info('[TRANSLATIONS] Removed real-time subscription');
      }
    };

    // Return cleanup function (can be used if needed)
    return cleanup;
  } catch (error) {
    logger.error('[TRANSLATIONS] Error setting up real-time subscription:', error);
    subscriptionActive = false;
  }
};

// Initialize subscription when this module loads
setupTranslationSubscription();

/**
 * Fetches translations from Supabase for a specific language
 */
export const fetchTranslations = async (
  language: Language = 'en',
  forceRefresh = false,
): Promise<Record<string, string>> => {
  try {
    // Always check if an update is needed
    const needsUpdate = await checkTranslationsVersion();

    // First try to get cached translations (if not forcing refresh and no update is needed)
    if (!forceRefresh && !needsUpdate) {
      const cachedTranslations = await getCachedTranslations(language);
      if (cachedTranslations) {
        console.log(`[TRANSLATIONS] Using cached translations for ${language}`);
        return cachedTranslations;
      }
    } else if (needsUpdate) {
      console.log(`[TRANSLATIONS] Update needed for ${language} translations`);
    }

    console.log(`[TRANSLATIONS] Fetching fresh translations for ${language} from Supabase`);

    // If no cache, fetch from Supabase
    // Platform-specific queries
    const currentPlatform = Platform.OS === 'web' ? 'web' : 'mobile';

    const { data, error } = await supabase
      .from('translations')
      .select('key, value, platform')
      .eq('language', language)
      .or(`platform.is.null,platform.eq.${currentPlatform}`);

    if (error) {
      logger.error('Error fetching translations:', error);
      return {};
    }

    console.log(`[TRANSLATIONS] Received ${data?.length || 0} translations from Supabase`);

    // Convert to record for easy lookup
    const translations: Record<string, string> = {};
    data?.forEach((item) => {
      translations[item.key] = item.value;
    });

    // Cache the translations
    await cacheTranslations(language, translations);

    return translations;
  } catch (error) {
    logger.error('Error in fetchTranslations:', error);
    return {};
  }
};

/**
 * Gets cached translations for a specific language
 */
export const getCachedTranslations = async (
  language: Language,
): Promise<Record<string, string> | null> => {
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
};

/**
 * Caches translations for a specific language
 */
export const cacheTranslations = async (
  language: Language,
  translations: Record<string, string>,
): Promise<void> => {
  try {
    const cacheKey = `${TRANSLATION_CACHE_KEY}_${language}`;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(translations));

    // Also update the version timestamp
    await AsyncStorage.setItem(TRANSLATION_VERSION_KEY, Date.now().toString());
  } catch (error) {
    logger.error('Error caching translations:', error);
  }
};

/**
 * Clears the translation cache
 */
export const clearTranslationCache = async (): Promise<void> => {
  try {
    const keys = [
      `${TRANSLATION_CACHE_KEY}_en`,
      `${TRANSLATION_CACHE_KEY}_sv`,
      TRANSLATION_VERSION_KEY,
    ];

    await AsyncStorage.multiRemove(keys);
    logger.info('Translation cache cleared');
  } catch (error) {
    logger.error('Error clearing translation cache:', error);
  }
};

/**
 * Checks if translations need to be refreshed
 */
export const checkTranslationsVersion = async (): Promise<boolean> => {
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
};

// Current language management
const CURRENT_LANGUAGE_KEY = 'current_language';

/**
 * Gets the current language
 */
export const getCurrentLanguage = async (): Promise<Language> => {
  try {
    const language = await AsyncStorage.getItem(CURRENT_LANGUAGE_KEY);
    return (language as Language) || 'en';
  } catch (error) {
    logger.error('Error getting current language:', error);
    return 'en';
  }
};

/**
 * Sets the current language
 */
export const setCurrentLanguage = async (language: Language): Promise<void> => {
  try {
    await AsyncStorage.setItem(CURRENT_LANGUAGE_KEY, language);
  } catch (error) {
    logger.error('Error setting current language:', error);
  }
};

/**
 * Gets a translation by key
 */
export const getTranslation = async (key: string, language?: Language): Promise<string> => {
  try {
    // If language not provided, get the current language
    const currentLanguage = language || (await getCurrentLanguage());

    // Get translations for the language
    const translations = await fetchTranslations(currentLanguage);

    // Return the translation or the key itself as fallback
    return translations[key] || key;
  } catch (error) {
    logger.error('Error getting translation:', error);
    return key;
  }
};

/**
 * Gets multiple translations by keys
 */
export const getTranslations = async (
  keys: string[],
  language?: Language,
): Promise<Record<string, string>> => {
  try {
    // If language not provided, get the current language
    const currentLanguage = language || (await getCurrentLanguage());

    // Get translations for the language
    const translations = await fetchTranslations(currentLanguage);

    // Filter to only the requested keys
    const result: Record<string, string> = {};
    keys.forEach((key) => {
      result[key] = translations[key] || key;
    });

    return result;
  } catch (error) {
    logger.error('Error getting translations:', error);

    // Return keys as values as fallback
    const result: Record<string, string> = {};
    keys.forEach((key) => {
      result[key] = key;
    });

    return result;
  }
};

// Add a new function to force refresh translations

/**
 * Forces a refresh of translations from Supabase by clearing the cache and fetching fresh data
 */
export const forceRefreshTranslations = async (language?: Language): Promise<void> => {
  try {
    console.log('[TRANSLATIONS] Force refreshing translations');

    // Clear ALL translation caches (this service and LanguageContext)
    await clearAllTranslationCaches();

    // If a specific language is provided, fetch only that language
    if (language) {
      await fetchTranslations(language);
      console.log(`[TRANSLATIONS] Force refreshed '${language}' translations`);
    } else {
      // Otherwise refresh all languages
      await fetchTranslations('en');
      await fetchTranslations('sv');
      console.log('[TRANSLATIONS] Force refreshed all translations');
    }
  } catch (error) {
    logger.error('Error force refreshing translations:', error);
  }
};

/**
 * Clears ALL translation caches from both translationService and LanguageContext
 */
export const clearAllTranslationCaches = async (): Promise<void> => {
  try {
    // Clear caches from this service
    const serviceKeys = [
      `${TRANSLATION_CACHE_KEY}_en`,
      `${TRANSLATION_CACHE_KEY}_sv`,
      TRANSLATION_VERSION_KEY,
      CURRENT_LANGUAGE_KEY,
    ];

    // Clear caches from LanguageContext
    const languageContextKeys = ['@translations_cache', '@translations_timestamp', '@language'];

    // Combine all keys to clear
    const allKeys = [...serviceKeys, ...languageContextKeys];

    // Remove all keys
    await AsyncStorage.multiRemove(allKeys);

    logger.info('[TRANSLATIONS] ALL translation caches cleared');
    console.log('[TRANSLATIONS] Cleared all translation caches:', allKeys);
  } catch (error) {
    logger.error('Error clearing all translation caches:', error);
  }
};

/**
 * Utility function to debug translations - logs the current translation cache
 */
export const debugTranslations = async (): Promise<void> => {
  try {
    const enCache = await getCachedTranslations('en');
    const svCache = await getCachedTranslations('sv');
    const versionStr = await AsyncStorage.getItem(TRANSLATION_VERSION_KEY);

    console.log('=== TRANSLATION DEBUG ===');
    console.log('Cache version timestamp:', versionStr);
    console.log('EN cache entries:', enCache ? Object.keys(enCache).length : 0);
    console.log('SV cache entries:', svCache ? Object.keys(svCache).length : 0);

    if (enCache) {
      console.log('Sample EN entries:');
      Object.entries(enCache)
        .slice(0, 5)
        .forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
    }

    console.log('========================');
  } catch (error) {
    logger.error('Error debugging translations:', error);
  }
};
