import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type SpotType = Database['public']['Enums']['spot_type'];
type DifficultyLevel = Database['public']['Enums']['difficulty_level'];
type SpotVisibility = Database['public']['Enums']['spot_visibility'];

export type WaypointData = {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
};

export type RouteMetadata = {
  waypoints?: WaypointData[];
  pins?: any[];
  options?: {
    reverse: boolean;
    closeLoop: boolean;
    doubleBack: boolean;
  };
  coordinates?: any[];
};

export type MediaAttachment = {
  url: string;
  type: 'image' | 'video';
  description?: string;
};

export type Route = Database['public']['Tables']['routes']['Row'] & {
  creator: {
    full_name: string;
  } | null;
  metadata: RouteMetadata;
  waypoint_details: WaypointData[];
  media_attachments?: MediaAttachment[];
};

type RouteFilters = {
  difficulty?: DifficultyLevel;
  spot_type?: SpotType;
  visibility?: SpotVisibility;
  search?: string;
};

export function useRoutes() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoutes = async (filters?: RouteFilters) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('routes')
        .select(`
          *,
          creator:creator_id(full_name)
        `);

      if (filters?.difficulty) {
        query = query.eq('difficulty', filters.difficulty);
      }
      
      if (filters?.spot_type) {
        query = query.eq('spot_type', filters.spot_type);
      }

      if (filters?.visibility) {
        query = query.eq('visibility', filters.visibility);
      }

      if (filters?.search) {
        query = query.ilike('name', `%${filters.search}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Transform the data to ensure proper typing
      const transformedData = data?.map(route => ({
        ...route,
        metadata: route.metadata as RouteMetadata || {},
        waypoint_details: (route.waypoint_details as WaypointData[]) || [],
      })) as Route[];

      return transformedData;

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch routes';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { fetchRoutes, loading, error };
} 