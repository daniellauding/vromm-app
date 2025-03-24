import { useEffect, useState, useCallback } from 'react';
import { 
  onContentChange, 
  ContentType, 
  fetchContentByType,
  fetchContentByKey,
  fetchContentByKeys,
  ContentItem
} from '../services/contentService';

/**
 * Hook that subscribes to content updates and automatically refreshes content when it changes
 * 
 * @param options Configuration options for the hook
 * @returns The content items and loading state
 */
export function useContentUpdates<T = ContentItem[]>(options: {
  contentType?: ContentType;
  key?: string;
  keys?: string[];
  transform?: (items: ContentItem[]) => T;
  enabled?: boolean;
}) {
  const { contentType, key, keys, transform, enabled = true } = options;
  
  const [content, setContent] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Function to fetch the content based on the provided options
  const fetchContent = useCallback(async () => {
    if (!enabled) return;
    
    try {
      setLoading(true);
      setError(null);
      
      let items: ContentItem[] = [];
      
      // Determine which fetch method to use based on the provided options
      if (key) {
        const item = await fetchContentByKey(key);
        items = item ? [item] : [];
      } else if (keys && keys.length > 0) {
        items = await fetchContentByKeys(keys);
      } else if (contentType) {
        items = await fetchContentByType(contentType);
      } else {
        throw new Error('useContentUpdates requires either contentType, key, or keys.');
      }
      
      // Transform the result if a transform function is provided
      const result = transform ? transform(items) : (items as unknown as T);
      setContent(result);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [contentType, key, keys, transform, enabled]);

  // Initial fetch
  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Subscribe to content changes
  useEffect(() => {
    if (!enabled) return;
    
    const unsubscribe = onContentChange((changedContentType) => {
      // If no contentType is specified or it matches the one we're watching
      if (!changedContentType || !contentType || changedContentType === contentType) {
        console.log(`Content of type ${contentType || 'any'} changed, refreshing...`);
        fetchContent();
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [contentType, fetchContent, enabled]);

  return { content, loading, error, refresh: fetchContent };
}

/**
 * Hook that subscribes to a single content item by key
 */
export function useContentItem<T = ContentItem>(
  key: string,
  options: {
    transform?: (item: ContentItem | null) => T;
    enabled?: boolean;
  } = {}
) {
  const { transform, enabled = true } = options;
  
  const transformItem = useCallback((items: ContentItem[]) => {
    const item = items.length > 0 ? items[0] : null;
    return transform ? transform(item) : (item as unknown as T);
  }, [transform]);
  
  return useContentUpdates<T>({
    key,
    transform: transformItem,
    enabled
  });
}

/**
 * Hook that subscribes to content of a specific type
 */
export function useContentByType<T = ContentItem[]>(
  contentType: ContentType,
  options: {
    transform?: (items: ContentItem[]) => T;
    enabled?: boolean;
  } = {}
) {
  return useContentUpdates<T>({
    contentType,
    ...options
  });
} 