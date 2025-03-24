import { OnboardingSlide } from '../components/Onboarding';
import { ContentItem, Language } from '../services/contentService';

/**
 * Adapter function to convert ContentItem to OnboardingSlide
 * This allows the new content structure to work with the existing Onboarding component
 */
export const contentItemToOnboardingSlide = (
  contentItem: ContentItem, 
  defaultImage: any = require('../../assets/images/default-onboarding.png')
): OnboardingSlide => {
  return {
    id: contentItem.id,
    title_en: contentItem.title.en,
    title_sv: contentItem.title.sv,
    text_en: contentItem.body.en,
    text_sv: contentItem.body.sv,
    image: contentItem.image_url 
      ? { uri: contentItem.image_url } 
      : defaultImage,
    icon: contentItem.icon || undefined,
    iconColor: contentItem.icon_color || undefined,
  };
};

/**
 * Convert an array of ContentItems to OnboardingSlides
 */
export const contentItemsToOnboardingSlides = (
  contentItems: ContentItem[],
  defaultImage: any = require('../../assets/images/default-onboarding.png')
): OnboardingSlide[] => {
  return contentItems.map(item => contentItemToOnboardingSlide(item, defaultImage));
};

/**
 * Helper function to extract text in the correct language from a ContentItem
 */
export const getContentItemText = (
  contentItem: ContentItem, 
  field: 'title' | 'body',
  language: Language = 'en'
): string => {
  if (!contentItem) return '';
  return contentItem[field][language] || contentItem[field]['en'] || '';
};

/**
 * Helper function to extract text in the preferred language from a record
 * Falls back to English if the preferred language is not available
 */
export const getTextInPreferredLanguage = (
  textRecord: Record<string, string> | undefined,
  language: string = 'en'
): string => {
  if (!textRecord) return '';
  return textRecord[language] || textRecord['en'] || '';
}; 