import { supabase } from '../lib/supabase';
import { OnboardingSlide } from '../components/Onboarding';
import { FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define the database slide structure
interface SupabaseOnboardingSlide {
  id: string;
  title_en: string;
  title_sv: string;
  text_en: string;
  text_sv: string;
  image_url: string | null;
  icon: string | null;
  icon_color: string | null;
  order: number;
  active: boolean;
  created_at: string;
  updated_at: string; // Track the last update time
}

// Content version key in AsyncStorage
const ONBOARDING_CONTENT_HASH_KEY = 'onboarding_content_hash';
const ONBOARDING_KEY = 'vromm_onboarding';
const FIRST_LOGIN_KEY = 'vromm_first_login';

// Fetch all active onboarding slides
export const fetchOnboardingSlides = async (): Promise<OnboardingSlide[]> => {
  try {
    const { data, error } = await supabase
      .from('onboarding_slides')
      .select('*')
      .eq('active', true)
      .order('order', { ascending: true });

    if (error) {
      // Log the specific error message
      console.error('Error fetching onboarding slides:', error.message);
      
      // Handle table doesn't exist specifically
      if (error.code === '42P01') {
        console.error('The onboarding_slides table does not exist. Please run the migration script.');
      }
      
      // Return fallback slides when there's any error
      return getFallbackSlides();
    }

    if (!data || data.length === 0) {
      console.warn('No onboarding slides found, using fallback slides');
      return getFallbackSlides();
    }

    // Check if content has changed and update version hash if needed
    await checkContentVersion(data);

    // Transform the data to match the OnboardingSlide interface
    return data.map((slide: SupabaseOnboardingSlide) => ({
      id: slide.id,
      title_en: slide.title_en,
      title_sv: slide.title_sv,
      text_en: slide.text_en,
      text_sv: slide.text_sv,
      image: slide.image_url 
        ? { uri: slide.image_url } 
        : require('../../assets/images/default-onboarding.png'),
      icon: slide.icon || undefined,
      iconColor: slide.icon_color || undefined,
    }));
  } catch (error) {
    console.error('Error in fetchOnboardingSlides:', error);
    return getFallbackSlides();
  }
};

// Check if content has changed and update the stored content hash
async function checkContentVersion(data: SupabaseOnboardingSlide[]) {
  try {
    // Create a simple content hash based on slide IDs, titles and update times
    const contentHash = data
      .map(slide => `${slide.id}-${slide.title_en}-${slide.updated_at}`)
      .join('|');
    
    // Get the stored hash
    const storedHash = await AsyncStorage.getItem(ONBOARDING_CONTENT_HASH_KEY);
    
    // If hash has changed, we should reset the onboarding flag to show again
    if (storedHash !== contentHash) {
      console.log('Onboarding content has been updated, resetting onboarding flag');
      
      // Store the new hash
      await AsyncStorage.setItem(ONBOARDING_CONTENT_HASH_KEY, contentHash);
      
      // Reset the onboarding flag but only if the hash isn't null (first time)
      if (storedHash !== null) {
        // This will force onboarding to show again on next check
        await AsyncStorage.removeItem(ONBOARDING_KEY);
      }
    }
  } catch (error) {
    console.error('Error checking content version:', error);
  }
}

// Provide fallback slides in case of error or empty data
const getFallbackSlides = (): OnboardingSlide[] => {
  return [
    {
      id: 'welcome',
      title_en: 'Welcome to Vromm',
      title_sv: 'Välkommen till Vromm',
      text_en: 'Your new companion for driver training',
      text_sv: 'Din nya kompanjon för körkortsutbildning',
      image: require('../../assets/images/default-onboarding.png'),
      icon: 'road',
      iconColor: '#3498db'
    },
    {
      id: 'features',
      title_en: 'Discover Routes',
      title_sv: 'Upptäck Rutter',
      text_en: 'Find training routes created by driving schools and other learners',
      text_sv: 'Hitta övningsrutter skapade av trafikskolor och andra elever',
      image: require('../../assets/images/default-onboarding.png'),
      icon: 'map-marker',
      iconColor: '#2ecc71'
    },
    {
      id: 'community',
      title_en: 'Join the Community',
      title_sv: 'Gå med i gemenskapen',
      text_en: 'Share your experiences and learn from others',
      text_sv: 'Dela med dig av dina erfarenheter och lär från andra',
      image: require('../../assets/images/default-onboarding.png'),
      icon: 'users',
      iconColor: '#e74c3c'
    }
  ];
};

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
    const { error } = await supabase
      .from('user_settings')
      .upsert(
        {
          user_id: userId,
          settings: { 
            onboarding_completed: false,
            onboarding_last_shown: null,
            onboarding_version: 0,
          },
          updated_at: new Date().toISOString()
        },
        { 
          onConflict: 'user_id',
          // These are the columns that will be updated
          ignoreDuplicates: false
        }
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
  percentage: number = 50 // Default to 50% of users seeing the new onboarding
): Promise<void> => {
  try {
    // Create A/B test record
    const { error } = await supabase
      .from('ab_tests')
      .insert({
        name: testName,
        feature: 'onboarding',
        percentage,
        active: true,
        created_at: new Date().toISOString()
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
  testName: string
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
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
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