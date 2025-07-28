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
  // Core identification
  title: string | { en: string; sv: string }; // Support both simple and multilingual
  description?: string | { en: string; sv: string }; // Support both simple and multilingual
  
  // Basic exercise properties
  duration?: string;
  repetitions?: string;
  order_index?: number;
  
  // Learning path exercise data (when sourced from learning paths)
  learning_path_exercise_id?: string;
  learning_path_id?: string;
  learning_path_title?: string;
  
  // Rich media support
  youtube_url?: string;
  icon?: string;
  image?: string;
  embed_code?: string;
  language_specific_media?: boolean;
  
  // Quiz and assessment features
  has_quiz?: boolean;
  quiz_required?: boolean;
  quiz_pass_score?: number;
  quiz_data?: {
    questions: {
      id: string;
      question: string | { en: string; sv: string };
      options: string[] | { en: string[]; sv: string[] };
      correct_answer: number;
      explanation?: string | { en: string; sv: string };
    }[];
    pass_score: number;
    max_attempts?: number;
  };
  
  // Learning progression features
  isRepeat?: boolean;
  originalId?: string;
  repeatNumber?: number;
  repeat_count?: number;
  bypass_order?: boolean;
  
  // Access control
  is_locked?: boolean;
  lock_password?: string | null;
  
  // Monetization features
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
  
  // Source and creation metadata
  source?: 'custom' | 'learning_path';
  source_route_id?: string | null;
  source_type?: string;
  creator_id?: string; // For custom exercises
  created_at?: string;
  updated_at?: string;
  
  // User-Generated Content Management
  visibility?: 'private' | 'public' | 'unlisted'; // Private = only creator, Public = discoverable, Unlisted = shareable link only
  is_user_generated?: boolean; // True for custom user exercises
  category?: string; // e.g., 'driving-basics', 'parking', 'highway', 'user-created'
  tags?: string[]; // Flexible tagging system
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  vehicle_type?: 'manual' | 'automatic' | 'both';
  
  // Community & Quality
  is_public?: boolean; // For backward compatibility
  is_featured?: boolean; // Admin can feature good exercises
  is_verified?: boolean; // Admin verified quality
  rating?: number; // Average user rating
  rating_count?: number; // Number of ratings
  completion_count?: number; // How many times completed
  report_count?: number; // Number of reports (for moderation)
  
  // Admin Promotion System (for future use)
  admin_notes?: string; // Internal admin notes
  promotion_status?: 'none' | 'nominated' | 'under_review' | 'approved' | 'promoted'; // Workflow for promoting to learning paths
  promoted_to_learning_path_id?: string; // If promoted, which learning path
  quality_score?: number; // Algorithmic quality score
  
  // Custom exercise specific fields
  custom_media_attachments?: {
    type: 'image' | 'video' | 'youtube';
    url: string;
    description?: string;
    language?: 'en' | 'sv' | 'both';
  }[];
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