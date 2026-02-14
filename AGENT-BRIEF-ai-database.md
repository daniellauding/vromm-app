# Agent Brief: AI Database Schema

**Agent ID:** ai-database-vromm  
**Phase:** Phase 1 - MVP  
**Duration:** 1 day  
**Branch:** feature/ai-assistant-implementation

---

## Mission

Create the database schema for the Vromm AI Assistant. Set up tables for user AI settings, conversation history, usage logs, and prepare for Phase 3 content search (pgvector embeddings).

---

## Scope

### In Scope ✅
1. **user_ai_settings** - User tier + API keys
2. **ai_conversations** - Chat history
3. **ai_usage_logs** - Rate limiting + analytics
4. **pgvector extension** - For Phase 3 semantic search
5. **RLS policies** - Row-level security
6. **Indexes** - Performance optimization

### Out of Scope ❌
- Embedding generation (Phase 3)
- Content search tables (Phase 3)
- Route generation tables (Phase 4)

---

## Database Schema

### Migration File: `20260214_ai_assistant.sql`

```sql
-- Enable pgvector extension (for Phase 3)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- Table 1: user_ai_settings
-- ============================================================
-- Stores user AI tier, API keys (encrypted), and usage counters
CREATE TABLE user_ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Tier: free (10/day) | byok (unlimited) | premium (100/day)
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'byok', 'premium')),
  
  -- Encrypted API keys (JSONB for flexibility)
  -- Format: {"openai": "enc_...", "anthropic": "enc_...", "google": "enc_..."}
  encrypted_api_keys JSONB,
  
  -- Preferred provider when tier is 'free' or 'premium'
  preferred_provider TEXT DEFAULT 'openai' CHECK (preferred_provider IN ('openai', 'anthropic', 'google')),
  
  -- Usage tracking (reset daily/monthly)
  daily_usage INTEGER DEFAULT 0,
  monthly_usage INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_ai_settings
CREATE INDEX idx_user_ai_settings_user_id ON user_ai_settings(user_id);
CREATE INDEX idx_user_ai_settings_tier ON user_ai_settings(tier);
CREATE INDEX idx_user_ai_settings_last_reset ON user_ai_settings(last_reset_date);

-- RLS policies for user_ai_settings
ALTER TABLE user_ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI settings"
  ON user_ai_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI settings"
  ON user_ai_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI settings"
  ON user_ai_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Table 2: ai_conversations
-- ============================================================
-- Stores full conversation history
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Messages as JSONB array: [{role, content, timestamp}]
  messages JSONB NOT NULL,
  
  -- Model used for this conversation
  model_used TEXT NOT NULL,
  
  -- Cost tracking
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ai_conversations
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_created_at ON ai_conversations(created_at DESC);

-- RLS policies for ai_conversations
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON ai_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON ai_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON ai_conversations FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- Table 3: ai_usage_logs
-- ============================================================
-- Logs every AI query for rate limiting + analytics
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  
  -- User tier at time of query
  tier TEXT NOT NULL,
  
  -- Provider used (openai, anthropic, google)
  provider TEXT NOT NULL,
  
  -- Cost tracking
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ai_usage_logs
CREATE INDEX idx_ai_usage_logs_user_id_created_at ON ai_usage_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_usage_logs_tier ON ai_usage_logs(tier);
CREATE INDEX idx_ai_usage_logs_provider ON ai_usage_logs(provider);
CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at DESC);

-- RLS policies for ai_usage_logs (admins only, users can't see raw logs)
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert usage logs"
  ON ai_usage_logs FOR INSERT
  WITH CHECK (true); -- Edge Function uses service role

-- ============================================================
-- Table 4: ai_content_searches (Phase 3 prep)
-- ============================================================
-- Logs AI searches across all content types
CREATE TABLE ai_content_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  
  -- Search query
  query TEXT NOT NULL,
  
  -- Content type searched: route | learning_path | exercise | school | event | instructor
  content_type TEXT NOT NULL CHECK (content_type IN ('route', 'learning_path', 'exercise', 'school', 'event', 'instructor')),
  
  -- Search filters (JSONB for flexibility)
  filters JSONB,
  
  -- Results
  results_count INTEGER,
  selected_content_id UUID, -- ID of content user selected
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ai_content_searches
CREATE INDEX idx_ai_searches_user_id ON ai_content_searches(user_id);
CREATE INDEX idx_ai_searches_content_type ON ai_content_searches(content_type);
CREATE INDEX idx_ai_searches_created_at ON ai_content_searches(created_at DESC);

-- RLS policies for ai_content_searches
ALTER TABLE ai_content_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own searches"
  ON ai_content_searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert searches"
  ON ai_content_searches FOR INSERT
  WITH CHECK (true);

-- ============================================================
-- Preparation for Phase 3: Embeddings
-- ============================================================
-- Add embedding columns to content tables (commented out for Phase 3)
/*
ALTER TABLE routes ADD COLUMN embedding vector(1536);
ALTER TABLE learning_paths ADD COLUMN embedding vector(1536);
ALTER TABLE exercises ADD COLUMN embedding vector(1536);
ALTER TABLE schools ADD COLUMN embedding vector(1536);
ALTER TABLE events ADD COLUMN embedding vector(1536);
ALTER TABLE instructors ADD COLUMN embedding vector(1536);

-- Create vector indexes (Phase 3)
CREATE INDEX idx_routes_embedding ON routes 
USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_learning_paths_embedding ON learning_paths 
USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_exercises_embedding ON exercises 
USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_schools_embedding ON schools 
USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_events_embedding ON events 
USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_instructors_embedding ON instructors 
USING ivfflat (embedding vector_cosine_ops);
*/

-- ============================================================
-- Functions: Daily Usage Reset
-- ============================================================
-- Cron job to reset daily usage counters (run at midnight Swedish time)
CREATE OR REPLACE FUNCTION reset_daily_ai_usage()
RETURNS void AS $$
BEGIN
  UPDATE user_ai_settings
  SET daily_usage = 0,
      last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Functions: Monthly Usage Reset
-- ============================================================
-- Cron job to reset monthly usage counters (run on 1st of month)
CREATE OR REPLACE FUNCTION reset_monthly_ai_usage()
RETURNS void AS $$
BEGIN
  UPDATE user_ai_settings
  SET monthly_usage = 0
  WHERE EXTRACT(DAY FROM CURRENT_DATE) = 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Sample Seed Data (Dev/Testing Only)
-- ============================================================
-- Create test user AI settings (uncomment for local dev)
/*
INSERT INTO user_ai_settings (user_id, tier, daily_usage, monthly_usage)
VALUES
  -- Free tier user
  ('00000000-0000-0000-0000-000000000001', 'free', 5, 120),
  
  -- BYOK user
  ('00000000-0000-0000-0000-000000000002', 'byok', 50, 1200),
  
  -- Premium user
  ('00000000-0000-0000-0000-000000000003', 'premium', 30, 850);
*/
```

---

## Validation Queries

### Check schema created correctly
```sql
-- List all AI tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'ai_%' OR table_name = 'user_ai_settings';

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('user_ai_settings', 'ai_conversations', 'ai_usage_logs', 'ai_content_searches');

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('user_ai_settings', 'ai_conversations', 'ai_usage_logs', 'ai_content_searches');
```

### Test queries
```sql
-- Count users by tier
SELECT tier, COUNT(*) 
FROM user_ai_settings 
GROUP BY tier;

-- Total tokens used (last 7 days)
SELECT SUM(tokens_used) as total_tokens, SUM(cost_usd) as total_cost
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Most active users
SELECT user_id, COUNT(*) as conversation_count
FROM ai_conversations
GROUP BY user_id
ORDER BY conversation_count DESC
LIMIT 10;
```

---

## Testing Checklist

- [ ] Migration runs without errors
- [ ] All 4 tables created
- [ ] All indexes created
- [ ] RLS policies active
- [ ] pgvector extension enabled
- [ ] Reset functions created
- [ ] Validation queries return expected results

---

## Acceptance Criteria

1. ✅ Migration file runs successfully
2. ✅ All tables created with correct schema
3. ✅ RLS policies enforce user privacy
4. ✅ Indexes created for performance
5. ✅ Daily/monthly reset functions work
6. ✅ pgvector extension ready for Phase 3

---

## Dependencies

**Needs:** Supabase project access  
**Blocks:** ai-backend-vromm (needs tables to exist)

---

## Deliverables

1. `supabase/migrations/20260214_ai_assistant.sql` - Full migration
2. `supabase/migrations/20260214_test_queries.sql` - Validation queries

**Total estimated:** ~250 lines of SQL

---

**Status:** 🟢 Ready to start  
**Priority:** P0 (blocking backend)  
**Estimated Time:** 4-6 hours
