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

/**
 * Fetches translations from Supabase for a specific language
 */
export const fetchTranslations = async (language: Language = 'en'): Promise<Record<string, string>> => {
  try {
    // First try to get cached translations
    const cachedTranslations = await getCachedTranslations(language);
    if (cachedTranslations) {
      return cachedTranslations;
    }

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

    // Convert to record for easy lookup
    const translations: Record<string, string> = {};
    data?.forEach(item => {
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
export const getCachedTranslations = async (language: Language): Promise<Record<string, string> | null> => {
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
export const cacheTranslations = async (language: Language, translations: Record<string, string>): Promise<void> => {
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
      TRANSLATION_VERSION_KEY
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
    const currentLanguage = language || await getCurrentLanguage();
    
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
export const getTranslations = async (keys: string[], language?: Language): Promise<Record<string, string>> => {
  try {
    // If language not provided, get the current language
    const currentLanguage = language || await getCurrentLanguage();
    
    // Get translations for the language
    const translations = await fetchTranslations(currentLanguage);
    
    // Filter to only the requested keys
    const result: Record<string, string> = {};
    keys.forEach(key => {
      result[key] = translations[key] || key;
    });
    
    return result;
  } catch (error) {
    logger.error('Error getting translations:', error);
    
    // Return keys as values as fallback
    const result: Record<string, string> = {};
    keys.forEach(key => {
      result[key] = key;
    });
    
    return result;
  }
}; 