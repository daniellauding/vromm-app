import { useTranslation } from '../contexts/TranslationContext';
import { Language } from '../services/translationService';

/**
 * A simple hook for using translations in components.
 * @returns A translation function (t)
 *
 * @example
 * ```tsx
 * const t = useT();
 * return <Text>{t('auth.welcome')}</Text>;
 * ```
 */
export const useT = () => {
  const { t } = useTranslation();
  return t;
};

export default useT;
