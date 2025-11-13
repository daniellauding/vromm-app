export interface FeaturedLearningPath {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon?: string;
  image?: string;
  youtube_url?: string;
  is_featured: boolean;
  // Access Control & Paywall
  is_locked?: boolean;
  lock_password?: string | null;
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
}

export interface FeaturedExercise {
  id: string;
  title: { en: string; sv: string };
  description: { en: string; sv: string };
  icon?: string;
  image?: string;
  youtube_url?: string;
  learning_path_id: string;
  is_featured: boolean;
  repeat_count?: number;
  // Quiz fields
  has_quiz?: boolean;
  quiz_required?: boolean;
  quiz_pass_score?: number;
  // Access Control & Paywall
  is_locked?: boolean;
  lock_password?: string | null;
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
}
