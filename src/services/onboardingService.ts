import { supabase } from '../lib/supabase';
import { OnboardingSlide } from '../components/Onboarding';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchContentByType, ContentType } from './contentService';
import { contentItemsToOnboardingSlides } from '../adapters/contentAdapter';

// Legacy database slide structure removed - now using content promotion system

// Content version key in AsyncStorage
const ONBOARDING_CONTENT_HASH_KEY = 'onboarding_content_hash';
const ONBOARDING_KEY = 'vromm_onboarding';
const FIRST_LOGIN_KEY = 'vromm_first_login';

/**
 * Check if a user should see the onboarding for the first time.
 * This is separate from content change detection.
 */
export const shouldShowFirstOnboarding = async (): Promise<boolean> => {
  try {
    // Check if this is the first login
    const firstLogin = await AsyncStorage.getItem(FIRST_LOGIN_KEY);

    // If this is the first login, show onboarding
    if (firstLogin === null) {
      try {
        // Mark that it's no longer the first login
        await AsyncStorage.setItem(FIRST_LOGIN_KEY, 'false');
        // Return true to show onboarding
        return true;
      } catch (storageError) {
        console.error('Error setting first login flag:', storageError);
        // Continue with the check even if setting the flag failed
      }
    }

    // Otherwise, check if onboarding should be shown based on regular rules
    try {
      const onboardingStatus = await AsyncStorage.getItem(ONBOARDING_KEY);
      // If onboarding_key is null or "true", show onboarding
      return onboardingStatus === null || onboardingStatus === 'true';
    } catch (onboardingError) {
      console.error('Error checking onboarding status:', onboardingError);
      // Default to NOT showing onboarding on secondary error, to prevent potential loops
      return false;
    }
  } catch (error) {
    console.error('Error checking first onboarding status:', error);
    // Default to NOT showing onboarding if there's a critical error
    return false;
  }
};

// Fetch all active onboarding slides
export const fetchOnboardingSlides = async (): Promise<OnboardingSlide[]> => {
  try {
    // First check if we should show onboarding at all
    const shouldShow = await shouldShowFirstOnboarding();
    console.log('Should show onboarding?', shouldShow);

    if (!shouldShow) {
      console.log('Onboarding not needed, returning empty slides');
      return [];
    }

    // Use promotion content type for onboarding slides
    try {
      const contentItems = await fetchContentByType(ContentType.PROMOTION, 'mobile');

      if (contentItems && contentItems.length > 0) {
        console.log('Using promotion content for onboarding slides');

        // Convert content items to onboarding slides using adapter
        const slides = contentItemsToOnboardingSlides(contentItems);

        // Check if content has changed (using simplified version for new content)
        await checkContentVersionSimple(contentItems);

        return slides;
      }

      // If no content found, log and return empty array (no fallback)
      console.warn('No promotion content found for onboarding');
      return [];
    } catch (contentError) {
      console.error('Error fetching promotion-based onboarding:', contentError);
      return [];
    }
  } catch (error) {
    console.error('Error in fetchOnboardingSlides:', error);
    return [];
  }
};

// Simplified content version check for the new content structure
async function checkContentVersionSimple(contentItems: any[]) {
  try {
    if (!contentItems || contentItems.length === 0) {
      console.warn('No content items provided to checkContentVersionSimple');
      return;
    }

    // Create a simple content hash based on content IDs and update times
    const contentHash = contentItems
      .map((item) => `${item.id}-${item.updated_at || 'unknown'}`)
      .join('|');

    // Get the stored hash
    const storedHash = await AsyncStorage.getItem(ONBOARDING_CONTENT_HASH_KEY);

    // If hash has changed and this is not the first run (storedHash exists),
    // we should reset the onboarding flag to show again
    if (storedHash !== contentHash) {
      console.log('Onboarding content hash changed:', {
        storedHash,
        newHash: contentHash,
      });

      try {
        // Store the new hash
        await AsyncStorage.setItem(ONBOARDING_CONTENT_HASH_KEY, contentHash);
      } catch (storageError) {
        console.error('Error storing content hash:', storageError);
      }

      // Only reset onboarding if:
      // 1. We had a previous hash (not first time)
      // 2. User has already completed onboarding before (ONBOARDING_KEY exists)
      if (storedHash !== null) {
        try {
          // Check if user has completed onboarding before resetting
          const onboardingStatus = await AsyncStorage.getItem(ONBOARDING_KEY);
          // Only reset if user has completed onboarding before (not null or "true")
          if (onboardingStatus !== null && onboardingStatus !== 'true') {
            console.log('Onboarding was previously completed. Resetting for content update.');
            // This will force onboarding to show again on next check
            await AsyncStorage.removeItem(ONBOARDING_KEY);
          }
        } catch (statusError) {
          console.error('Error checking onboarding status:', statusError);
        }
      }
    }
  } catch (error) {
    console.error('Error checking content version:', error);
    // Fail silently to prevent app crashes
  }
}

// Legacy function removed - now using content promotion system only

// Static fallback slides removed - now using content promotion system exclusively

// ============= Onboarding Reset Functions for Testing and A/B Testing =============

/**
 * Reset onboarding for the current user (client-side only)
 * Use this for quick testing on your own device
 */
export const resetOnboardingForCurrentUser = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    await AsyncStorage.removeItem(ONBOARDING_CONTENT_HASH_KEY);
    await AsyncStorage.removeItem(FIRST_LOGIN_KEY);
    console.log('Onboarding reset for current user');
    return Promise.resolve();
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    return Promise.reject(error);
  }
};

/**
 * Reset onboarding for a specific user in the database
 * This requires admin access and can be used for targeted testing
 */
export const resetOnboardingForUser = async (userId: string): Promise<void> => {
  try {
    // Create or update user_settings record for this user
    const { error } = await supabase.from('user_settings').upsert(
      {
        user_id: userId,
        settings: {
          onboarding_completed: false,
          onboarding_last_shown: null,
          onboarding_version: 0,
        },
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
        // These are the columns that will be updated
        ignoreDuplicates: false,
      },
    );

    if (error) throw error;
    console.log(`Onboarding reset for user ${userId}`);
    return Promise.resolve();
  } catch (error) {
    console.error('Error resetting onboarding for user:', error);
    return Promise.reject(error);
  }
};

/**
 * Reset onboarding for all users (admin only)
 * Useful for major app changes or A/B testing an entire onboarding flow
 */
export const resetOnboardingForAllUsers = async (): Promise<void> => {
  try {
    // This SQL updates the onboarding settings for all users
    // Note: This requires direct database access or a Supabase function with appropriate permissions
    const { error } = await supabase.rpc('reset_all_users_onboarding');

    if (error) throw error;
    console.log('Onboarding reset for all users');
    return Promise.resolve();
  } catch (error) {
    console.error('Error resetting onboarding for all users:', error);
    return Promise.reject(error);
  }
};

/**
 * Create a new A/B test group for onboarding
 * Randomly assigns users to show or not show onboarding
 */
export const createOnboardingABTest = async (
  testName: string,
  percentage: number = 50, // Default to 50% of users seeing the new onboarding
): Promise<void> => {
  try {
    // Create A/B test record
    const { error } = await supabase.from('ab_tests').insert({
      name: testName,
      feature: 'onboarding',
      percentage,
      active: true,
      created_at: new Date().toISOString(),
    });

    if (error) throw error;
    console.log(`A/B test "${testName}" created with ${percentage}% users seeing new onboarding`);
    return Promise.resolve();
  } catch (error) {
    console.error('Error creating onboarding A/B test:', error);
    return Promise.reject(error);
  }
};

/**
 * Check if a user should be included in an A/B test
 * This uses a deterministic algorithm based on user ID
 */
export const shouldShowOnboardingForABTest = async (
  userId: string,
  testName: string,
): Promise<boolean> => {
  try {
    // Get the active A/B test
    const { data, error } = await supabase
      .from('ab_tests')
      .select('percentage')
      .eq('name', testName)
      .eq('feature', 'onboarding')
      .eq('active', true)
      .single();

    if (error) throw error;

    if (!data) {
      // No active test found
      return false;
    }

    // Simple hashing algorithm to consistently assign users to test groups
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = (hash << 5) - hash + userId.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }

    // Convert hash to a number between 0-100
    const userNumber = Math.abs(hash % 100);

    // If user's number is less than the test percentage, show the new onboarding
    return userNumber < data.percentage;
  } catch (error) {
    console.error('Error checking A/B test eligibility:', error);
    return false;
  }
};
