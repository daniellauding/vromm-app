import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useStudentSwitch } from '../context/StudentSwitchContext';

export interface UserCollection {
  id: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private' | 'shared';
  creator_id: string;
  created_at: string;
  updated_at: string;
  route_count?: number;
  is_default?: boolean;
  member_role?: string; // Role if user is a member (not creator)
}

export function useUserCollections() {
  const { getEffectiveUserId } = useStudentSwitch();
  const [collections, setCollections] = useState<UserCollection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effectiveUserId = getEffectiveUserId();

  const loadCollections = useCallback(async () => {
    if (!effectiveUserId) return;

    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 [useUserCollections] Loading collections for user:', effectiveUserId);
      
      // Get collections where user is creator OR public OR member
      // First get collections where user is the creator
      const { data: ownedData, error: ownedError } = await supabase
        .from('map_presets')
        .select(`
          *,
          route_count:map_preset_routes(count)
        `)
        .eq('creator_id', effectiveUserId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (ownedError) {
        console.error('❌ [useUserCollections] Error loading owned collections:', ownedError);
        throw ownedError;
      }

      // Get public collections
      const { data: publicData, error: publicError } = await supabase
        .from('map_presets')
        .select(`
          *,
          route_count:map_preset_routes(count)
        `)
        .eq('visibility', 'public')
        .neq('creator_id', effectiveUserId) // Exclude ones they already own
        .order('created_at', { ascending: false });

      if (publicError) {
        console.error('❌ [useUserCollections] Error loading public collections:', publicError);
        throw publicError;
      }

      // Get collections where user is a member (but not creator)
      const { data: memberData, error: memberError } = await supabase
        .from('map_preset_members')
        .select(`
          preset_id,
          role,
          map_presets!inner(
            *,
            route_count:map_preset_routes(count)
          )
        `)
        .eq('user_id', effectiveUserId)
        .neq('map_presets.creator_id', effectiveUserId); // Exclude ones they already own

      if (memberError) {
        console.error('❌ [useUserCollections] Error loading member collections:', memberError);
        throw memberError;
      }

      // Combine the results
      const ownedCollections = ownedData || [];
      const publicCollections = publicData || [];
      const memberCollections = memberData?.map(item => ({
        ...item.map_presets,
        member_role: item.role // Include the member role
      })).filter(Boolean) || [];
      
      const allCollections = [...ownedCollections, ...publicCollections, ...memberCollections];
      
      // Sort combined results
      const sortedCollections = allCollections.sort((a, b) => {
        // Default collections first
        if (a.is_default && !b.is_default) return -1;
        if (!a.is_default && b.is_default) return 1;
        // Then by creation date
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      const transformedCollections = sortedCollections?.map(collection => ({
        ...collection,
        route_count: collection.route_count?.[0]?.count || 0,
      })) || [];

      console.log('✅ [useUserCollections] Loaded collections:', {
        owned: ownedCollections.length,
        public: publicCollections.length,
        member: memberCollections.length,
        total: transformedCollections.length
      });

      setCollections(transformedCollections);
    } catch (err) {
      console.error('❌ [useUserCollections] Error loading collections:', err);
      setError(err instanceof Error ? err.message : 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, [effectiveUserId]);

  // Load collections on mount and when effectiveUserId changes
  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  return {
    collections,
    loading,
    error,
    refetch: loadCollections
  };
}
