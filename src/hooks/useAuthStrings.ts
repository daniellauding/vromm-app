import { useState, useEffect, useCallback } from 'react';
import { fetchAuthStrings, getAuthString, clearAuthStringsCache } from '../services/authStrings';
import { useTranslation } from '../contexts/TranslationContext';
import { onContentChange, ContentType } from '../services/contentService';

/**
 * Hook to provide auth-related strings with automatic language support
 * and real-time updates from the admin panel
 */
export function useAuthStrings() {
  const { language } = useTranslation();
  const [strings, setStrings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load all auth strings
  const loadStrings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedStrings = await fetchAuthStrings(language);
      setStrings(loadedStrings);
    } catch (err) {
      console.error('Error loading auth strings:', err);
      setError(err instanceof Error ? err : new Error('Failed to load auth strings'));
    } finally {
      setLoading(false);
    }
  }, [language]);

  // Load strings initially and when language changes
  useEffect(() => {
    loadStrings();
  }, [loadStrings]);

  // Subscribe to content changes for auth content
  useEffect(() => {
    const unsubscribe = onContentChange((contentType) => {
      if (!contentType || contentType === ContentType.AUTH) {
        console.log('Auth content changed, refreshing...');
        clearAuthStringsCache();
        loadStrings();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [loadStrings]);

  /**
   * Get a specific auth string by key
   */
  const getString = useCallback(
    (key: string, fallback?: string): string => {
      // Try to get from already loaded strings
      const cleanKey = key.replace(/^auth_/, '');
      if (strings[cleanKey]) {
        return strings[cleanKey];
      }

      // Return fallback if provided
      if (fallback !== undefined) {
        return fallback;
      }

      // Return key as fallback
      return cleanKey;
    },
    [strings],
  );

  return {
    strings,
    getString,
    loading,
    error,
    refresh: loadStrings,
  };
}
