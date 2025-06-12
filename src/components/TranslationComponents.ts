/**
 * Translation-aware components for easy use throughout the app
 */

export { AuthTitle } from './AuthTitle';
export { AuthButton } from './AuthButton';

// Re-export the translation hook for convenience
export { useT } from '../hooks/useT';
export { useTranslation } from '../contexts/TranslationContext';

// Re-export translation service utilities
export {
  getCurrentLanguage,
  setCurrentLanguage,
  clearTranslationCache,
  checkTranslationsVersion,
} from '../services/translationService';
