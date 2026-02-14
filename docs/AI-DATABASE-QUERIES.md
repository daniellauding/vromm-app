# AI Database Queries Reference

**Version:** 1.0  
**Related:** AI-LEARNINGPATH-INTEGRATION.md, AI-CONTEXT-DATA-SCHEMA.md  
**Purpose:** SQL queries for building AI context

---

## 1. User Profile Queries

### 1.1 Get User Base Profile

```sql
-- Get user's basic profile and learning preferences
SELECT 
  u.id,
  u.raw_app_meta_data->>'experience_level' as experience_level,
  u.raw_app_meta_data->>'vehicle_type' as vehicle_type,
  u.raw_app_meta_data->>'transmission_preference' as transmission_preference,
  p.language_preference,
  EXTRACT(DAY FROM NOW() - u.created_at)::INTEGER as days_since_signup,
  
  -- Practice stats (from completions)
  COALESCE((
    SELECT COUNT(DISTINCT DATE(completed_at))
    FROM learning_path_exercise_completions
    WHERE user_id = u.id AND completed_at IS NOT NULL
  ), 0) as days_active,
  
  COALESCE((
    SELECT COUNT(DISTINCT exercise_id)
    FROM learning_path_exercise_completions
    WHERE user_id = u.id AND completed_at IS NOT NULL
  ), 0) as total_exercises_completed,
  
  COALESCE((
    SELECT COUNT(DISTINCT learning_path_id)
    FROM learning_path_exercise_completions lpec
    JOIN learning_path_exercises lpe ON lpe.id = lpec.exercise_id
    WHERE lpec.user_id = u.id
  ), 0) as total_learning_paths_started

FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.id = $user_id;
```

### 1.2 Get User Goals

```sql
-- Get user's stated goals (if feature exists)
SELECT 
  goal_type, -- 'test_prep', 'skill_building', 'confidence'
  target_date,
  weekly_practice_hours_goal,
  specific_skills_focus,
  created_at,
  updated_at
FROM user_goals
WHERE user_id = $user_id
  AND is_active = true
ORDER BY created_at DESC
LIMIT 1;
```

---

## 2. Exercise Context Queries

### 2.1 Get Exercise Details

```sql
-- Get complete exercise information
SELECT 
  e.id,
  e.title,
  e.description,
  e.repeat_count,
  e.order_index,
  e.bypass_order,
  e.is_locked,
  e.youtube_url,
  e.icon,
  e.image,
  e.embed_code,
  e.has_quiz,
  e.quiz_required,
  e.quiz_pass_score,
  
  -- Learning path context
  lp.id as learning_path_id,
  lp.title as learning_path_title,
  lp.description as learning_path_description,
  lp.vehicle_type,
  lp.transmission_type,
  lp.experience_level,
  
  -- Position in path
  (
    SELECT COUNT(*) 
    FROM learning_path_exercises 
    WHERE learning_path_id = e.learning_path_id
  ) as total_exercises_in_path,
  
  -- Difficulty estimate (based on tags)
  e.difficulty_level,
  e.tags,
  
  -- Media availability
  CASE WHEN e.youtube_url IS NOT NULL THEN true ELSE false END as has_video,
  CASE WHEN e.image IS NOT NULL THEN true ELSE false END as has_images

FROM learning_path_exercises e
JOIN learning_paths lp ON lp.id = e.learning_path_id
WHERE e.id = $exercise_id;
```

### 2.2 Get User's Exercise History

```sql
-- Get complete history for specific exercise
WITH attempt_stats AS (
  SELECT 
    COUNT(*) as total_attempts,
    COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as total_completions,
    MIN(created_at) as first_attempt_date,
    MAX(created_at) as last_attempt_date,
    MAX(CASE WHEN completed_at IS NOT NULL THEN completed_at END) as last_completion_date,
    
    -- Time metrics (for completed attempts)
    AVG(
      CASE WHEN completed_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (completed_at - created_at))
      ELSE NULL END
    ) as avg_completion_seconds,
    
    MIN(
      CASE WHEN completed_at IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (completed_at - created_at))
      ELSE NULL END
    ) as fastest_completion_seconds,
    
    -- Recent trend (last 3 completions)
    ARRAY_AGG(
      EXTRACT(EPOCH FROM (completed_at - created_at))
      ORDER BY completed_at DESC
    ) FILTER (WHERE completed_at IS NOT NULL) as recent_completion_times
    
  FROM learning_path_exercise_completions
  WHERE user_id = $user_id 
    AND exercise_id = $exercise_id
),
quiz_stats AS (
  SELECT 
    COUNT(*) as quiz_attempts,
    COUNT(CASE WHEN score >= $exercise_pass_score THEN 1 END) as quiz_completions,
    AVG(score) as quiz_average_score,
    MAX(score) as quiz_best_score,
    ARRAY_AGG(score ORDER BY created_at DESC) as all_quiz_scores
  FROM quiz_attempts
  WHERE user_id = $user_id 
    AND exercise_id = $exercise_id
)
SELECT 
  a.*,
  COALESCE(a.total_completions::FLOAT / NULLIF(a.total_attempts, 0), 0) as completion_rate,
  EXTRACT(DAY FROM NOW() - a.last_attempt_date)::INTEGER as days_since_last_attempt,
  
  -- Time trend
  CASE 
    WHEN ARRAY_LENGTH(a.recent_completion_times, 1) >= 3 THEN
      CASE 
        WHEN a.recent_completion_times[1] < a.recent_completion_times[3] THEN 'improving'
        WHEN a.recent_completion_times[1] > a.recent_completion_times[3] * 1.2 THEN 'declining'
        ELSE 'stable'
      END
    ELSE 'insufficient_data'
  END as time_trend,
  
  -- Quiz data
  COALESCE(q.quiz_attempts, 0) as quiz_attempts,
  COALESCE(q.quiz_completions, 0) as quiz_completions,
  q.quiz_average_score,
  q.quiz_best_score,
  q.all_quiz_scores as quiz_scores,
  
  -- Quiz trend
  CASE 
    WHEN ARRAY_LENGTH(q.all_quiz_scores, 1) >= 3 THEN
      CASE 
        WHEN q.all_quiz_scores[1] > q.all_quiz_scores[3] + 10 THEN 'improving'
        WHEN q.all_quiz_scores[1] < q.all_quiz_scores[3] - 10 THEN 'declining'
        ELSE 'stable'
      END
    ELSE NULL
  END as quiz_score_trend

FROM attempt_stats a
LEFT JOIN quiz_stats q ON true;
```

### 2.3 Get Related Exercises

```sql
-- Find exercises related to current one (same tags, similar difficulty)
WITH current_exercise AS (
  SELECT tags, difficulty_level, learning_path_id
  FROM learning_path_exercises
  WHERE id = $exercise_id
),
user_completions AS (
  SELECT exercise_id
  FROM learning_path_exercise_completions
  WHERE user_id = $user_id AND completed_at IS NOT NULL
)
SELECT 
  e.id,
  e.title,
  e.description,
  e.difficulty_level,
  e.tags,
  e.order_index,
  
  -- Similarity score (based on shared tags)
  (
    SELECT COUNT(*)::FLOAT 
    FROM UNNEST($current_exercise_tags::TEXT[]) tag1
    WHERE tag1 = ANY(e.tags)
  ) / GREATEST(
    ARRAY_LENGTH($current_exercise_tags, 1), 
    ARRAY_LENGTH(e.tags, 1)
  ) as similarity_score,
  
  -- Completion status
  CASE WHEN uc.exercise_id IS NOT NULL THEN true ELSE false END as is_completed,
  
  -- Relationship type
  CASE 
    WHEN e.order_index < $current_order_index AND e.learning_path_id = ce.learning_path_id 
      THEN 'prerequisite'
    WHEN e.order_index > $current_order_index AND e.learning_path_id = ce.learning_path_id 
      THEN 'follow_up'
    WHEN e.difficulty_level = ce.difficulty_level 
      THEN 'similar'
    ELSE 'alternative'
  END as relationship

FROM learning_path_exercises e
CROSS JOIN current_exercise ce
LEFT JOIN user_completions uc ON uc.exercise_id = e.id
WHERE e.id != $exercise_id
  AND (
    e.tags && $current_exercise_tags -- Has at least one common tag
    OR e.learning_path_id = ce.learning_path_id -- Same learning path
  )
ORDER BY similarity_score DESC, e.order_index ASC
LIMIT 5;
```

---

## 3. Learning Path Progress Queries

### 3.1 Get All Learning Path Progress

```sql
-- Get summary of all learning paths the user has interacted with
WITH path_exercises AS (
  SELECT 
    lp.id as path_id,
    lp.title,
    lp.description,
    lp.vehicle_type,
    lp.experience_level,
    lp.active,
    COUNT(DISTINCT lpe.id) as total_exercises,
    COUNT(DISTINCT lpec.exercise_id) FILTER (WHERE lpec.completed_at IS NOT NULL) as completed_exercises,
    MIN(lpec.created_at) as started_date,
    MAX(lpec.created_at) as last_activity_date,
    MAX(lpec.completed_at) as last_completion_date,
    
    -- Quiz performance in this path
    AVG(qa.score) as avg_quiz_score
    
  FROM learning_paths lp
  JOIN learning_path_exercises lpe ON lpe.learning_path_id = lp.id
  LEFT JOIN learning_path_exercise_completions lpec 
    ON lpec.exercise_id = lpe.id AND lpec.user_id = $user_id
  LEFT JOIN quiz_attempts qa 
    ON qa.exercise_id = lpe.id AND qa.user_id = $user_id
  WHERE lp.active = true
  GROUP BY lp.id, lp.title, lp.description, lp.vehicle_type, lp.experience_level, lp.active
)
SELECT 
  path_id as id,
  title,
  description,
  vehicle_type,
  experience_level,
  total_exercises,
  completed_exercises,
  ROUND(
    COALESCE(completed_exercises::FLOAT / NULLIF(total_exercises, 0) * 100, 0)::NUMERIC, 
    2
  ) as progress_percentage,
  
  -- Status
  CASE 
    WHEN started_date IS NULL THEN 'not_started'
    WHEN completed_exercises = total_exercises THEN 'completed'
    ELSE 'in_progress'
  END as status,
  
  -- Active if practiced in last 7 days
  CASE WHEN last_activity_date >= NOW() - INTERVAL '7 days' THEN true ELSE false END as is_active,
  
  started_date,
  last_activity_date,
  CASE WHEN completed_exercises = total_exercises THEN last_completion_date ELSE NULL END as completed_date,
  
  avg_quiz_score
  
FROM path_exercises
ORDER BY 
  CASE WHEN is_active THEN 0 ELSE 1 END, -- Active paths first
  last_activity_date DESC NULLS LAST,
  progress_percentage DESC;
```

### 3.2 Get Current Learning Path Context

```sql
-- Get detailed context for the learning path containing current exercise
WITH user_progress AS (
  SELECT 
    exercise_id,
    completed_at IS NOT NULL as is_completed
  FROM learning_path_exercise_completions
  WHERE user_id = $user_id
)
SELECT 
  lp.id,
  lp.title,
  lp.description,
  lp.vehicle_type,
  lp.transmission_type,
  lp.experience_level,
  lp.purpose,
  
  -- Exercise counts
  (SELECT COUNT(*) FROM learning_path_exercises WHERE learning_path_id = lp.id) as total_exercises,
  (
    SELECT COUNT(*) 
    FROM learning_path_exercises lpe
    JOIN user_progress up ON up.exercise_id = lpe.id
    WHERE lpe.learning_path_id = lp.id AND up.is_completed
  ) as completed_exercises,
  
  -- Progress percentage
  ROUND(
    (SELECT COUNT(*) FROM learning_path_exercises lpe JOIN user_progress up ON up.exercise_id = lpe.id WHERE lpe.learning_path_id = lp.id AND up.is_completed)::FLOAT 
    / (SELECT COUNT(*) FROM learning_path_exercises WHERE learning_path_id = lp.id)::FLOAT 
    * 100, 
    2
  ) as progress_percentage,
  
  -- Current exercise position
  (
    SELECT order_index 
    FROM learning_path_exercises 
    WHERE id = $exercise_id
  ) as current_exercise_index,
  
  -- Next incomplete exercises (up to 3)
  (
    SELECT JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'id', lpe.id,
        'title', lpe.title,
        'is_locked', COALESCE(lpe.is_locked, false),
        'order_index', lpe.order_index
      )
      ORDER BY lpe.order_index
    )
    FROM learning_path_exercises lpe
    LEFT JOIN user_progress up ON up.exercise_id = lpe.id
    WHERE lpe.learning_path_id = lp.id
      AND (up.is_completed IS NULL OR up.is_completed = false)
      AND lpe.order_index > (SELECT order_index FROM learning_path_exercises WHERE id = $exercise_id)
    LIMIT 3
  ) as next_exercises,
  
  -- Timing
  (
    SELECT MIN(created_at)
    FROM learning_path_exercise_completions lpec
    JOIN learning_path_exercises lpe ON lpe.id = lpec.exercise_id
    WHERE lpe.learning_path_id = lp.id AND lpec.user_id = $user_id
  ) as started_date,
  
  (
    SELECT MAX(created_at)
    FROM learning_path_exercise_completions lpec
    JOIN learning_path_exercises lpe ON lpe.id = lpec.exercise_id
    WHERE lpe.learning_path_id = lp.id AND lpec.user_id = $user_id
  ) as last_activity_date

FROM learning_paths lp
WHERE lp.id = (
  SELECT learning_path_id 
  FROM learning_path_exercises 
  WHERE id = $exercise_id
);
```

---

## 4. Overall Progress Queries

### 4.1 Get Complete Progress Summary

```sql
-- Comprehensive user progress across all learning activities
WITH exercise_stats AS (
  SELECT 
    COUNT(DISTINCT exercise_id) as unique_exercises_completed,
    COUNT(*) as total_completions,
    MIN(completed_at) as first_completion,
    MAX(completed_at) as last_completion
  FROM learning_path_exercise_completions
  WHERE user_id = $user_id AND completed_at IS NOT NULL
),
path_stats AS (
  SELECT 
    COUNT(DISTINCT lp.id) as total_paths_available,
    COUNT(DISTINCT CASE WHEN started.path_id IS NOT NULL THEN lp.id END) as paths_started,
    COUNT(DISTINCT CASE WHEN completed.path_id IS NOT NULL THEN lp.id END) as paths_completed,
    COUNT(DISTINCT CASE WHEN active.path_id IS NOT NULL THEN lp.id END) as paths_active
  FROM learning_paths lp
  LEFT JOIN (
    SELECT DISTINCT lpe.learning_path_id as path_id
    FROM learning_path_exercises lpe
    JOIN learning_path_exercise_completions lpec ON lpec.exercise_id = lpe.id
    WHERE lpec.user_id = $user_id
  ) started ON started.path_id = lp.id
  LEFT JOIN (
    SELECT lpe.learning_path_id as path_id
    FROM learning_path_exercises lpe
    LEFT JOIN learning_path_exercise_completions lpec 
      ON lpec.exercise_id = lpe.id AND lpec.user_id = $user_id AND lpec.completed_at IS NOT NULL
    GROUP BY lpe.learning_path_id
    HAVING COUNT(lpe.id) = COUNT(lpec.id)
  ) completed ON completed.path_id = lp.id
  LEFT JOIN (
    SELECT DISTINCT lpe.learning_path_id as path_id
    FROM learning_path_exercises lpe
    JOIN learning_path_exercise_completions lpec ON lpec.exercise_id = lpe.id
    WHERE lpec.user_id = $user_id 
      AND lpec.created_at >= NOW() - INTERVAL '7 days'
  ) active ON active.path_id = lp.id
  WHERE lp.active = true
),
quiz_stats AS (
  SELECT 
    COUNT(*) as total_quiz_attempts,
    AVG(score) as overall_quiz_average
  FROM quiz_attempts
  WHERE user_id = $user_id
)
SELECT 
  -- Exercise stats
  COALESCE(e.unique_exercises_completed, 0) as unique_exercises_completed,
  COALESCE(e.total_completions, 0) as total_completions,
  (SELECT COUNT(*) FROM learning_path_exercises) as total_exercises_available,
  ROUND(
    COALESCE(e.unique_exercises_completed::FLOAT / NULLIF((SELECT COUNT(*) FROM learning_path_exercises), 0) * 100, 0)::NUMERIC,
    2
  ) as global_completion_percentage,
  
  -- Path stats
  COALESCE(p.total_paths_available, 0) as total_learning_paths_available,
  COALESCE(p.paths_started, 0) as total_learning_paths_started,
  COALESCE(p.paths_completed, 0) as total_learning_paths_completed,
  COALESCE(p.paths_active, 0) as active_learning_paths,
  
  -- Practice habits
  (
    SELECT COUNT(DISTINCT DATE(completed_at))
    FROM learning_path_exercise_completions
    WHERE user_id = $user_id AND completed_at IS NOT NULL
  ) as total_practice_days,
  
  -- Current streak calculation (consecutive days)
  (
    WITH daily_activity AS (
      SELECT DISTINCT DATE(completed_at) as practice_date
      FROM learning_path_exercise_completions
      WHERE user_id = $user_id AND completed_at IS NOT NULL
      ORDER BY practice_date DESC
    ),
    streak AS (
      SELECT 
        practice_date,
        practice_date - ROW_NUMBER() OVER (ORDER BY practice_date)::INTEGER as streak_group
      FROM daily_activity
    )
    SELECT COUNT(*)
    FROM streak
    WHERE streak_group = (
      SELECT streak_group FROM streak
      WHERE practice_date = (SELECT MAX(practice_date) FROM daily_activity)
    )
  ) as current_streak_days,
  
  -- Longest streak
  (
    WITH daily_activity AS (
      SELECT DISTINCT DATE(completed_at) as practice_date
      FROM learning_path_exercise_completions
      WHERE user_id = $user_id AND completed_at IS NOT NULL
      ORDER BY practice_date
    ),
    streak AS (
      SELECT 
        practice_date,
        practice_date - ROW_NUMBER() OVER (ORDER BY practice_date)::INTEGER as streak_group
      FROM daily_activity
    )
    SELECT MAX(streak_count)
    FROM (
      SELECT COUNT(*) as streak_count
      FROM streak
      GROUP BY streak_group
    ) streaks
  ) as longest_streak_days,
  
  -- Average exercises per week
  ROUND(
    COALESCE(e.total_completions::FLOAT / NULLIF(
      GREATEST(1, EXTRACT(DAY FROM NOW() - e.first_completion)::FLOAT / 7), 
      0
    ), 0)::NUMERIC,
    1
  ) as average_exercises_per_week,
  
  -- Quiz performance
  COALESCE(q.total_quiz_attempts, 0) as total_quiz_attempts,
  q.overall_quiz_average,
  
  -- Overall completion rate
  COALESCE(
    (SELECT COUNT(*) FROM learning_path_exercise_completions WHERE user_id = $user_id AND completed_at IS NOT NULL)::FLOAT 
    / NULLIF((SELECT COUNT(*) FROM learning_path_exercise_completions WHERE user_id = $user_id), 0),
    0
  ) as overall_completion_rate

FROM exercise_stats e
CROSS JOIN path_stats p
LEFT JOIN quiz_stats q ON true;
```

---

## 5. Performance Metrics Queries

### 5.1 Get Category Proficiency

```sql
-- User's proficiency across different skill categories (based on tags)
WITH exercise_categories AS (
  SELECT 
    lpe.id as exercise_id,
    UNNEST(lpe.tags) as category,
    lpe.difficulty_level
  FROM learning_path_exercises lpe
  WHERE lpe.tags IS NOT NULL AND lpe.tags != '{}'
),
user_attempts AS (
  SELECT 
    exercise_id,
    COUNT(*) as attempts,
    COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completions,
    MAX(completed_at) as last_completion
  FROM learning_path_exercise_completions
  WHERE user_id = $user_id
  GROUP BY exercise_id
),
quiz_performance AS (
  SELECT 
    exercise_id,
    AVG(score) as avg_score
  FROM quiz_attempts
  WHERE user_id = $user_id
  GROUP BY exercise_id
)
SELECT 
  ec.category,
  COUNT(DISTINCT ec.exercise_id) as total_exercises_in_category,
  COUNT(DISTINCT CASE WHEN ua.completions > 0 THEN ec.exercise_id END) as exercises_completed,
  COUNT(DISTINCT CASE WHEN ua.attempts > 0 THEN ec.exercise_id END) as exercises_attempted,
  
  -- Completion rate
  ROUND(
    COALESCE(
      COUNT(DISTINCT CASE WHEN ua.completions > 0 THEN ec.exercise_id END)::FLOAT 
      / NULLIF(COUNT(DISTINCT ec.exercise_id), 0),
      0
    )::NUMERIC * 100,
    2
  ) as completion_rate_percentage,
  
  -- Average score (for exercises with quizzes)
  ROUND(AVG(qp.avg_score)::NUMERIC, 2) as average_quiz_score,
  
  -- Average attempts to complete
  ROUND(
    AVG(CASE WHEN ua.completions > 0 THEN ua.attempts::FLOAT / ua.completions END)::NUMERIC,
    2
  ) as average_attempts_to_complete,
  
  -- Proficiency level
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN ua.completions > 0 THEN ec.exercise_id END)::FLOAT 
         / NULLIF(COUNT(DISTINCT ec.exercise_id), 0) >= 0.8 
      THEN 'mastered'
    WHEN COUNT(DISTINCT CASE WHEN ua.completions > 0 THEN ec.exercise_id END)::FLOAT 
         / NULLIF(COUNT(DISTINCT ec.exercise_id), 0) >= 0.5 
      THEN 'proficient'
    WHEN COUNT(DISTINCT CASE WHEN ua.completions > 0 THEN ec.exercise_id END)::FLOAT 
         / NULLIF(COUNT(DISTINCT ec.exercise_id), 0) >= 0.2 
      THEN 'developing'
    ELSE 'novice'
  END as proficiency_level,
  
  -- Last practice
  MAX(ua.last_completion) as last_practiced_date,
  EXTRACT(DAY FROM NOW() - MAX(ua.last_completion))::INTEGER as days_since_last_practice,
  
  -- Trend (comparing recent 3 to previous 3 completions)
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN ua.completions > 0 THEN ec.exercise_id END) < 6 
      THEN 'insufficient_data'
    ELSE 'stable' -- Simplified; detailed trend analysis would need temporal data
  END as trend

FROM exercise_categories ec
LEFT JOIN user_attempts ua ON ua.exercise_id = ec.exercise_id
LEFT JOIN quiz_performance qp ON qp.exercise_id = ec.exercise_id
GROUP BY ec.category
HAVING COUNT(DISTINCT ec.exercise_id) > 0
ORDER BY completion_rate_percentage DESC, category ASC;
```

### 5.2 Get Recent Improvements

```sql
-- Identify areas where user has improved recently (last 14 days vs previous 14 days)
WITH recent_period AS (
  SELECT 
    UNNEST(lpe.tags) as category,
    COUNT(DISTINCT lpec.exercise_id) FILTER (WHERE lpec.completed_at IS NOT NULL) as completions,
    AVG(qa.score) as avg_score
  FROM learning_path_exercises lpe
  LEFT JOIN learning_path_exercise_completions lpec 
    ON lpec.exercise_id = lpe.id 
    AND lpec.user_id = $user_id
    AND lpec.created_at >= NOW() - INTERVAL '14 days'
  LEFT JOIN quiz_attempts qa 
    ON qa.exercise_id = lpe.id 
    AND qa.user_id = $user_id
    AND qa.created_at >= NOW() - INTERVAL '14 days'
  WHERE lpe.tags IS NOT NULL
  GROUP BY UNNEST(lpe.tags)
),
previous_period AS (
  SELECT 
    UNNEST(lpe.tags) as category,
    COUNT(DISTINCT lpec.exercise_id) FILTER (WHERE lpec.completed_at IS NOT NULL) as completions,
    AVG(qa.score) as avg_score
  FROM learning_path_exercises lpe
  LEFT JOIN learning_path_exercise_completions lpec 
    ON lpec.exercise_id = lpe.id 
    AND lpec.user_id = $user_id
    AND lpec.created_at >= NOW() - INTERVAL '28 days'
    AND lpec.created_at < NOW() - INTERVAL '14 days'
  LEFT JOIN quiz_attempts qa 
    ON qa.exercise_id = lpe.id 
    AND qa.user_id = $user_id
    AND qa.created_at >= NOW() - INTERVAL '28 days'
    AND qa.created_at < NOW() - INTERVAL '14 days'
  WHERE lpe.tags IS NOT NULL
  GROUP BY UNNEST(lpe.tags)
)
SELECT 
  r.category as skill_area,
  'completion_rate' as metric,
  ROUND(
    ((r.completions - COALESCE(p.completions, 0))::FLOAT / NULLIF(p.completions, 1) * 100)::NUMERIC,
    2
  ) as improvement_percentage,
  14 as timeframe_days,
  FORMAT(
    '%s completions in last 14 days vs %s in previous 14 days',
    r.completions,
    COALESCE(p.completions, 0)
  ) as evidence
FROM recent_period r
LEFT JOIN previous_period p ON p.category = r.category
WHERE r.completions > COALESCE(p.completions, 0)
  AND COALESCE(p.completions, 0) > 0

UNION ALL

SELECT 
  r.category as skill_area,
  'quiz_score' as metric,
  ROUND(
    ((r.avg_score - COALESCE(p.avg_score, 0)) / NULLIF(p.avg_score, 1) * 100)::NUMERIC,
    2
  ) as improvement_percentage,
  14 as timeframe_days,
  FORMAT(
    'Average score %.1f%% now vs %.1f%% before',
    r.avg_score,
    COALESCE(p.avg_score, 0)
  ) as evidence
FROM recent_period r
LEFT JOIN previous_period p ON p.category = r.category
WHERE r.avg_score > COALESCE(p.avg_score, 0)
  AND COALESCE(p.avg_score, 0) > 0

ORDER BY improvement_percentage DESC
LIMIT 5;
```

### 5.3 Get Weak Areas

```sql
-- Identify areas needing improvement
WITH category_stats AS (
  SELECT 
    UNNEST(lpe.tags) as category,
    COUNT(DISTINCT lpe.id) as total_exercises,
    COUNT(DISTINCT lpec.exercise_id) FILTER (WHERE lpec.completed_at IS NOT NULL) as completed_exercises,
    COUNT(DISTINCT lpec.exercise_id) FILTER (WHERE lpec.completed_at IS NULL) as attempted_not_completed,
    MAX(lpec.created_at) as last_practiced
  FROM learning_path_exercises lpe
  LEFT JOIN learning_path_exercise_completions lpec 
    ON lpec.exercise_id = lpe.id AND lpec.user_id = $user_id
  WHERE lpe.tags IS NOT NULL
  GROUP BY UNNEST(lpe.tags)
)
SELECT 
  category as skill_area,
  
  -- Issue classification
  CASE 
    WHEN last_practiced IS NULL THEN 'not_practiced'
    WHEN EXTRACT(DAY FROM NOW() - last_practiced) > 14 THEN 'not_practiced'
    WHEN attempted_not_completed >= 3 THEN 'high_attempts'
    WHEN completed_exercises::FLOAT / NULLIF(total_exercises, 0) < 0.3 THEN 'low_completion_rate'
    ELSE 'declining_performance'
  END as issue,
  
  -- Severity
  CASE 
    WHEN attempted_not_completed >= 5 OR (last_practiced IS NULL AND total_exercises >= 5) THEN 'critical'
    WHEN attempted_not_completed >= 3 OR EXTRACT(DAY FROM NOW() - last_practiced) > 21 THEN 'moderate'
    ELSE 'minor'
  END as severity,
  
  -- Metrics
  ROUND(
    COALESCE(completed_exercises::FLOAT / NULLIF(total_exercises, 0), 0)::NUMERIC * 100,
    2
  ) as completion_rate,
  attempted_not_completed as attempts_without_completion,
  last_practiced as last_practiced_date,
  EXTRACT(DAY FROM NOW() - last_practiced)::INTEGER as days_since_practice,
  
  -- Suggestion
  CASE 
    WHEN last_practiced IS NULL THEN 'Start with beginner exercises in this category'
    WHEN attempted_not_completed >= 3 THEN 'Review basics before attempting advanced exercises'
    WHEN EXTRACT(DAY FROM NOW() - last_practiced) > 14 THEN 'Practice this skill to avoid losing proficiency'
    ELSE 'Focus on completing started exercises'
  END as suggested_action

FROM category_stats
WHERE 
  -- Not practiced or low completion rate
  (last_practiced IS NULL AND total_exercises >= 2)
  OR EXTRACT(DAY FROM NOW() - last_practiced) > 14
  OR attempted_not_completed >= 3
  OR (completed_exercises::FLOAT / NULLIF(total_exercises, 0) < 0.3 AND total_exercises >= 3)
ORDER BY 
  CASE severity WHEN 'critical' THEN 1 WHEN 'moderate' THEN 2 ELSE 3 END,
  days_since_practice DESC NULLS FIRST
LIMIT 5;
```

### 5.4 Get Performance by Time of Day

```sql
-- Analyze when user performs best
WITH time_classified AS (
  SELECT 
    exercise_id,
    completed_at,
    CASE 
      WHEN EXTRACT(HOUR FROM completed_at AT TIME ZONE 'UTC') BETWEEN 6 AND 11 THEN 'morning'
      WHEN EXTRACT(HOUR FROM completed_at AT TIME ZONE 'UTC') BETWEEN 12 AND 17 THEN 'afternoon'
      WHEN EXTRACT(HOUR FROM completed_at AT TIME ZONE 'UTC') BETWEEN 18 AND 22 THEN 'evening'
      ELSE 'night'
    END as time_of_day,
    EXTRACT(EPOCH FROM (completed_at - created_at)) as completion_time_seconds
  FROM learning_path_exercise_completions
  WHERE user_id = $user_id AND completed_at IS NOT NULL
),
quiz_by_time AS (
  SELECT 
    CASE 
      WHEN EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') BETWEEN 6 AND 11 THEN 'morning'
      WHEN EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') BETWEEN 12 AND 17 THEN 'afternoon'
      WHEN EXTRACT(HOUR FROM created_at AT TIME ZONE 'UTC') BETWEEN 18 AND 22 THEN 'evening'
      ELSE 'night'
    END as time_of_day,
    AVG(score) as avg_score
  FROM quiz_attempts
  WHERE user_id = $user_id
  GROUP BY time_of_day
)
SELECT 
  tc.time_of_day,
  CASE tc.time_of_day
    WHEN 'morning' THEN '06:00-12:00'
    WHEN 'afternoon' THEN '12:00-18:00'
    WHEN 'evening' THEN '18:00-23:00'
    ELSE '23:00-06:00'
  END as time_range,
  
  -- Activity
  COUNT(DISTINCT DATE(tc.completed_at)) as sessions,
  COUNT(*) as exercises_completed,
  
  -- Performance
  ROUND(AVG(1.0)::NUMERIC, 2) as average_completion_rate, -- All in this CTE are completed
  ROUND(AVG(qt.avg_score)::NUMERIC, 2) as average_quiz_score,
  ROUND(AVG(tc.completion_time_seconds / 60.0)::NUMERIC, 1) as average_session_length_minutes,
  
  -- Best time indicator
  RANK() OVER (ORDER BY COUNT(*) DESC) = 1 as is_best_time

FROM time_classified tc
LEFT JOIN quiz_by_time qt ON qt.time_of_day = tc.time_of_day
GROUP BY tc.time_of_day
ORDER BY exercises_completed DESC;
```

---

## 6. Pattern Detection Queries

### 6.1 Detect Plateaus

```sql
-- Find exercises where user is stuck (many attempts, no completion)
SELECT 
  e.id as exercise_id,
  e.title,
  COUNT(*) as attempt_count,
  MIN(lpec.created_at) as first_attempt,
  MAX(lpec.created_at) as last_attempt,
  EXTRACT(DAY FROM MAX(lpec.created_at) - MIN(lpec.created_at))::INTEGER as days_stuck,
  
  -- Likely cause analysis
  CASE 
    WHEN e.difficulty_level = 'advanced' AND (
      SELECT AVG(CASE WHEN completed_at IS NOT NULL THEN 1 ELSE 0 END)
      FROM learning_path_exercise_completions
      WHERE user_id = $user_id
        AND exercise_id IN (
          SELECT id FROM learning_path_exercises WHERE difficulty_level IN ('beginner', 'intermediate')
        )
    ) < 0.7 THEN 'difficulty_too_high'
    WHEN e.order_index > 5 AND (
      SELECT COUNT(*)
      FROM learning_path_exercises lpe2
      WHERE lpe2.learning_path_id = e.learning_path_id
        AND lpe2.order_index < e.order_index
        AND NOT EXISTS (
          SELECT 1 FROM learning_path_exercise_completions lpec2
          WHERE lpec2.exercise_id = lpe2.id 
            AND lpec2.user_id = $user_id 
            AND lpec2.completed_at IS NOT NULL
        )
    ) >= 2 THEN 'missing_prerequisite'
    ELSE 'confidence_issue'
  END as likely_cause,
  
  -- Suggested intervention
  CASE 
    WHEN COUNT(*) >= 5 THEN 'switch_exercise'
    WHEN EXTRACT(DAY FROM MAX(lpec.created_at) - MIN(lpec.created_at)) >= 7 THEN 'break_recommended'
    ELSE 'review_basics'
  END as intervention_type

FROM learning_path_exercises e
JOIN learning_path_exercise_completions lpec ON lpec.exercise_id = e.id
WHERE lpec.user_id = $user_id
  AND lpec.completed_at IS NULL
GROUP BY e.id, e.title, e.difficulty_level, e.order_index, e.learning_path_id
HAVING COUNT(*) >= 3
  AND MAX(lpec.created_at) >= NOW() - INTERVAL '14 days'
ORDER BY attempt_count DESC, days_stuck DESC
LIMIT 5;
```

### 6.2 Detect Common Mistakes

```sql
-- Identify recurring quiz mistakes
WITH quiz_errors AS (
  SELECT 
    qa.exercise_id,
    qr.question_id,
    qq.question_text,
    COUNT(*) as times_wrong,
    MAX(qa.created_at) as last_wrong_date
  FROM quiz_attempts qa
  JOIN quiz_responses qr ON qr.attempt_id = qa.id
  JOIN quiz_questions qq ON qq.id = qr.question_id
  WHERE qa.user_id = $user_id
    AND qr.is_correct = false
  GROUP BY qa.exercise_id, qr.question_id, qq.question_text
  HAVING COUNT(*) >= 2
)
SELECT 
  e.id as exercise_id,
  e.title as exercise_title,
  'rule_misunderstanding' as mistake_type,
  FORMAT(
    'Repeatedly incorrect on quiz question: %s',
    qe.question_text
  ) as description,
  qe.times_wrong as occurrences,
  MIN(qa.created_at) as first_seen,
  qe.last_wrong_date as last_seen,
  EXTRACT(DAY FROM qe.last_wrong_date - MIN(qa.created_at))::INTEGER as days_active,
  
  -- Impact
  ARRAY_AGG(DISTINCT e.id) as affected_exercises,
  CASE WHEN e.quiz_required THEN true ELSE false END as blocks_progress

FROM quiz_errors qe
JOIN learning_path_exercises e ON e.id = qe.exercise_id
JOIN quiz_attempts qa ON qa.exercise_id = e.id AND qa.user_id = $user_id
GROUP BY e.id, e.title, qe.question_text, qe.times_wrong, qe.last_wrong_date, e.quiz_required
ORDER BY qe.times_wrong DESC, qe.last_wrong_date DESC
LIMIT 10;
```

### 6.3 Detect Avoidance Patterns

```sql
-- Find categories user is avoiding
WITH all_categories AS (
  SELECT DISTINCT UNNEST(tags) as category
  FROM learning_path_exercises
  WHERE tags IS NOT NULL
),
user_category_activity AS (
  SELECT 
    UNNEST(lpe.tags) as category,
    COUNT(*) as times_practiced
  FROM learning_path_exercises lpe
  JOIN learning_path_exercise_completions lpec ON lpec.exercise_id = lpe.id
  WHERE lpec.user_id = $user_id
    AND lpe.tags IS NOT NULL
  GROUP BY UNNEST(lpe.tags)
)
SELECT 
  ac.category,
  'avoidance' as pattern_type,
  COALESCE(uca.times_practiced, 0) as times_practiced,
  (
    SELECT COUNT(*)
    FROM learning_path_exercises lpe
    WHERE lpe.tags @> ARRAY[ac.category]
  ) as exercises_available,
  
  -- Severity
  CASE 
    WHEN COALESCE(uca.times_practiced, 0) = 0 
      AND (SELECT COUNT(*) FROM learning_path_exercises WHERE tags @> ARRAY[ac.category]) >= 5
      THEN 'critical'
    WHEN COALESCE(uca.times_practiced, 0) <= 1 
      AND (SELECT COUNT(*) FROM learning_path_exercises WHERE tags @> ARRAY[ac.category]) >= 3
      THEN 'moderate'
    ELSE 'minor'
  END as severity,
  
  FORMAT(
    'User has practiced %s category %s times despite %s exercises available',
    ac.category,
    COALESCE(uca.times_practiced, 0),
    (SELECT COUNT(*) FROM learning_path_exercises WHERE tags @> ARRAY[ac.category])
  ) as evidence

FROM all_categories ac
LEFT JOIN user_category_activity uca ON uca.category = ac.category
WHERE (
  COALESCE(uca.times_practiced, 0) = 0
  OR (
    COALESCE(uca.times_practiced, 0)::FLOAT / 
    NULLIF((SELECT COUNT(*) FROM learning_path_exercises WHERE tags @> ARRAY[ac.category]), 0) < 0.1
  )
)
AND (SELECT COUNT(*) FROM learning_path_exercises WHERE tags @> ARRAY[ac.category]) >= 2
ORDER BY severity DESC, exercises_available DESC;
```

---

## 7. Conversation History Queries

### 7.1 Get Recent Conversations

```sql
-- Fetch recent AI conversations for context continuity
SELECT 
  id,
  'user' as role,
  user_message as content,
  created_at as timestamp,
  screen_context,
  exercise_id,
  helpful_rating,
  user_feedback
FROM ai_conversations
WHERE user_id = $user_id
  AND created_at >= NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
  id,
  'ai' as role,
  ai_response as content,
  created_at as timestamp,
  screen_context,
  exercise_id,
  helpful_rating,
  user_feedback
FROM ai_conversations
WHERE user_id = $user_id
  AND created_at >= NOW() - INTERVAL '24 hours'

ORDER BY timestamp ASC
LIMIT $limit;
```

### 7.2 Get Conversation by Session

```sql
-- Fetch complete conversation session
SELECT 
  id,
  CASE 
    WHEN row_number() OVER (PARTITION BY session_id ORDER BY created_at) % 2 = 1 
    THEN 'user' 
    ELSE 'ai' 
  END as role,
  CASE 
    WHEN row_number() OVER (PARTITION BY session_id ORDER BY created_at) % 2 = 1 
    THEN user_message 
    ELSE ai_response 
  END as content,
  created_at as timestamp,
  helpful_rating,
  user_feedback
FROM ai_conversations
WHERE session_id = $session_id
ORDER BY created_at ASC;
```

---

## 8. Readiness Signals

### 8.1 Assess Readiness for Next Exercise

```sql
-- Determine if user is ready to move to next exercise
WITH current_exercise_performance AS (
  SELECT 
    COUNT(*) FILTER (WHERE completed_at IS NOT NULL) as consecutive_completions,
    AVG(score) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as recent_score_average,
    MAX(completed_at) as last_completion
  FROM learning_path_exercise_completions lpec
  LEFT JOIN quiz_attempts qa ON qa.exercise_id = lpec.exercise_id AND qa.user_id = lpec.user_id
  WHERE lpec.user_id = $user_id
    AND lpec.exercise_id = $exercise_id
    AND lpec.created_at >= (
      SELECT MAX(created_at) - INTERVAL '7 days'
      FROM learning_path_exercise_completions
      WHERE user_id = $user_id AND exercise_id = $exercise_id
    )
),
score_trend AS (
  SELECT 
    CASE 
      WHEN COUNT(*) < 3 THEN 'insufficient_data'
      WHEN AVG(score) FILTER (WHERE row_num <= 3) > AVG(score) FILTER (WHERE row_num > 3) + 10 
        THEN 'improving'
      WHEN AVG(score) FILTER (WHERE row_num <= 3) < AVG(score) FILTER (WHERE row_num > 3) - 10 
        THEN 'declining'
      ELSE 'stable'
    END as trend
  FROM (
    SELECT 
      score,
      ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num
    FROM quiz_attempts
    WHERE user_id = $user_id AND exercise_id = $exercise_id
  ) ranked_scores
)
SELECT 
  -- Readiness determination
  CASE 
    WHEN cep.consecutive_completions >= 2 
      AND (cep.recent_score_average >= 70 OR cep.recent_score_average IS NULL)
      AND st.trend IN ('improving', 'stable')
      THEN true
    ELSE false
  END as ready_for_next,
  
  -- Confidence score (0-100)
  LEAST(100, 
    (cep.consecutive_completions * 20) +
    (CASE WHEN cep.recent_score_average >= 80 THEN 30 WHEN cep.recent_score_average >= 70 THEN 20 ELSE 10 END) +
    (CASE st.trend WHEN 'improving' THEN 20 WHEN 'stable' THEN 10 ELSE 0 END)
  ) as confidence_score,
  
  -- Evidence
  cep.consecutive_completions,
  cep.recent_score_average,
  st.trend as score_trend,
  EXTRACT(DAY FROM NOW() - cep.last_completion)::INTEGER as time_since_last_practice_days,
  
  -- Blocking issues (if not ready)
  CASE 
    WHEN cep.consecutive_completions < 2 THEN ARRAY['Need more practice - complete exercise at least once more']
    WHEN cep.recent_score_average < 70 THEN ARRAY['Quiz scores below passing threshold']
    WHEN st.trend = 'declining' THEN ARRAY['Performance declining - review fundamentals']
    ELSE NULL
  END as blocking_issues

FROM current_exercise_performance cep
CROSS JOIN score_trend st;
```

---

## 9. Optimization: Materialized Views

### 9.1 Refresh User Progress Summary

```sql
-- Refresh materialized view for fast context building
REFRESH MATERIALIZED VIEW CONCURRENTLY user_progress_summary;
REFRESH MATERIALIZED VIEW CONCURRENTLY user_category_proficiency;
```

### 9.2 Create Function for Context Building

```sql
-- Function to build core context efficiently
CREATE OR REPLACE FUNCTION get_ai_user_context(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_context JSONB;
BEGIN
  SELECT JSONB_BUILD_OBJECT(
    'user_profile', (
      SELECT JSONB_BUILD_OBJECT(
        'id', id,
        'experience_level', raw_app_meta_data->>'experience_level',
        'days_since_signup', EXTRACT(DAY FROM NOW() - created_at)::INTEGER
      )
      FROM auth.users
      WHERE id = p_user_id
    ),
    'overall_progress', (
      SELECT JSONB_BUILD_OBJECT(
        'unique_exercises_completed', unique_exercises_completed,
        'total_practice_days', total_practice_days,
        'current_streak_days', current_streak_days
      )
      FROM user_progress_summary
      WHERE user_id = p_user_id
    )
  ) INTO v_context;
  
  RETURN v_context;
END;
$$ LANGUAGE plpgsql STABLE;

-- Usage:
-- SELECT get_ai_user_context('user-uuid-here');
```

---

**End of Database Queries Reference**
