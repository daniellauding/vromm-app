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

export type RouteData = {
  id: string;
  name: string;
  description?: string;
  difficulty: Database['public']['Enums']['difficulty_level'];
  spot_type: Database['public']['Enums']['spot_type'];
  visibility: Database['public']['Enums']['spot_visibility'];
  best_season: string;
  best_times: string;
  vehicle_types: string[];
  activity_level: string;
  spot_subtype: string;
  transmission_type: string;
  category: Database['public']['Enums']['spot_category'];
  creator_id: string;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  waypoint_details: WaypointData[];
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
  suggested_exercises?: string;
  media_attachments: MediaUrl[];
  drawing_mode: 'waypoints';
  exercises?: Exercise[];
  media?: MediaItem[];
}; 
