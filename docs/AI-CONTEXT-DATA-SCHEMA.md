# AI Context Data Schema

**Version:** 1.0  
**Related:** AI-LEARNINGPATH-INTEGRATION.md  
**Purpose:** Detailed technical specification of data structures for AI context

---

## 1. TypeScript Interfaces

### 1.1 Core Context Interface

```typescript
/**
 * Complete context provided to AI for generating responses
 * This is the master context object sent with every AI request
 */
interface AIConversationContext {
  // ===== SESSION METADATA =====
  session_id: string; // Unique ID for this conversation session
  timestamp: Date; // When context was generated
  locale: 'en' | 'sv'; // User's preferred language
  screen_context: ScreenContext; // Where user is in the app
  
  // ===== USER PROFILE =====
  user: UserProfile;
  
  // ===== CURRENT ACTIVITY =====
  current_exercise?: ExerciseContext;
  current_learning_path?: LearningPathContext;
  current_route?: RouteContext;
  
  // ===== HISTORICAL DATA =====
  exercise_history?: ExerciseHistory;
  learning_path_progress: LearningPathProgress[];
  overall_progress: OverallProgress;
  
  // ===== PERFORMANCE ANALYTICS =====
  performance: PerformanceMetrics;
  
  // ===== PATTERN DETECTION =====
  patterns?: DetectedPatterns;
  
  // ===== CONVERSATION HISTORY =====
  conversation_history?: ConversationMessage[];
  
  // ===== PRIVACY SETTINGS =====
  privacy_settings: AIPrivacySettings;
}
```

### 1.2 Screen Context

```typescript
/**
 * Identifies where the user is in the app
 * Determines which AI features are available
 */
interface ScreenContext {
  screen_type: 
    | 'exercise_view' 
    | 'exercise_active' 
    | 'exercise_celebration'
    | 'learning_path_view'
    | 'progress_screen'
    | 'route_view'
    | 'home_screen';
  
  // IDs of active content
  exercise_id?: string;
  learning_path_id?: string;
  route_id?: string;
  
  // Exercise state (if on exercise screen)
  exercise_state?: 'viewing' | 'in_progress' | 'completed' | 'paused';
  
  // Time on screen (helps detect struggling)
  time_on_screen_seconds?: number;
}
```

### 1.3 User Profile

```typescript
/**
 * User's basic profile and preferences
 * Minimal PII - mostly learning context
 */
interface UserProfile {
  id: string; // UUID (never exposed to AI prompts, only for DB queries)
  
  // Learning profile
  experience_level: 'beginner' | 'intermediate' | 'advanced' | null;
  vehicle_type: 'manual' | 'automatic' | 'both' | null;
  transmission_preference: 'manual' | 'automatic' | null;
  
  // Account age
  days_since_signup: number;
  days_active: number; // Days with at least 1 activity
  
  // Practice context
  total_practice_hours: number;
  total_exercises_completed: number;
  total_learning_paths_started: number;
  
  // Goals (if set)
  has_test_goal: boolean;
  test_goal_date?: Date;
  weekly_practice_goal_hours?: number;
  
  // Preferences
  preferred_practice_times?: string[]; // ['morning', 'evening']
  language_preference: 'en' | 'sv';
}
```

### 1.4 Exercise Context

```typescript
/**
 * Current exercise being viewed/practiced
 */
interface ExerciseContext {
  // Exercise identity
  id: string;
  type: 'user_exercise' | 'learning_path_exercise' | 'route_exercise';
  
  // Content
  title: LocalizedText;
  description: LocalizedText;
  
  // Metadata
  difficulty_level: 'beginner' | 'intermediate' | 'advanced' | null;
  tags: string[]; // ['roundabouts', 'city-driving', 'signaling']
  duration_minutes?: number;
  repeat_count: number; // How many times student should practice
  
  // Structure
  has_quiz: boolean;
  quiz_required: boolean;
  quiz_pass_score?: number;
  
  // Media
  has_video: boolean;
  has_images: boolean;
  youtube_url?: string;
  
  // Learning path context
  learning_path_id?: string;
  order_index?: number; // Position in path
  total_in_path?: number; // Total exercises in path
  
  // Related exercises
  prerequisite_exercises?: string[]; // Should complete before this
  related_exercises?: RelatedExercise[];
}

interface RelatedExercise {
  id: string;
  title: LocalizedText;
  relationship: 'prerequisite' | 'follow_up' | 'similar' | 'alternative';
  similarity_score: number; // 0-1
}
```

### 1.5 Exercise History

```typescript
/**
 * User's history with the current exercise
 */
interface ExerciseHistory {
  exercise_id: string;
  
  // Attempt tracking
  total_attempts: number;
  total_completions: number;
  completion_rate: number; // 0-1
  
  // Timing
  first_attempt_date: Date | null;
  last_attempt_date: Date | null;
  last_completion_date: Date | null;
  days_since_last_attempt: number | null;
  
  // Performance
  average_time_spent_seconds: number;
  fastest_completion_seconds: number | null;
  time_trend: 'improving' | 'stable' | 'declining'; // Based on last 3 attempts
  
  // Quiz performance (if applicable)
  quiz_attempts: number;
  quiz_completions: number;
  quiz_scores: number[]; // All historical scores
  quiz_average_score: number | null;
  quiz_best_score: number | null;
  quiz_score_trend: 'improving' | 'stable' | 'declining' | null;
  
  // Common mistakes (from quiz question analysis)
  common_wrong_answers?: {
    question_id: string;
    question_text: string;
    times_wrong: number;
    last_wrong_date: Date;
  }[];
  
  // Completion source
  completion_sources: {
    learning_path: number; // Completed from learning path
    route: number; // Completed from route practice
    standalone: number; // Completed individually
  };
}
```

### 1.6 Learning Path Context

```typescript
/**
 * Information about the learning path containing current exercise
 */
interface LearningPathContext {
  id: string;
  
  // Content
  title: LocalizedText;
  description: LocalizedText;
  
  // Categorization
  vehicle_type: string | null;
  transmission_type: string | null;
  experience_level: string | null;
  purpose: string | null; // 'test_prep', 'skill_building', etc.
  
  // Structure
  total_exercises: number;
  completed_exercises: number;
  progress_percentage: number; // 0-100
  
  // Current position
  current_exercise_index: number; // 0-based
  current_exercise_id: string;
  
  // Next exercises
  next_exercises: {
    id: string;
    title: LocalizedText;
    is_locked: boolean;
  }[];
  
  // Timing
  started_date: Date;
  last_activity_date: Date;
  estimated_completion_date: Date | null; // Based on current pace
  
  // Performance in this path
  average_completion_rate: number; // Across all exercises in path
  average_quiz_score: number | null;
}
```

### 1.7 Learning Path Progress (All Paths)

```typescript
/**
 * Summary of all learning paths the user has interacted with
 */
interface LearningPathProgress {
  id: string;
  title: LocalizedText;
  
  // Progress
  total_exercises: number;
  completed_exercises: number;
  progress_percentage: number;
  
  // Status
  status: 'not_started' | 'in_progress' | 'completed';
  is_active: boolean; // Currently practicing
  
  // Timing
  started_date: Date | null;
  last_activity_date: Date | null;
  completed_date: Date | null;
  
  // Performance
  average_quiz_score: number | null;
  completion_rate: number; // 0-1
}
```

### 1.8 Overall Progress

```typescript
/**
 * User's aggregate progress across all learning activities
 */
interface OverallProgress {
  // Exercise stats
  total_exercises_available: number;
  total_exercises_completed: number;
  unique_exercises_completed: number; // Excluding repeats
  global_completion_percentage: number; // 0-100
  
  // Learning paths
  total_learning_paths_available: number;
  total_learning_paths_started: number;
  total_learning_paths_completed: number;
  active_learning_paths: number; // Practiced in last 7 days
  
  // Practice habits
  total_practice_days: number;
  current_streak_days: number;
  longest_streak_days: number;
  average_exercises_per_week: number;
  
  // Time investment
  total_practice_hours: number;
  average_session_length_minutes: number;
  total_quiz_attempts: number;
  
  // Performance
  overall_quiz_average: number | null;
  overall_completion_rate: number; // 0-1
  
  // Milestones
  milestones_achieved: {
    type: 'exercises' | 'paths' | 'streak' | 'perfect_scores';
    milestone: string; // '50_exercises', '10_day_streak', etc.
    achieved_date: Date;
  }[];
}
```

### 1.9 Performance Metrics

```typescript
/**
 * Detailed performance analysis across different dimensions
 */
interface PerformanceMetrics {
  // Category-level proficiency
  category_proficiency: CategoryProficiency[];
  
  // Recent improvements
  recent_improvements: Improvement[];
  
  // Weak areas
  weak_areas: WeakArea[];
  
  // Time-based patterns
  performance_by_time_of_day: TimeOfDayPerformance[];
  
  // Comparison to self
  week_over_week_change: {
    exercises_completed: number; // Difference from last week
    practice_hours: number;
    average_score: number;
    completion_rate: number;
  };
  
  // Readiness indicators
  readiness_signals: ReadinessSignals;
}

interface CategoryProficiency {
  category: string; // 'roundabouts', 'parking', 'highway', etc.
  
  // Scope
  total_exercises_in_category: number;
  exercises_completed: number;
  exercises_attempted: number;
  
  // Performance
  completion_rate: number; // 0-1
  average_score: number | null; // Quiz scores
  average_attempts_to_complete: number;
  
  // Status
  proficiency_level: 'novice' | 'developing' | 'proficient' | 'mastered';
  proficiency_percentage: number; // 0-100
  
  // Timing
  last_practiced_date: Date | null;
  days_since_last_practice: number | null;
  
  // Trends
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
}

interface Improvement {
  skill_area: string;
  metric: 'completion_rate' | 'score' | 'speed' | 'accuracy';
  improvement_percentage: number; // Positive number
  timeframe_days: number; // Measured over last N days
  evidence: string; // Human-readable description
}

interface WeakArea {
  skill_area: string;
  
  // Why it's weak
  issue: 'low_completion_rate' | 'not_practiced' | 'declining_performance' | 'high_attempts';
  severity: 'minor' | 'moderate' | 'critical';
  
  // Details
  completion_rate: number;
  attempts_without_completion: number;
  last_practiced_date: Date | null;
  days_since_practice: number | null;
  
  // Recommendation
  suggested_action: string;
  suggested_exercises: string[]; // Exercise IDs to help improve
}

interface TimeOfDayPerformance {
  time_of_day: 'morning' | 'afternoon' | 'evening' | 'night';
  time_range: string; // '06:00-12:00'
  
  // Activity
  sessions: number;
  exercises_completed: number;
  
  // Performance
  average_completion_rate: number;
  average_quiz_score: number | null;
  average_session_length_minutes: number;
  
  // Best time indicator
  is_best_time: boolean;
}

interface ReadinessSignals {
  // For moving to next exercise/path
  ready_for_next: boolean;
  confidence_score: number; // 0-100
  
  // Evidence
  consecutive_completions: number;
  recent_score_average: number | null;
  score_trend: 'improving' | 'stable' | 'declining';
  time_since_last_practice_days: number;
  
  // Concerns (if not ready)
  blocking_issues?: string[];
}
```

### 1.10 Detected Patterns

```typescript
/**
 * Learning patterns detected by background analysis
 */
interface DetectedPatterns {
  // Mistake patterns
  common_mistakes: MistakePattern[];
  
  // Practice patterns
  practice_habits: PracticeHabits;
  
  // Plateau detection
  plateaus: PlateauIndicator[];
  
  // Strengths
  demonstrated_strengths: Strength[];
}

interface MistakePattern {
  pattern_id: string;
  exercise_id: string;
  exercise_title: LocalizedText;
  
  // Pattern details
  mistake_type: string; // 'timing', 'sequencing', 'rule_misunderstanding'
  description: string;
  
  // Frequency
  occurrences: number;
  first_seen: Date;
  last_seen: Date;
  days_active: number;
  
  // Impact
  affected_exercises: string[];
  blocks_progress: boolean;
  
  // Recommendation
  suggested_intervention?: string;
  helpful_exercises?: string[];
}

interface PracticeHabits {
  // Timing patterns
  preferred_time_of_day: string; // 'morning', 'evening'
  most_productive_time: string; // Based on performance
  
  // Session patterns
  average_session_length_minutes: number;
  typical_exercises_per_session: number;
  preferred_session_gap_days: number; // Days between practice
  
  // Preferences detected
  prefers_video_content: boolean;
  prefers_shorter_exercises: boolean;
  prefers_quiz_exercises: boolean;
  
  // Completion patterns
  completion_rate_by_time: Record<string, number>;
  completion_rate_by_difficulty: Record<string, number>;
  
  // Avoidance patterns
  avoided_categories?: string[]; // Categories user skips
  avoided_difficulty_levels?: string[];
}

interface PlateauIndicator {
  // What they're stuck on
  stuck_on_exercise_id: string;
  stuck_on_exercise_title: LocalizedText;
  
  // How long
  days_stuck: number;
  attempts: number;
  first_attempt: Date;
  last_attempt: Date;
  
  // Why stuck
  likely_cause: 'difficulty_too_high' | 'missing_prerequisite' | 'unclear_instructions' | 'confidence_issue';
  evidence: string;
  
  // Suggested intervention
  intervention_type: 'switch_exercise' | 'break_recommended' | 'seek_help' | 'review_basics';
  suggested_exercises?: string[];
  suggested_action: string;
}

interface Strength {
  skill_area: string;
  
  // Evidence
  high_completion_rate: number; // 0-1
  high_scores: number; // Average quiz score
  fast_completion: boolean; // Faster than average
  
  // Confidence
  demonstrated_in_exercises: string[];
  consistently_strong: boolean; // Strong across multiple exercises
  
  // Leverage
  can_leverage_for: string[]; // Related skills this helps with
}
```

### 1.11 Conversation History

```typescript
/**
 * Previous messages in this conversation session
 */
interface ConversationMessage {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  
  // Context at time of message
  exercise_id?: string;
  screen_context: string;
  
  // Feedback (if provided)
  helpful_rating?: number; // 1-5
  user_feedback?: string;
}
```

### 1.12 Privacy Settings

```typescript
/**
 * User's AI privacy preferences
 */
interface AIPrivacySettings {
  // Feature toggles
  ai_enabled: boolean; // Master switch
  allow_pattern_detection: boolean; // Background analysis
  allow_proactive_suggestions: boolean; // Unsolicited notifications
  allow_performance_comparison: boolean; // "You're in top 15%" stats
  
  // Data sharing
  share_anonymous_data_for_improvements: boolean; // Help improve AI
  allow_conversation_storage: boolean; // Store chat history
  
  // Retention
  conversation_retention_days: number; // 0, 30, 90
  pattern_retention_days: number; // How long to keep detected patterns
  
  // Instructor sharing
  allow_instructor_access_to_ai_insights: boolean;
}
```

### 1.13 Localized Text

```typescript
/**
 * Text that can be in multiple languages
 */
interface LocalizedText {
  en: string;
  sv: string;
}

/**
 * Helper to get text in user's locale
 */
function getLocalizedText(text: LocalizedText, locale: 'en' | 'sv'): string {
  return text[locale] || text.en; // Fallback to English
}
```

---

## 2. Database Schema Extensions

### 2.1 New Tables for AI Features

```sql
-- Daily practice aggregation for pattern analysis
CREATE TABLE daily_practice_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  practice_date DATE NOT NULL,
  
  -- Session metrics
  total_time_minutes INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 0,
  exercises_attempted INTEGER DEFAULT 0,
  exercises_completed INTEGER DEFAULT 0,
  
  -- Performance
  average_completion_rate DECIMAL(5,2),
  quiz_attempts INTEGER DEFAULT 0,
  quiz_average_score DECIMAL(5,2),
  
  -- Context
  time_of_day_distribution JSONB DEFAULT '{}'::jsonb, -- {"morning": 2, "evening": 1}
  categories_practiced TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, practice_date)
);

CREATE INDEX idx_daily_practice_logs_user_date ON daily_practice_logs(user_id, practice_date DESC);

-- AI conversation storage
CREATE TABLE ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL, -- Groups messages in same conversation
  
  -- Context
  conversation_type TEXT NOT NULL CHECK (conversation_type IN (
    'exercise_help',
    'performance_analysis',
    'goal_planning',
    'theory_question',
    'weekly_insights',
    'general_help'
  )),
  screen_context TEXT NOT NULL, -- Where user was in app
  exercise_id UUID REFERENCES learning_path_exercises(id) ON DELETE SET NULL,
  learning_path_id UUID REFERENCES learning_paths(id) ON DELETE SET NULL,
  route_id UUID REFERENCES routes(id) ON DELETE SET NULL,
  
  -- Message content
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  
  -- Context snapshot (what AI knew at time of response)
  context_snapshot JSONB, -- Full AIConversationContext as JSON
  
  -- Feedback
  helpful_rating INTEGER CHECK (helpful_rating >= 1 AND helpful_rating <= 5),
  user_feedback TEXT,
  feedback_provided_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  response_time_ms INTEGER, -- How long AI took to respond
  
  -- Indexes
  INDEX idx_ai_conversations_user (user_id),
  INDEX idx_ai_conversations_session (session_id),
  INDEX idx_ai_conversations_exercise (exercise_id),
  INDEX idx_ai_conversations_type (conversation_type),
  INDEX idx_ai_conversations_created (created_at DESC)
);

-- Enable RLS
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI conversations"
ON ai_conversations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI conversations"
ON ai_conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI conversations" 
ON ai_conversations FOR UPDATE
USING (auth.uid() = user_id);

-- Detected learning patterns
CREATE TABLE learning_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Pattern classification
  pattern_type TEXT NOT NULL CHECK (pattern_type IN (
    'common_mistake',
    'plateau',
    'strength',
    'weakness',
    'habit',
    'avoidance',
    'time_preference'
  )),
  pattern_category TEXT, -- 'roundabouts', 'parking', 'highway', etc.
  
  -- Pattern details
  description TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info', 'minor', 'moderate', 'critical')) DEFAULT 'info',
  
  -- Evidence
  first_detected TIMESTAMPTZ DEFAULT NOW(),
  last_detected TIMESTAMPTZ DEFAULT NOW(),
  occurrence_count INTEGER DEFAULT 1,
  confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
  evidence_data JSONB, -- Supporting data
  
  -- Impact
  affected_exercises UUID[] DEFAULT '{}',
  blocks_progress BOOLEAN DEFAULT false,
  
  -- Recommendations
  recommended_action TEXT,
  suggested_exercises UUID[] DEFAULT '{}',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  resolved_at TIMESTAMPTZ,
  resolution_note TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_learning_patterns_user_active (user_id, is_active),
  INDEX idx_learning_patterns_type (pattern_type),
  INDEX idx_learning_patterns_category (pattern_category)
);

-- Enable RLS
ALTER TABLE learning_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own learning patterns"
ON learning_patterns FOR SELECT
USING (auth.uid() = user_id);

-- AI interventions tracking
CREATE TABLE ai_interventions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_id UUID REFERENCES learning_patterns(id) ON DELETE SET NULL,
  
  -- Intervention details
  intervention_type TEXT NOT NULL CHECK (intervention_type IN (
    'exercise_switch',
    'practice_reminder',
    'strategy_suggestion',
    'break_recommendation',
    'goal_adjustment',
    'difficulty_change'
  )),
  description TEXT NOT NULL,
  
  -- Suggested actions
  suggested_exercises UUID[] DEFAULT '{}',
  suggested_actions JSONB, -- Structured action steps
  
  -- Delivery
  delivered_via TEXT CHECK (delivered_via IN ('notification', 'in_app', 'celebration_screen', 'ai_chat')),
  delivered_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- User response
  user_action TEXT CHECK (user_action IN ('accepted', 'rejected', 'ignored', 'modified')),
  user_action_at TIMESTAMPTZ,
  user_action_details JSONB,
  
  -- Effectiveness tracking
  tracked_until TIMESTAMPTZ, -- How long to measure impact
  improved_performance BOOLEAN,
  impact_score DECIMAL(5,2), -- -100 to 100 (negative = made worse)
  impact_evidence JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  evaluated_at TIMESTAMPTZ,
  
  INDEX idx_ai_interventions_user (user_id),
  INDEX idx_ai_interventions_pattern (pattern_id),
  INDEX idx_ai_interventions_type (intervention_type),
  INDEX idx_ai_interventions_delivered (delivered_at DESC)
);

-- Enable RLS
ALTER TABLE ai_interventions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI interventions"
ON ai_interventions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI interventions"
ON ai_interventions FOR UPDATE
USING (auth.uid() = user_id);
```

### 2.2 Indexes for Performance

```sql
-- Optimize common AI context queries

-- Exercise history lookups
CREATE INDEX idx_lpec_user_exercise_created 
ON learning_path_exercise_completions(user_id, exercise_id, created_at DESC);

-- Learning path progress queries
CREATE INDEX idx_lpec_user_path_completed
ON learning_path_exercise_completions(user_id, learning_path_id, completed_at)
WHERE completed_at IS NOT NULL;

-- Pattern detection queries (find exercises with low completion rates)
CREATE INDEX idx_lpec_user_attempts
ON learning_path_exercise_completions(user_id, exercise_id)
WHERE completed_at IS NULL; -- Incomplete attempts

-- Time-based queries for streak calculation
CREATE INDEX idx_lpec_user_completion_date
ON learning_path_exercise_completions(user_id, DATE(completed_at))
WHERE completed_at IS NOT NULL;

-- Category-based proficiency queries
CREATE INDEX idx_lpe_tags_gin
ON learning_path_exercises USING GIN(tags);
```

### 2.3 Materialized Views for Performance

```sql
-- Pre-computed user progress summary (refresh periodically)
CREATE MATERIALIZED VIEW user_progress_summary AS
SELECT 
  user_id,
  COUNT(DISTINCT exercise_id) as unique_exercises_completed,
  COUNT(*) as total_completions,
  COUNT(*) FILTER (WHERE completed_at >= NOW() - INTERVAL '7 days') as completions_last_7_days,
  COUNT(*) FILTER (WHERE completed_at >= NOW() - INTERVAL '30 days') as completions_last_30_days,
  COUNT(DISTINCT DATE(completed_at)) as total_practice_days,
  MIN(completed_at) as first_completion_date,
  MAX(completed_at) as last_completion_date
FROM learning_path_exercise_completions
WHERE completed_at IS NOT NULL
GROUP BY user_id;

CREATE UNIQUE INDEX idx_ups_user ON user_progress_summary(user_id);

-- Refresh every hour or on-demand
REFRESH MATERIALIZED VIEW CONCURRENTLY user_progress_summary;

-- Category proficiency summary
CREATE MATERIALIZED VIEW user_category_proficiency AS
WITH exercise_categories AS (
  SELECT 
    lpe.id as exercise_id,
    UNNEST(lpe.tags) as category
  FROM learning_path_exercises lpe
  WHERE lpe.tags IS NOT NULL AND lpe.tags != '{}'
)
SELECT 
  lpec.user_id,
  ec.category,
  COUNT(DISTINCT ec.exercise_id) as exercises_in_category,
  COUNT(DISTINCT lpec.exercise_id) as exercises_completed,
  AVG(CASE WHEN lpec.completed_at IS NOT NULL THEN 1 ELSE 0 END) as completion_rate,
  MAX(lpec.completed_at) as last_practiced
FROM exercise_categories ec
LEFT JOIN learning_path_exercise_completions lpec 
  ON lpec.exercise_id = ec.exercise_id
GROUP BY lpec.user_id, ec.category;

CREATE INDEX idx_ucp_user ON user_category_proficiency(user_id);
CREATE INDEX idx_ucp_category ON user_category_proficiency(category);
```

---

## 3. API Response Formats

### 3.1 AI Response Format

```typescript
interface AIResponse {
  // Response content
  message: string; // Main AI response (markdown supported)
  
  // Structured actions (optional)
  suggested_exercises?: {
    id: string;
    title: LocalizedText;
    reason: string;
    priority: number; // 1 (highest) to 5 (lowest)
  }[];
  
  suggested_learning_paths?: {
    id: string;
    title: LocalizedText;
    reason: string;
    relevance_score: number; // 0-100
  }[];
  
  tips?: {
    type: 'rule' | 'technique' | 'safety' | 'study_tip';
    content: string;
    reference?: string; // Law reference, video link, etc.
  }[];
  
  // Interactive elements
  follow_up_questions?: string[]; // Suggested questions user might ask
  
  quick_actions?: {
    label: string;
    action_type: 'navigate' | 'start_exercise' | 'view_stats' | 'custom';
    action_data: any;
  }[];
  
  // Metadata
  response_id: string;
  confidence: number; // 0-100, how confident AI is in response
  requires_human_review: boolean; // Flag for admin review queue
  sources?: string[]; // References used
}
```

### 3.2 Performance Analysis Response

```typescript
interface PerformanceAnalysisResponse {
  // Summary
  summary: string; // Natural language summary
  
  // Key achievements
  achievements: {
    type: 'completion' | 'improvement' | 'milestone' | 'streak';
    description: string;
    icon?: string; // Emoji or icon name
    significance: 'minor' | 'moderate' | 'major';
  }[];
  
  // Insights
  insights: {
    category: string; // What area this is about
    insight: string; // The insight itself
    evidence: string; // What data supports this
    trend: 'positive' | 'neutral' | 'negative';
  }[];
  
  // Next steps
  next_steps: {
    step: string;
    priority: 'high' | 'medium' | 'low';
    estimated_time_minutes: number;
    exercise_ids?: string[];
  }[];
  
  // Readiness assessment
  readiness: {
    ready_for_next: boolean;
    confidence_percentage: number;
    reasoning: string;
    next_recommended_exercise?: {
      id: string;
      title: LocalizedText;
      reason: string;
    };
  };
}
```

### 3.3 Learning Plan Response

```typescript
interface LearningPlanResponse {
  // Plan overview
  plan_id: string;
  title: string;
  goal: string;
  
  // Timeline
  start_date: Date;
  target_completion_date: Date;
  total_duration_days: number;
  estimated_hours_total: number;
  
  // Feasibility
  is_realistic: boolean;
  confidence_score: number; // 0-100
  assumptions: string[]; // What plan assumes (e.g., "5 hrs/week practice")
  
  // Weekly breakdown
  weekly_plan: {
    week_number: number;
    week_start_date: Date;
    focus_areas: string[];
    
    // Daily breakdown
    daily_schedule: {
      day: string; // 'Monday', 'Tuesday', etc.
      practice_hours: number;
      exercises: {
        id: string;
        title: LocalizedText;
        estimated_minutes: number;
        priority: 'must_do' | 'should_do' | 'optional';
      }[];
    }[];
    
    // Week goals
    goals: string[];
    milestones: string[];
  }[];
  
  // Critical path
  must_complete_exercises: string[]; // Exercise IDs that are critical
  
  // Risk assessment
  risks: {
    risk: string;
    likelihood: 'low' | 'medium' | 'high';
    mitigation: string;
  }[];
  
  // Progress tracking
  checkpoints: {
    date: Date;
    description: string;
    success_criteria: string;
  }[];
}
```

### 3.4 Weekly Insights Response

```typescript
interface WeeklyInsightsResponse {
  // Time period
  week_start: Date;
  week_end: Date;
  
  // Summary
  headline: string; // One-sentence summary
  overall_sentiment: 'excellent' | 'good' | 'okay' | 'needs_improvement';
  
  // Key stats
  key_stats: {
    exercises_completed: number;
    practice_hours: number;
    streak_days: number;
    paths_active: number;
  };
  
  // Highlights
  highlights: {
    type: 'achievement' | 'improvement' | 'milestone';
    description: string;
    icon?: string;
  }[];
  
  // Patterns noticed
  patterns: {
    pattern: string;
    category: 'positive' | 'neutral' | 'negative';
    evidence: string;
    suggestion?: string;
  }[];
  
  // Recommendations for next week
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    recommendation: string;
    reason: string;
    exercises?: {
      id: string;
      title: LocalizedText;
    }[];
  }[];
  
  // Areas needing attention
  attention_areas: {
    skill_area: string;
    reason: string;
    days_since_practice: number;
    suggested_action: string;
  }[];
  
  // Motivational message
  encouragement: string;
}
```

---

## 4. Context Building Performance

### 4.1 Query Optimization

```typescript
/**
 * Efficient context builder that minimizes DB queries
 * Uses parallel queries and caching
 */
class OptimizedAIContextBuilder {
  async buildContext(
    userId: string, 
    options: {
      includeExerciseHistory?: boolean;
      includePatterns?: boolean;
      includeConversationHistory?: boolean;
      exerciseId?: string;
      learningPathId?: string;
    }
  ): Promise<AIConversationContext> {
    
    // Parallel fetch of core data
    const [
      userProfile,
      overallProgress,
      learningPathProgress,
      performance
    ] = await Promise.all([
      this.getUserProfile(userId), // Single query
      this.getOverallProgress(userId), // Uses materialized view
      this.getLearningPathProgress(userId), // Single query with aggregation
      this.getPerformanceMetrics(userId) // Multiple queries, but parallelized
    ]);
    
    // Conditional data based on options
    const exerciseContext = options.exerciseId 
      ? await this.getExerciseContext(options.exerciseId)
      : undefined;
    
    const exerciseHistory = options.includeExerciseHistory && options.exerciseId
      ? await this.getExerciseHistory(userId, options.exerciseId)
      : undefined;
    
    const patterns = options.includePatterns
      ? await this.getActivePatterns(userId)
      : undefined;
    
    const conversationHistory = options.includeConversationHistory
      ? await this.getRecentConversations(userId, 5) // Last 5 messages
      : undefined;
    
    return {
      session_id: generateUUID(),
      timestamp: new Date(),
      locale: userProfile.language_preference,
      screen_context: this.determineScreenContext(options),
      user: userProfile,
      current_exercise: exerciseContext,
      exercise_history: exerciseHistory,
      learning_path_progress: learningPathProgress,
      overall_progress: overallProgress,
      performance,
      patterns,
      conversation_history: conversationHistory,
      privacy_settings: await this.getPrivacySettings(userId)
    };
  }
  
  /**
   * Cached user profile (updates only when profile changes)
   */
  @Cache({ ttl: 300, key: (userId) => `user:profile:${userId}` })
  async getUserProfile(userId: string): Promise<UserProfile> {
    // Implementation
  }
  
  /**
   * Use materialized view for fast overall progress
   */
  async getOverallProgress(userId: string): Promise<OverallProgress> {
    const { data } = await this.supabase
      .from('user_progress_summary')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Additional calculations
    return this.enrichProgressData(data);
  }
}
```

### 4.2 Caching Strategy

```typescript
/**
 * Multi-level caching for AI context
 */
interface CacheConfig {
  // Level 1: In-memory (Node.js process)
  memoryCache: {
    userProfile: 5 * 60 * 1000, // 5 minutes
    exerciseContent: 15 * 60 * 1000, // 15 minutes
    learningPaths: 15 * 60 * 1000
  };
  
  // Level 2: Redis (shared across instances)
  redisCache: {
    overallProgress: 60 * 1000, // 1 minute
    categoryProficiency: 5 * 60 * 1000, // 5 minutes
    patterns: 10 * 60 * 1000 // 10 minutes
  };
  
  // Invalidation triggers
  invalidateOn: {
    exerciseCompletion: ['overallProgress', 'categoryProficiency', 'patterns'],
    profileUpdate: ['userProfile'],
    pathChange: ['learningPaths']
  };
}
```

---

## 5. Privacy & Security

### 5.1 PII Handling

```typescript
/**
 * Sanitize context before sending to AI
 * Remove/hash any PII
 */
function sanitizeContextForAI(context: AIConversationContext): AIConversationContext {
  return {
    ...context,
    user: {
      ...context.user,
      id: hashUserId(context.user.id), // Replace UUID with hash
      // Remove any PII if it exists
    },
    // Never include email, phone, real name, etc.
    conversation_history: context.conversation_history?.map(msg => ({
      ...msg,
      // Remove any user-entered PII from messages
      content: removePII(msg.content)
    }))
  };
}
```

### 5.2 Audit Logging

```sql
-- Log all AI interactions for privacy audits
CREATE TABLE ai_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'context_built', 'ai_query', 'response_delivered'
  
  -- What was accessed
  data_accessed JSONB, -- List of tables/fields queried
  context_size_bytes INTEGER,
  
  -- Results
  success BOOLEAN,
  error_message TEXT,
  
  -- Privacy
  pii_detected BOOLEAN DEFAULT false,
  pii_sanitized BOOLEAN DEFAULT false,
  
  -- Performance
  duration_ms INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_ai_audit_log_user (user_id),
  INDEX idx_ai_audit_log_created (created_at DESC)
);
```

---

**End of Schema Document**
