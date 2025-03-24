import { supabase } from '../services/supabaseService';
import { upsertContent, ContentItem, ContentType, PlatformType } from '../services/contentService';
import { SupabaseOnboardingSlide } from '../services/onboardingService';

/**
 * Migration utility to move onboarding slides from the legacy onboarding_slides table
 * to the new content table structure.
 */

/**
 * Fetches all slides from the legacy onboarding_slides table
 */
export async function fetchLegacyOnboardingSlides(): Promise<SupabaseOnboardingSlide[]> {
  try {
    const { data, error } = await supabase
      .from('onboarding_slides')
      .select('*')
      .eq('active', true)
      .order('sequence', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist, return empty array
        console.warn('Legacy onboarding_slides table does not exist');
        return [];
      }
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching legacy onboarding slides:', error);
    return [];
  }
}

/**
 * Converts a legacy onboarding slide to the new content format
 */
export function convertSlideToContent(slide: SupabaseOnboardingSlide): ContentItem {
  // Generate a key based on the title (or id if title is missing)
  const key = slide.title_en 
    ? `onboarding_${slide.title_en.toLowerCase().replace(/\s+/g, '_')}`
    : `onboarding_slide_${slide.id}`;

  return {
    id: `${slide.id}`, // Convert to string if it's a number
    key,
    content_type: ContentType.ONBOARDING,
    platforms: [PlatformType.ALL],
    active: true,
    sequence: slide.sequence || 0,
    title: {
      en: slide.title_en || '',
      de: slide.title_de || '',
      fr: slide.title_fr || '',
    },
    body: {
      en: slide.text_en || '',
      de: slide.text_de || '',
      fr: slide.text_fr || '',
    },
    image_url: slide.image_url || '',
    created_at: slide.created_at,
    updated_at: slide.updated_at,
    style: {
      textColor: slide.text_color || '#000000',
      backgroundColor: slide.background_color || '#FFFFFF',
      textAlign: slide.text_align || 'center',
    }
  };
}

/**
 * Migrates all onboarding slides from the legacy table to the new content table
 */
export async function migrateOnboardingSlides(): Promise<{
  success: boolean;
  migratedCount: number;
  error?: any;
}> {
  try {
    // Fetch legacy slides
    const legacySlides = await fetchLegacyOnboardingSlides();
    
    if (legacySlides.length === 0) {
      console.log('No legacy slides found to migrate');
      return { success: true, migratedCount: 0 };
    }

    // Convert and insert each slide
    const results = await Promise.all(
      legacySlides.map(async (slide) => {
        const contentItem = convertSlideToContent(slide);
        return upsertContent(contentItem);
      })
    );

    // Count successful migrations
    const migratedCount = results.filter(result => result.success).length;

    return {
      success: migratedCount > 0,
      migratedCount,
      error: migratedCount < legacySlides.length ? 'Some slides failed to migrate' : undefined
    };
  } catch (error) {
    console.error('Error during onboarding slide migration:', error);
    return {
      success: false,
      migratedCount: 0,
      error
    };
  }
}

/**
 * Checks if there are any onboarding slides in the content table
 */
export async function hasOnboardingContent(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('content')
      .select('id')
      .eq('content_type', ContentType.ONBOARDING)
      .eq('active', true)
      .limit(1);

    if (error) {
      console.error('Error checking for onboarding content:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking for onboarding content:', error);
    return false;
  }
}

/**
 * Helper function to migrate content if needed
 * This checks if migration is needed and performs it if so
 */
export async function migrateContentIfNeeded(): Promise<{
  migrationNeeded: boolean;
  migrationPerformed: boolean;
  migrationSuccess?: boolean;
  migratedCount?: number;
  error?: any;
}> {
  try {
    // First check if we already have onboarding content
    const hasContent = await hasOnboardingContent();
    
    // If we already have content, no migration needed
    if (hasContent) {
      return { migrationNeeded: false, migrationPerformed: false };
    }
    
    // Check if we have legacy slides
    const legacySlides = await fetchLegacyOnboardingSlides();
    
    if (legacySlides.length === 0) {
      // No legacy slides and no new content - migration was needed but nothing to migrate
      return { migrationNeeded: true, migrationPerformed: false };
    }
    
    // Perform migration
    const result = await migrateOnboardingSlides();
    
    return {
      migrationNeeded: true,
      migrationPerformed: true,
      migrationSuccess: result.success,
      migratedCount: result.migratedCount,
      error: result.error
    };
  } catch (error) {
    console.error('Error in migrateContentIfNeeded:', error);
    return {
      migrationNeeded: true,
      migrationPerformed: false,
      error
    };
  }
} 