import { Database } from '../lib/database.types';

export type MediaItem = {
  id: string;
  type: 'image' | 'video' | 'youtube';
  uri: string;
  fileName: string;
  description?: string;
  thumbnail?: string;
};

export type MediaUrl = {
  type: 'image' | 'video' | 'youtube';
  url: string;
  description?: string;
};

export type WaypointData = {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
};

export type Exercise = {
  id: string;
  title: string;
  description?: string;
  duration?: string;
  repetitions?: string;
};

export type RouteType =
  | 'difficulty'
  | 'spot_type'
  | 'category'
  | 'transmission_type'
  | 'activity_level'
  | 'best_season'
  | 'vehicle_types'
  | 'saved'
  | 'driven'
  | 'city'
  | 'created'
  | 'nearby';

export type RouteData = Database['public']['Tables']['routes']['Row'] & {
  waypoint_details: WaypointData[];
  media_attachments: MediaUrl[];
  metadata: {
    waypoints: WaypointData[];
    pins: any[];
    options: {
      reverse: boolean;
      closeLoop: boolean;
      doubleBack: boolean;
    };
    coordinates: any[];
  };
  exercises?: Exercise[];
  media?: MediaItem[];
};

export type PinData = {
  lat: number;
  lng: number;
  title?: string;
  description?: string;
};

export type RouteMetadata = {
  waypoints?: WaypointData[];
  pins?: PinData[];
  options?: {
    reverse: boolean;
    closeLoop: boolean;
    doubleBack: boolean;
  };
  coordinates?: any[];
};

export type Route = Database['public']['Tables']['routes']['Row'] & {
  creator: {
    full_name: string;
  } | null;
  metadata: RouteMetadata;
  waypoint_details: WaypointData[];
  reviews?: {
    id: string;
    rating: number;
    content: string;
    difficulty: string;
    visited_at: string;
    created_at: string;
    images: { url: string; description?: string }[];
    user: { id: string; full_name: string };
  }[];
};

export type SavedRouteFromDB = {
  id: string;
  route_id: string | null;
  user_id: string | null;
  saved_at: string | null;
  routes: Route | null;
};

export type SavedRoute = Route & {
  saved_at: string;
};