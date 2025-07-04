import { OnboardingSlide } from '../components/Onboarding';
import { ContentItem, Language } from '../services/contentService';

/**
 * Adapter function to convert ContentItem to OnboardingSlide
 * This allows the new content structure to work with the existing Onboarding component
 */
export const contentItemToOnboardingSlide = (
  contentItem: ContentItem,
  defaultImage: any = require('../../assets/images/default-onboarding.png'),
): OnboardingSlide => {
  // Safely handle image URL
  const hasValidImageUrl =
    contentItem.image_url &&
    typeof contentItem.image_url === 'string' &&
    contentItem.image_url.trim().length > 0;

  // Safely handle icon
  const hasValidIcon =
    contentItem.icon && typeof contentItem.icon === 'string' && contentItem.icon.trim().length > 0;

  // Safely handle SVG
  const hasValidSvg =
    contentItem.icon_svg &&
    typeof contentItem.icon_svg === 'string' &&
    contentItem.icon_svg.trim().length > 0;

  // Safely handle embeds
  const hasValidYouTube =
    contentItem.youtube_embed &&
    typeof contentItem.youtube_embed === 'string' &&
    contentItem.youtube_embed.trim().length > 0;
  const hasValidIframe =
    contentItem.iframe_embed &&
    typeof contentItem.iframe_embed === 'string' &&
    contentItem.iframe_embed.trim().length > 0;

  return {
    id: contentItem.id,
    title_en: contentItem.title.en || '',
    title_sv: contentItem.title.sv || '',
    text_en: contentItem.body.en || '',
    text_sv: contentItem.body.sv || '',
    image_url: hasValidImageUrl ? contentItem.image_url : undefined,
    image:
      !hasValidImageUrl && !hasValidIcon && !hasValidSvg && !hasValidYouTube && !hasValidIframe
        ? defaultImage
        : undefined,
    icon: hasValidIcon ? contentItem.icon : undefined,
    iconColor: contentItem.icon_color || undefined,
    iconSvg: hasValidSvg ? contentItem.icon_svg : undefined,
    youtube_embed: hasValidYouTube ? contentItem.youtube_embed : undefined,
    iframe_embed: hasValidIframe ? contentItem.iframe_embed : undefined,
    media_type: contentItem.media_type || 'image',
    media_enabled: contentItem.media_enabled !== false, // Default to true if not specified
  };
};

/**
 * Convert an array of ContentItems to OnboardingSlides
 */
export const contentItemsToOnboardingSlides = (
  contentItems: ContentItem[],
  defaultImage: any = require('../../assets/images/default-onboarding.png'),
): OnboardingSlide[] => {
  if (!contentItems || !Array.isArray(contentItems)) {
    console.warn('Invalid content items provided to adapter, returning empty array');
    return [];
  }

  return contentItems.map((item) => contentItemToOnboardingSlide(item, defaultImage));
};

/**
 * Helper function to extract text in the correct language from a ContentItem
 */
export const getContentItemText = (
  contentItem: ContentItem,
  field: 'title' | 'body',
  language: Language = 'en',
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
  language: string = 'en',
): string => {
  if (!textRecord) return '';
  return textRecord[language] || textRecord['en'] || '';
};
