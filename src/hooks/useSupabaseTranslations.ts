import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Language, translations as staticTranslations } from '../i18n/translations';
import { useLanguage } from '../context/LanguageContext';

// Keys for AsyncStorage
const TRANSLATIONS_CACHE_KEY = '@translations_cache';
const TRANSLATIONS_TIMESTAMP_KEY = '@translations_timestamp';

// Cache refresh interval in milliseconds (1 hour)
const CACHE_REFRESH_INTERVAL = 60 * 60 * 1000;

// Type for database translations
interface DbTranslation {
  id: string;
  key: string;
  language: Language;
  value: string;
}

/**
 * Hook to fetch and use dynamic translations from Supabase
 * Merges with static translations and provides live updates
 */
export function useSupabaseTranslations() {
  const { language } = useLanguage();
  const [dynamicTranslations, setDynamicTranslations] = useState<Record<string, Record<string, string>>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Function to fetch translations from Supabase
  const fetchTranslations = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if we have cached translations and they're still fresh
      if (!forceRefresh) {
        const cachedTimestamp = await AsyncStorage.getItem(TRANSLATIONS_TIMESTAMP_KEY);
        const cachedTranslations = await AsyncStorage.getItem(TRANSLATIONS_CACHE_KEY);
        
        if (cachedTimestamp && cachedTranslations) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const now = Date.now();
          
          // If cache is still fresh, use it
          if (now - timestamp < CACHE_REFRESH_INTERVAL) {
            const parsedTranslations = JSON.parse(cachedTranslations);
            setDynamicTranslations(parsedTranslations);
            setIsLoading(false);
            return;
          }
        }
      }

      // Fetch translations from Supabase
      const { data, error } = await supabase
        .from('translations')
        .select('id, key, language, value');

      if (error) {
        throw error;
      }

      // Transform to nested structure: { key: { en: "value", sv: "value" } }
      const translationsMap: Record<string, Record<string, string>> = {};
      
      if (data) {
        (data as DbTranslation[]).forEach(item => {
          if (!translationsMap[item.key]) {
            translationsMap[item.key] = {};
          }
          translationsMap[item.key][item.language] = item.value;
        });
      }

      // Update state and cache
      setDynamicTranslations(translationsMap);
      await AsyncStorage.setItem(TRANSLATIONS_CACHE_KEY, JSON.stringify(translationsMap));
      await AsyncStorage.setItem(TRANSLATIONS_TIMESTAMP_KEY, Date.now().toString());
    } catch (err) {
      console.error('Failed to fetch translations:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch translations'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Subscribe to changes in the translations table
  useEffect(() => {
    fetchTranslations();

    // Set up real-time subscription
    const subscription = supabase
      .channel('translations_changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'translations' 
        },
        () => {
          console.log('Translations changed, refreshing...');
          fetchTranslations(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchTranslations]);

  /**
   * Get translation by key, checking dynamic translations first, then falling back to static
   */
  const getTranslation = useCallback(
    (key: string): string => {
      const parts = key.split('.');
      const rootKey = parts[0];
      
      // Check if we have this key in dynamic translations
      if (dynamicTranslations[key] && dynamicTranslations[key][language]) {
        return dynamicTranslations[key][language];
      }
      
      // If not found, fall back to static translations
      let value: any = staticTranslations[language];
      
      for (const part of parts) {
        value = value?.[part];
        if (value === undefined) {
          return key; // Key not found
        }
      }
      
      return typeof value === 'string' ? value : key;
    },
    [dynamicTranslations, language]
  );

  // Force refresh translations
  const refreshTranslations = useCallback(() => {
    return fetchTranslations(true);
  }, [fetchTranslations]);

  return {
    getTranslation,
    refreshTranslations,
    isLoading,
    error
  };
} 