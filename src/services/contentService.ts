import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define content types
export enum ContentType {
  ONBOARDING = 'onboarding',
  MARKETING = 'marketing',
  AUTH = 'auth',
  PROMOTION = 'promotion',
}

// Define languages
export type Language = 'en' | 'sv';

// Define platform types
export type Platform = 'mobile' | 'web';

// Define the content structure
export interface ContentItem {
  id: string;
  key: string;
  content_type: ContentType;
  platforms: Platform[];
  title: Record<Language, string>;
  body: Record<Language, string>;
  image_url: string | null;
  icon: string | null;
  icon_color: string | null;
  order_index: number;
  active: boolean;
  created_at: string;
  updated_at: string;
  images: Record<string, any>;
  has_language_images: boolean;
  icon_svg: string | null;
  youtube_embed?: string | null;
  iframe_embed?: string | null;
  media_type?: 'image' | 'video' | 'embed';
  media_enabled?: boolean;
}

// Content version key in AsyncStorage
const CONTENT_HASH_KEY = 'content_version_hash';
const CONTENT_CACHE_KEY_PREFIX = 'cached_content_';

/**
 * Fetch all active content items of a specific type
 */
export const fetchContentByType = async (
  contentType: ContentType,
  platform: Platform = 'mobile',
): Promise<ContentItem[]> => {
  try {
    // Try to get from cache first
    const cachedContent = await getCachedContent(contentType, platform);
    if (cachedContent) {
      return cachedContent;
    }

    // If not cached, fetch from Supabase
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('content_type', contentType)
      .eq('active', true)
      .contains('platforms', [platform])
      .order('order_index', { ascending: true });

    if (error) {
      console.error(`Error fetching ${contentType} content:`, error.message);
      return [];
    }

    if (!data || data.length === 0) {
      console.warn(`No ${contentType} content found`);
      return [];
    }

    // Cache the results
    await cacheContent(contentType, platform, data);

    return data;
  } catch (error) {
    console.error(`Error in fetchContentByType for ${contentType}:`, error);
    return [];
  }
};

/**
 * Get onboarding slides formatted for the onboarding component
 */
export const fetchOnboardingContent = async (): Promise<ContentItem[]> => {
  return fetchContentByType('onboarding', 'mobile');
};

/**
 * Get content by specific key
 */
export const fetchContentByKey = async (
  key: string,
  platform: Platform = 'mobile',
): Promise<ContentItem | null> => {
  try {
    // Try to get from cache first
    const cacheKey = `${CONTENT_CACHE_KEY_PREFIX}key_${key}_${platform}`;
    const cachedItem = await AsyncStorage.getItem(cacheKey);

    if (cachedItem) {
      return JSON.parse(cachedItem);
    }

    // If not in cache, fetch from Supabase
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('key', key)
      .eq('active', true)
      .contains('platforms', [platform])
      .single();

    if (error) {
      console.error(`Error fetching content with key ${key}:`, error.message);
      return null;
    }

    if (!data) {
      console.warn(`No content found with key ${key}`);
      return null;
    }

    // Cache the item
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));

    return data;
  } catch (error) {
    console.error(`Error in fetchContentByKey for ${key}:`, error);
    return null;
  }
};

/**
 * Get multiple content items by keys
 */
export const fetchContentByKeys = async (
  keys: string[],
  platform: Platform = 'mobile',
): Promise<Record<string, ContentItem>> => {
  try {
    const { data, error } = await supabase
      .from('content')
      .select('*')
      .in('key', keys)
      .eq('active', true)
      .contains('platforms', [platform]);

    if (error) {
      console.error(`Error fetching content for keys:`, error.message);
      return {};
    }

    if (!data || data.length === 0) {
      console.warn(`No content found for provided keys`);
      return {};
    }

    // Convert array to map for easier access
    const contentMap: Record<string, ContentItem> = {};
    data.forEach((item) => {
      contentMap[item.key] = item;
    });

    return contentMap;
  } catch (error) {
    console.error(`Error in fetchContentByKeys:`, error);
    return {};
  }
};

/**
 * Helper to get cached content
 */
async function getCachedContent(
  contentType: ContentType,
  platform: Platform,
): Promise<ContentItem[] | null> {
  try {
    const cacheKey = `${CONTENT_CACHE_KEY_PREFIX}${contentType}_${platform}`;
    const cachedData = await AsyncStorage.getItem(cacheKey);

    if (!cachedData) return null;

    return JSON.parse(cachedData);
  } catch (error) {
    console.error(`Error getting cached ${contentType} content:`, error);
    return null;
  }
}

/**
 * Helper to cache content
 */
async function cacheContent(
  contentType: ContentType,
  platform: Platform,
  data: ContentItem[],
): Promise<void> {
  try {
    const cacheKey = `${CONTENT_CACHE_KEY_PREFIX}${contentType}_${platform}`;
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));

    // Create a simple content hash to track versions
    const contentHash = data.map((item) => `${item.id}-${item.updated_at}`).join('|');

    await AsyncStorage.setItem(`${CONTENT_HASH_KEY}_${contentType}_${platform}`, contentHash);
  } catch (error) {
    console.error(`Error caching ${contentType} content:`, error);
  }
}

/**
 * Clear all content caches
 */
export const clearContentCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const contentCacheKeys = keys.filter(
      (key) => key.startsWith(CONTENT_CACHE_KEY_PREFIX) || key.startsWith(CONTENT_HASH_KEY),
    );

    if (contentCacheKeys.length > 0) {
      await AsyncStorage.multiRemove(contentCacheKeys);
      console.log('Content cache cleared successfully');
    }
  } catch (error) {
    console.error('Error clearing content cache:', error);
  }
};

// Clear cache on app start to avoid stale content issues
(async () => {
  try {
    await clearContentCache();
    console.log('Content cache cleared on startup');
  } catch (error) {
    console.error('Failed to clear content cache on startup:', error);
  }
})();

/**
 * Content change listener types and implementation
 */
type ContentChangeListener = (contentType?: ContentType) => void;
const contentListeners: ContentChangeListener[] = [];

/**
 * Register a listener for content changes
 * @param listener Function to call when content changes
 * @returns Function to unregister the listener
 */
export function onContentChange(listener: ContentChangeListener): () => void {
  contentListeners.push(listener);

  // If this is the first listener, set up the subscription
  if (contentListeners.length === 1) {
    setupContentSubscription();
  }

  // Return function to remove listener
  return () => {
    const index = contentListeners.indexOf(listener);
    if (index !== -1) {
      contentListeners.splice(index, 1);
    }

    // If no more listeners, clean up subscription
    if (contentListeners.length === 0) {
      cleanupContentSubscription();
    }
  };
}

// Store subscription for cleanup
let contentSubscription: any = null;

/**
 * Set up real-time subscription to content table
 */
function setupContentSubscription() {
  contentSubscription = supabase
    .channel('content-changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'content',
      },
      (payload) => {
        console.log('Content change detected:', payload);

        // Get the content type from the changed record
        const contentType = payload.new?.content_type;

        // Clear the cache for this content type
        if (contentType) {
          clearContentCacheByType(contentType as ContentType);
        } else {
          // If content type not determined, clear all content cache
          clearContentCache();
        }

        // Notify all listeners
        notifyContentListeners(contentType as ContentType);
      },
    )
    .subscribe();
}

/**
 * Clean up subscription when no longer needed
 */
function cleanupContentSubscription() {
  if (contentSubscription) {
    supabase.removeChannel(contentSubscription);
    contentSubscription = null;
  }
}

/**
 * Notify all content change listeners
 */
function notifyContentListeners(contentType?: ContentType) {
  contentListeners.forEach((listener) => {
    try {
      listener(contentType);
    } catch (error) {
      console.error('Error in content change listener:', error);
    }
  });
}

/**
 * Clear cache for a specific content type
 */
export async function clearContentCacheByType(contentType: ContentType): Promise<void> {
  try {
    // Get all cache keys
    const allKeys = await AsyncStorage.getAllKeys();

    // Filter keys that match this content type
    const keysToRemove = allKeys.filter((key) =>
      key.startsWith(`${CONTENT_CACHE_KEY_PREFIX}${contentType}`),
    );

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`Cleared cache for content type: ${contentType}`);
    }
  } catch (error) {
    console.error(`Error clearing cache for content type ${contentType}:`, error);
  }
}
