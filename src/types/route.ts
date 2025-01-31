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
