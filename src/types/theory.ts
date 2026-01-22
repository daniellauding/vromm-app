/**
 * Theory module types for driver's license theory content
 */

export interface LocalizedText {
  en: string;
  sv: string;
}

export interface TheoryModule {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  image?: string;
  youtube_url?: string;
  icon?: string;
  active: boolean;
  order_index: number;
  vehicle_type?: string;
  license_type?: string;
  is_locked?: boolean;
  lock_password?: string;
  paywall_enabled?: boolean;
  price_usd?: number;
  price_sek?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TheorySection {
  id: string;
  theory_module_id: string;
  title: LocalizedText;
  content: LocalizedText;
  summary?: LocalizedText;
  image?: string;
  youtube_url?: string;
  embed_code?: string;
  order_index: number;
  has_quiz: boolean;
  quiz_pass_score: number;
  created_at?: string;
  updated_at?: string;
}

export type QuizQuestionType = 'single_choice' | 'multiple_choice' | 'true_false';

export interface TheoryQuizQuestion {
  id: string;
  section_id: string;
  question_text: LocalizedText;
  question_type: QuizQuestionType;
  image?: string;
  youtube_url?: string;
  explanation_text?: LocalizedText;
  order_index: number;
  points: number;
  answers?: TheoryQuizAnswer[];
  created_at?: string;
  updated_at?: string;
}

export interface TheoryQuizAnswer {
  id: string;
  question_id: string;
  answer_text: LocalizedText;
  is_correct: boolean;
  explanation_text?: LocalizedText;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface TheoryFlashcard {
  id: string;
  section_id: string;
  front_text: LocalizedText;
  back_text: LocalizedText;
  front_image?: string;
  back_image?: string;
  difficulty: number;
  tags?: string[];
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface TheorySectionCompletion {
  id: string;
  user_id: string;
  section_id: string;
  completed_at: string;
  time_spent_seconds: number;
  quiz_score?: number;
  quiz_attempts: number;
}

export interface TheoryModuleProgress {
  id: string;
  user_id: string;
  module_id: string;
  sections_completed: number;
  total_sections: number;
  average_quiz_score?: number;
  total_time_seconds: number;
  started_at: string;
  completed_at?: string;
}

export interface TheoryFlashcardProgress {
  id: string;
  user_id: string;
  flashcard_id: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_date?: string;
  last_reviewed_at?: string;
}

/**
 * Helper to get localized text based on current language
 */
export const getLocalizedText = (
  text: LocalizedText | undefined,
  language: 'en' | 'sv' = 'en'
): string => {
  if (!text) return '';
  return language === 'sv' ? (text.sv || text.en) : (text.en || text.sv);
};
