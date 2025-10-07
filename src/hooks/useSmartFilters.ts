import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStudentSwitch } from '../context/StudentSwitchContext';

export interface FilterCategory {
  id: string;
  label: string;
  value: string;
  type:
    | 'difficulty'
    | 'spot_type'
    | 'category'
    | 'transmission_type'
    | 'activity_level'
    | 'best_season'
    | 'vehicle_types'
    | 'collection'; // NEW: Support for collections
}

export interface FilterUsage {
  filterId: string;
  lastUsed: number;
  usageCount: number;
  type: string;
}

export interface CollectionFilter extends FilterCategory {
  type: 'collection';
  collectionId: string;
  collectionName: string;
}

const MAX_DISPLAYED_FILTERS = 6; // Show top 6 most relevant filters
const USAGE_DECAY_DAYS = 30; // Filters lose relevance after 30 days

export function useSmartFilters() {
  const { getEffectiveUserId } = useStudentSwitch();
  const [filterUsage, setFilterUsage] = useState<FilterUsage[]>([]);
  const [userCollections, setUserCollections] = useState<CollectionFilter[]>([]);

  // Get effective user ID for user-specific storage
  const effectiveUserId = getEffectiveUserId();

  // Load filter usage history
  const loadFilterUsage = useCallback(async () => {
    try {
      const usageKey = `vromm_filter_usage_${effectiveUserId || 'default'}`;
      const saved = await AsyncStorage.getItem(usageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as FilterUsage[];
        // Filter out old usage (older than 30 days)
        const cutoffDate = Date.now() - USAGE_DECAY_DAYS * 24 * 60 * 60 * 1000;
        const recentUsage = parsed.filter((usage) => usage.lastUsed > cutoffDate);
        setFilterUsage(recentUsage);
        console.log(
          '✅ [useSmartFilters] Loaded filter usage:',
          recentUsage.length,
          'recent filters',
        );
      }
    } catch (error) {
      console.error('❌ [useSmartFilters] Error loading filter usage:', error);
    }
  }, [effectiveUserId]);

  // Save filter usage history
  const saveFilterUsage = useCallback(
    async (usage: FilterUsage[]) => {
      try {
        const usageKey = `vromm_filter_usage_${effectiveUserId || 'default'}`;
        await AsyncStorage.setItem(usageKey, JSON.stringify(usage));
        console.log('✅ [useSmartFilters] Saved filter usage for user:', effectiveUserId);
      } catch (error) {
        console.error('❌ [useSmartFilters] Error saving filter usage:', error);
      }
    },
    [effectiveUserId],
  );

  // Track filter usage
  const trackFilterUsage = useCallback(
    (filterId: string, filterType: string) => {
      setFilterUsage((prev) => {
        const existing = prev.find((usage) => usage.filterId === filterId);
        const now = Date.now();

        let updated: FilterUsage[];
        if (existing) {
          // Update existing usage
          updated = prev.map((usage) =>
            usage.filterId === filterId
              ? { ...usage, lastUsed: now, usageCount: usage.usageCount + 1 }
              : usage,
          );
        } else {
          // Add new usage
          updated = [...prev, { filterId, lastUsed: now, usageCount: 1, type: filterType }];
        }

        // Save to storage
        saveFilterUsage(updated);
        console.log('📊 [useSmartFilters] Tracked filter usage:', filterId, filterType);

        return updated;
      });
    },
    [saveFilterUsage],
  );

  // Get smart filter list (most relevant filters first)
  const getSmartFilters = useCallback(
    (allFilters: FilterCategory[], activeFilters: string[] = []) => {
      // Always show active filters first
      const activeFilterObjects = allFilters.filter((filter) => activeFilters.includes(filter.id));

      // Get usage scores for remaining filters
      const remainingFilters = allFilters.filter((filter) => !activeFilters.includes(filter.id));
      const scoredFilters = remainingFilters.map((filter) => {
        const usage = filterUsage.find((u) => u.filterId === filter.id);
        const daysSinceLastUse = usage
          ? (Date.now() - usage.lastUsed) / (24 * 60 * 60 * 1000)
          : Infinity;
        const usageScore = usage ? usage.usageCount * Math.exp(-daysSinceLastUse / 7) : 0; // Decay over 7 days

        return {
          filter,
          score: usageScore,
          lastUsed: usage?.lastUsed || 0,
          usageCount: usage?.usageCount || 0,
        };
      });

      // Sort by score (most relevant first)
      scoredFilters.sort((a, b) => b.score - a.score);

      // Take top filters, but ensure we don't exceed MAX_DISPLAYED_FILTERS
      const topFilters = scoredFilters.slice(0, MAX_DISPLAYED_FILTERS - activeFilterObjects.length);

      // Combine active filters (first) with top scored filters
      const smartFilters = [...activeFilterObjects, ...topFilters.map((item) => item.filter)];

      console.log('🧠 [useSmartFilters] Smart filter selection:', {
        total: allFilters.length,
        active: activeFilterObjects.length,
        smart: smartFilters.length,
        topScores: scoredFilters.slice(0, 3).map((item) => ({
          id: item.filter.id,
          score: item.score.toFixed(2),
          usage: item.usageCount,
        })),
      });

      return smartFilters;
    },
    [filterUsage],
  );

  // Add user collections to filter options
  const addUserCollections = useCallback((collections: Array<{ id: string; name: string }>) => {
    const collectionFilters: CollectionFilter[] = collections.map((collection) => ({
      id: `collection_${collection.id}`,
      label: collection.name,
      value: collection.id,
      type: 'collection',
      collectionId: collection.id,
      collectionName: collection.name,
    }));

    setUserCollections(collectionFilters);
    console.log('📁 [useSmartFilters] Added user collections:', collectionFilters.length);
  }, []);

  // Get all available filters including collections
  const getAllFilters = useCallback(
    (baseFilters: FilterCategory[]) => {
      return [...baseFilters, ...userCollections];
    },
    [userCollections],
  );

  // Load filter usage on mount
  useEffect(() => {
    loadFilterUsage();
  }, [loadFilterUsage]);

  return {
    getSmartFilters,
    trackFilterUsage,
    addUserCollections,
    getAllFilters,
    filterUsage,
    userCollections,
  };
}
