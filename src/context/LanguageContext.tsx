import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, translations } from '../i18n/translations';
import { NativeModules, Platform } from 'react-native';
import { supabase } from '../lib/supabase';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
  refreshTranslations: () => Promise<void>;
};

// Type for database translations
interface DbTranslation {
  id: string;
  key: string;
  language: Language;
  value: string;
}

// Cache keys
const LANGUAGE_STORAGE_KEY = '@language';
const TRANSLATIONS_CACHE_KEY = '@translations_cache';
const TRANSLATIONS_TIMESTAMP_KEY = '@translations_timestamp';

// Cache refresh interval in milliseconds (1 hour)
const CACHE_REFRESH_INTERVAL = 60 * 60 * 1000;

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

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
  const [dynamicTranslations, setDynamicTranslations] = useState<
    Record<string, Record<string, string>>
  >({});

  // Function to fetch translations from Supabase
  const fetchTranslations = useCallback(async (forceRefresh = false) => {
    try {
      console.log('[TRANSLATIONS] Fetching translations, forceRefresh:', forceRefresh);

      // Check if we have cached translations and they're still fresh
      if (!forceRefresh) {
        const cachedTimestamp = await AsyncStorage.getItem(TRANSLATIONS_TIMESTAMP_KEY);
        const cachedTranslations = await AsyncStorage.getItem(TRANSLATIONS_CACHE_KEY);

        if (cachedTimestamp && cachedTranslations) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const now = Date.now();

          // If cache is still fresh, use it
          if (now - timestamp < CACHE_REFRESH_INTERVAL) {
            console.log(
              '[TRANSLATIONS] Using cached translations, cache age:',
              now - timestamp,
              'ms',
            );
            const parsedTranslations = JSON.parse(cachedTranslations);
            setDynamicTranslations(parsedTranslations);
            return;
          }
          console.log('[TRANSLATIONS] Cache expired, fetching fresh translations');
        } else {
          console.log('[TRANSLATIONS] No cached translations found');
        }
      } else {
        console.log('[TRANSLATIONS] Force refreshing translations');
      }

      // Fetch translations from Supabase
      const { data, error } = await supabase
        .from('translations')
        .select('id, key, language, value');

      if (error) {
        console.error('[TRANSLATIONS] Error fetching translations:', error);
        throw error;
      }

      console.log('[TRANSLATIONS] Fetched', data?.length, 'translations from Supabase');

      // Transform to nested structure: { key: { en: "value", sv: "value" } }
      const translationsMap: Record<string, Record<string, string>> = {};

      if (data) {
        (data as DbTranslation[]).forEach((item) => {
          if (!translationsMap[item.key]) {
            translationsMap[item.key] = {};
          }
          translationsMap[item.key][item.language] = item.value;
        });
      }

      // Update state and cache
      setDynamicTranslations(translationsMap);

      // Clear the old cache
      await AsyncStorage.removeItem(TRANSLATIONS_CACHE_KEY);
      await AsyncStorage.removeItem(TRANSLATIONS_TIMESTAMP_KEY);

      // Save the new cache
      await AsyncStorage.setItem(TRANSLATIONS_CACHE_KEY, JSON.stringify(translationsMap));
      await AsyncStorage.setItem(TRANSLATIONS_TIMESTAMP_KEY, Date.now().toString());

      console.log('[TRANSLATIONS] Updated translations cache with timestamp:', Date.now());
    } catch (err) {
      console.error('[TRANSLATIONS] Failed to fetch translations:', err);
    }
  }, []);

  // Load language preference and translations
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Load saved language preference or get device language
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

        if (savedLanguage === 'en' || savedLanguage === 'sv') {
          setLanguageState(savedLanguage);
        } else {
          const deviceLang = getDeviceLanguage();
          setLanguageState(deviceLang);
        }

        // Load translations
        await fetchTranslations();
      } catch (error) {
        console.error('Error loading language data:', error);
        setLanguageState('sv'); // Default to Swedish on error
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();

    // Set up real-time subscription for translations
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
          console.log('[TRANSLATIONS] Received real-time update:', payload);
          fetchTranslations(true);
        },
      )
      .subscribe();

    console.log('[TRANSLATIONS] Set up real-time subscription');

    // Also set up a periodic refresh every 5 minutes
    const refreshInterval = setInterval(
      () => {
        console.log('[TRANSLATIONS] Checking for translation updates (periodic)');
        fetchTranslations(true);
      },
      5 * 60 * 1000,
    ); // 5 minutes

    return () => {
      supabase.removeChannel(subscription);
      clearInterval(refreshInterval);
    };
  }, [fetchTranslations]);

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  };

  const t = useCallback(
    (key: string) => {
      // First check if key exists in dynamic translations
      if (dynamicTranslations[key] && dynamicTranslations[key][language]) {
        return dynamicTranslations[key][language];
      }

      // If not found, fall back to static translations
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
    },
    [language, dynamicTranslations],
  );

  const refreshTranslations = useCallback(() => {
    console.log('[TRANSLATIONS] Manually refreshing translations from LanguageContext');
    // Force a full refresh by removing cache files first
    const clearCaches = async () => {
      try {
        // Clear the cache files
        await AsyncStorage.removeItem(TRANSLATIONS_CACHE_KEY);
        await AsyncStorage.removeItem(TRANSLATIONS_TIMESTAMP_KEY);
        console.log('[TRANSLATIONS] LanguageContext cache files cleared before refresh');
      } catch (err) {
        console.error('[TRANSLATIONS] Error clearing caches:', err);
      }
    };

    return clearCaches().then(() => fetchTranslations(true));
  }, [fetchTranslations]);

  if (isLoading) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, refreshTranslations }}>
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
