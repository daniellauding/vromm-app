import { fetchContentByType, fetchContentByKey, ContentType, Language } from './contentService';
import { getTextInPreferredLanguage } from '../adapters/contentAdapter';

// Cache for auth strings
let authStringsCache: Record<string, Record<string, string>> | null = null;
let lastLanguage: Language | null = null;

/**
 * Fetch all auth strings and cache them
 */
export async function fetchAuthStrings(language: Language = 'en'): Promise<Record<string, string>> {
  try {
    // If we already have the cache for this language, return it
    if (authStringsCache && lastLanguage === language) {
      return mapAuthStringsToKeys(authStringsCache, language);
    }

    // Fetch all auth content
    const authContent = await fetchContentByType(ContentType.AUTH);

    // Build a cache with key -> multilingual content mapping
    const cache: Record<string, Record<string, string>> = {};
    authContent.forEach((item) => {
      // Remove the 'auth_' prefix from keys for cleaner access
      const key = item.key.replace(/^auth_/, '');

      // Store the title field (this is where the main text is)
      cache[key] = item.title;

      // If there's body content, store it with a _body suffix
      if (item.body && Object.keys(item.body).some((lang) => item.body[lang])) {
        cache[`${key}_body`] = item.body;
      }
    });

    // Update cache
    authStringsCache = cache;
    lastLanguage = language;

    // Return the mapped keys
    return mapAuthStringsToKeys(cache, language);
  } catch (error) {
    console.error('Error fetching auth strings:', error);
    return getFallbackAuthStrings();
  }
}

/**
 * Map the cached multilingual content to simple key-value pairs for the specified language
 */
function mapAuthStringsToKeys(
  cache: Record<string, Record<string, string>>,
  language: Language,
): Record<string, string> {
  const result: Record<string, string> = {};

  Object.entries(cache).forEach(([key, translations]) => {
    result[key] = getTextInPreferredLanguage(translations, language);
  });

  return result;
}

/**
 * Get a specific auth string by key
 */
export async function getAuthString(key: string, language: Language = 'en'): Promise<string> {
  // Try to get from cache first
  if (authStringsCache && lastLanguage === language) {
    const cleanKey = key.replace(/^auth_/, '');
    const translations = authStringsCache[cleanKey];
    if (translations) {
      return getTextInPreferredLanguage(translations, language);
    }
  }

  try {
    // If not in cache, fetch directly
    const content = await fetchContentByKey(`auth_${key}`);
    if (content && content.title) {
      return getTextInPreferredLanguage(content.title, language);
    }
    return getFallbackAuthString(key);
  } catch (error) {
    console.error(`Error fetching auth string for key ${key}:`, error);
    return getFallbackAuthString(key);
  }
}

/**
 * Clear the auth strings cache
 */
export function clearAuthStringsCache(): void {
  authStringsCache = null;
  lastLanguage = null;
}

/**
 * Get fallback auth strings for when the fetch fails
 */
function getFallbackAuthStrings(): Record<string, string> {
  return {
    welcome_title: 'Time to find a new exercise route',
    sign_in_button: 'Sign In',
    create_account_button: 'Create Account',
    read_more_button: 'Read more about Vromm',
    for_learners: 'For Learners',
    for_schools: 'For Schools',
    help_driver_training: 'Help Us Improve Driver Training',
    signup_title: 'Create Account',
    signup_email_label: 'Email',
    login_title: 'Sign In',
    forgot_password: 'Forgot Password?',
    reset_password_title: 'Reset Password',
    reset_password_button: 'Reset Password',
    back_to_login: 'Back to Login',
  };
}

/**
 * Get a fallback string for a specific key
 */
function getFallbackAuthString(key: string): string {
  const cleanKey = key.replace(/^auth_/, '');
  const fallbacks = getFallbackAuthStrings();
  return fallbacks[cleanKey] || cleanKey;
}
