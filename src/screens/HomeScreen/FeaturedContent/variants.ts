// Shared variant types for FeaturedContent cards (LearningPath and IncompleteFeaturedExercises)

export type FeaturedCardSize = 'large' | 'medium' | 'small' | 'xs';

// Preset variants for common use cases
export type FeaturedCardPreset =
  | 'default' // Medium, all content (current default)
  | 'compact' // Small, title + media only
  | 'minimal' // XS, title only, no media
  | 'media-only' // Small, media only with title
  | 'text-only' // Title + description only, no media
  | 'title-only' // Just title, no media, no description
  | 'grid' // Small, optimized for grid (3-4 visible)
  | 'banner' // Medium, wide banner format (16:9 aspect)
  | 'tall' // Medium, tall portrait format (3:4 aspect)
  | 'square' // Small, square format (1:1 aspect)
  | 'hero'; // Large, Netflix-style (title/text above media)

export interface FeaturedCardVariantProps {
  // Size variants
  size?: FeaturedCardSize;
  // Preset variants (overrides individual props)
  preset?: FeaturedCardPreset;
  // Visibility props - all default to true to maintain current behavior
  showIcon?: boolean; // Show icon and label (Learning Path / Exercise)
  showTitle?: boolean;
  showDescription?: boolean;
  showMedia?: boolean; // Show image/video
  showActionButton?: boolean; // Show "Start Learning" / "Start Exercise" button
  showLockBadges?: boolean; // Show lock/paywall/quiz badges
  // Truncation control - default true
  truncateTitle?: boolean;
  truncateDescription?: boolean;
}

// Size configuration
export interface FeaturedCardSizeConfig {
  cardWidth: number; // Card width based on screen size
  padding: string; // Tamagui padding token
  titleFontSize: string; // Tamagui fontSize token
  descriptionFontSize: string;
  iconSize: number;
  actionIconSize: number;
  gap: string; // Tamagui space token
  mediaAspectRatio?: number; // Optional aspect ratio override
}

// Get size configuration based on size and preset
export const getFeaturedCardSizeConfig = (
  size: FeaturedCardSize = 'medium',
  preset?: FeaturedCardPreset,
): FeaturedCardSizeConfig => {
  const { Dimensions } = require('react-native');
  const screenWidth = Dimensions.get('window').width;

  // Get aspect ratio for preset
  const getAspectRatio = (): number | undefined => {
    if (!preset) return undefined;
    switch (preset) {
      case 'banner':
        return 16 / 9; // Wide banner
      case 'tall':
        return 3 / 4; // Portrait/tall
      case 'square':
        return 1; // Square
      case 'grid':
        return 4 / 3; // 4:3 for grid
      case 'hero':
        return 2 / 3; // Netflix-style tall
      default:
        return undefined;
    }
  };

  const aspectRatio = getAspectRatio();

  switch (size) {
    case 'large':
      return {
        cardWidth: screenWidth * 0.85,
        padding: '$5',
        titleFontSize: '$7',
        descriptionFontSize: '$4',
        iconSize: 24,
        actionIconSize: 18,
        gap: '$4',
        mediaAspectRatio: aspectRatio,
      };
    case 'medium':
      return {
        cardWidth: screenWidth * 0.7,
        padding: '$4',
        titleFontSize: '$5',
        descriptionFontSize: '$3',
        iconSize: 20,
        actionIconSize: 16,
        gap: '$3',
        mediaAspectRatio: aspectRatio,
      };
    case 'small':
      return {
        cardWidth: screenWidth * 0.5,
        padding: '$3',
        titleFontSize: '$4',
        descriptionFontSize: '$2',
        iconSize: 18,
        actionIconSize: 14,
        gap: '$2',
        mediaAspectRatio: aspectRatio,
      };
    case 'xs':
      return {
        cardWidth: screenWidth * 0.4,
        padding: '$2',
        titleFontSize: '$3',
        descriptionFontSize: '$1',
        iconSize: 16,
        actionIconSize: 12,
        gap: '$2',
        mediaAspectRatio: aspectRatio,
      };
  }
};

// Resolve props based on preset (similar to RouteCard)
export const resolveFeaturedCardProps = (
  preset?: FeaturedCardPreset,
  size?: FeaturedCardSize,
  showIcon?: boolean,
  showTitle?: boolean,
  showDescription?: boolean,
  showMedia?: boolean,
  showActionButton?: boolean,
  showLockBadges?: boolean,
): {
  size: FeaturedCardSize;
  showIcon: boolean;
  showTitle: boolean;
  showDescription: boolean;
  showMedia: boolean;
  showActionButton: boolean;
  showLockBadges: boolean;
} => {
  // Start with defaults
  let resolvedSize: FeaturedCardSize = size || 'medium';
  let resolvedShowIcon = showIcon !== undefined ? showIcon : true;
  let resolvedShowTitle = showTitle !== undefined ? showTitle : true;
  let resolvedShowDescription = showDescription !== undefined ? showDescription : true;
  let resolvedShowMedia = showMedia !== undefined ? showMedia : true;
  let resolvedShowActionButton = showActionButton !== undefined ? showActionButton : true;
  let resolvedShowLockBadges = showLockBadges !== undefined ? showLockBadges : true;

  // Apply preset defaults if preset is provided (individual props can override)
  if (preset && preset !== 'default') {
    switch (preset) {
      case 'compact':
        resolvedSize = size || 'small';
        resolvedShowIcon = showIcon !== undefined ? showIcon : true;
        resolvedShowTitle = showTitle !== undefined ? showTitle : true;
        resolvedShowDescription = showDescription !== undefined ? showDescription : false;
        resolvedShowMedia = showMedia !== undefined ? showMedia : true;
        resolvedShowActionButton = showActionButton !== undefined ? showActionButton : false;
        resolvedShowLockBadges = showLockBadges !== undefined ? showLockBadges : true;
        break;
      case 'minimal':
        resolvedSize = size || 'xs';
        resolvedShowIcon = showIcon !== undefined ? showIcon : false;
        resolvedShowTitle = showTitle !== undefined ? showTitle : true;
        resolvedShowDescription = showDescription !== undefined ? showDescription : false;
        resolvedShowMedia = showMedia !== undefined ? showMedia : false;
        resolvedShowActionButton = showActionButton !== undefined ? showActionButton : false;
        resolvedShowLockBadges = showLockBadges !== undefined ? showLockBadges : false;
        break;
      case 'media-only':
        resolvedSize = size || 'small';
        resolvedShowIcon = showIcon !== undefined ? showIcon : false;
        resolvedShowTitle = showTitle !== undefined ? showTitle : true;
        resolvedShowDescription = showDescription !== undefined ? showDescription : false;
        resolvedShowMedia = showMedia !== undefined ? showMedia : true;
        resolvedShowActionButton = showActionButton !== undefined ? showActionButton : false;
        resolvedShowLockBadges = showLockBadges !== undefined ? showLockBadges : true;
        break;
      case 'text-only':
        resolvedSize = size || 'small';
        resolvedShowIcon = showIcon !== undefined ? showIcon : true;
        resolvedShowTitle = showTitle !== undefined ? showTitle : true;
        resolvedShowDescription = showDescription !== undefined ? showDescription : true;
        resolvedShowMedia = showMedia !== undefined ? showMedia : false;
        resolvedShowActionButton = showActionButton !== undefined ? showActionButton : true;
        resolvedShowLockBadges = showLockBadges !== undefined ? showLockBadges : true;
        break;
      case 'title-only':
        resolvedSize = size || 'small';
        resolvedShowIcon = showIcon !== undefined ? showIcon : false;
        resolvedShowTitle = showTitle !== undefined ? showTitle : true;
        resolvedShowDescription = showDescription !== undefined ? showDescription : false;
        resolvedShowMedia = showMedia !== undefined ? showMedia : false;
        resolvedShowActionButton = showActionButton !== undefined ? showActionButton : false;
        resolvedShowLockBadges = showLockBadges !== undefined ? showLockBadges : false;
        break;
      case 'grid':
        resolvedSize = size || 'small';
        resolvedShowIcon = showIcon !== undefined ? showIcon : true;
        resolvedShowTitle = showTitle !== undefined ? showTitle : true;
        resolvedShowDescription = showDescription !== undefined ? showDescription : false;
        resolvedShowMedia = showMedia !== undefined ? showMedia : true;
        resolvedShowActionButton = showActionButton !== undefined ? showActionButton : false;
        resolvedShowLockBadges = showLockBadges !== undefined ? showLockBadges : true;
        break;
      case 'banner':
        resolvedSize = size || 'medium';
        resolvedShowIcon = showIcon !== undefined ? showIcon : true;
        resolvedShowTitle = showTitle !== undefined ? showTitle : true;
        resolvedShowDescription = showDescription !== undefined ? showDescription : false;
        resolvedShowMedia = showMedia !== undefined ? showMedia : true;
        resolvedShowActionButton = showActionButton !== undefined ? showActionButton : true;
        resolvedShowLockBadges = showLockBadges !== undefined ? showLockBadges : true;
        break;
      case 'tall':
        resolvedSize = size || 'medium';
        resolvedShowIcon = showIcon !== undefined ? showIcon : true;
        resolvedShowTitle = showTitle !== undefined ? showTitle : true;
        resolvedShowDescription = showDescription !== undefined ? showDescription : false;
        resolvedShowMedia = showMedia !== undefined ? showMedia : true;
        resolvedShowActionButton = showActionButton !== undefined ? showActionButton : true;
        resolvedShowLockBadges = showLockBadges !== undefined ? showLockBadges : true;
        break;
      case 'square':
        resolvedSize = size || 'small';
        resolvedShowIcon = showIcon !== undefined ? showIcon : true;
        resolvedShowTitle = showTitle !== undefined ? showTitle : true;
        resolvedShowDescription = showDescription !== undefined ? showDescription : false;
        resolvedShowMedia = showMedia !== undefined ? showMedia : true;
        resolvedShowActionButton = showActionButton !== undefined ? showActionButton : false;
        resolvedShowLockBadges = showLockBadges !== undefined ? showLockBadges : true;
        break;
      case 'hero':
        resolvedSize = size || 'large';
        resolvedShowIcon = showIcon !== undefined ? showIcon : true;
        resolvedShowTitle = showTitle !== undefined ? showTitle : true;
        resolvedShowDescription = showDescription !== undefined ? showDescription : true;
        resolvedShowMedia = showMedia !== undefined ? showMedia : true;
        resolvedShowActionButton = showActionButton !== undefined ? showActionButton : true;
        resolvedShowLockBadges = showLockBadges !== undefined ? showLockBadges : true;
        break;
    }
  }

  return {
    size: resolvedSize,
    showIcon: resolvedShowIcon,
    showTitle: resolvedShowTitle,
    showDescription: resolvedShowDescription,
    showMedia: resolvedShowMedia,
    showActionButton: resolvedShowActionButton,
    showLockBadges: resolvedShowLockBadges,
  };
};

