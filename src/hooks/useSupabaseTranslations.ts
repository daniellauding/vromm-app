import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../contexts/TranslationContext';
import { Platform } from 'react-native';

// Type definitions
interface Translation {
  id?: string;
  key: string;
  language: string;
  value: string;
  platform?: string;
}

// Hook for loading translations from Supabase
export function useSupabaseTranslations() {
  const { language, refreshTranslations } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [translationMap, setTranslationMap] = useState<Record<string, string>>({});
  const [error, setError] = useState<Error | null>(null);

  // Function to load translations from Supabase
  const loadTranslations = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`[TRANSLATIONS] Loading translations for ${language} (force: ${forceRefresh})`);

      // Get platform-specific translation filter
      const currentPlatform = Platform.OS === 'web' ? 'web' : 'mobile';

      // Query Supabase for translations
      const { data, error } = await supabase
        .from('translations')
        .select('*')
        .eq('language', language)
        .or(`platform.is.null,platform.eq.${currentPlatform}`);

      if (error) {
        throw new Error(`Failed to fetch translations: ${error.message}`);
      }

      // Process and store translations
      const translations: Record<string, string> = {};
      if (data) {
        data.forEach((item: Translation) => {
          translations[item.key] = item.value;
        });
      }

      setTranslationMap(translations);
      console.log(`[TRANSLATIONS] Loaded ${Object.keys(translations).length} translations`);
    } catch (err) {
      console.error('Error loading translations:', err);
      setError(err instanceof Error ? err : new Error('Failed to load translations'));
    } finally {
      setIsLoading(false);
    }
  }, [language]);

  // Load translations initially and when language changes
  useEffect(() => {
    loadTranslations();
  }, [loadTranslations]);

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('translations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'translations'
        },
        (payload) => {
          console.log('[TRANSLATIONS] Translation update detected:', payload);
          // Only reload if it matches our current language
          if (payload.new && (payload.new as any).language === language) {
            console.log('[TRANSLATIONS] Updating translations for current language');
            loadTranslations(true);
            refreshTranslations(); // Also refresh the global translations
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [language, loadTranslations, refreshTranslations]);

  return {
    translations: translationMap,
    isLoading,
    error,
    refresh: () => loadTranslations(true)
  };
} 