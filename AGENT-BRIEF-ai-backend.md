# Agent Brief: AI Backend (BYOK + Multi-Provider)

**Agent ID:** ai-backend-vromm  
**Phase:** Phase 1 - MVP  
**Duration:** Week 2 (5 days)  
**Branch:** feature/ai-assistant-implementation

---

## Mission

Build the backend infrastructure for the Vromm AI Assistant. Implement a Supabase Edge Function that supports multi-provider AI (OpenAI, Claude, Gemini) with BYOK (Bring Your Own Key) logic and 3-tier rate limiting.

---

## Scope

### In Scope ✅
1. **Supabase Edge Function** (`ai-chat`) - AI proxy with BYOK support
2. **Multi-Provider Logic** - OpenAI, Claude, Gemini switching
3. **BYOK System** - User API key management + encryption
4. **Rate Limiting** - Per-tier limits (Free/BYOK/Premium)
5. **Conversation Storage** - Save chat history to database
6. **Cost Tracking** - Log token usage + cost per message
7. **Error Handling** - Retry logic, fallback providers

### Out of Scope ❌
- Chat UI (handled by ai-chat-ui-vromm agent)
- Settings UI (handled by ai-settings-ui-vromm agent)
- Content search (Phase 3)
- Route generation (Phase 4)

---

## Technical Requirements

### Stack
- **Runtime:** Deno (Supabase Edge Functions)
- **Database:** Supabase PostgreSQL
- **AI SDKs:** OpenAI, Anthropic, Google Generative AI
- **Encryption:** Web Crypto API (for user API keys)

### File Structure
```
supabase/
  functions/
    ai-chat/
      index.ts                  # Main Edge Function
      providers/
        openai.ts               # OpenAI integration
        anthropic.ts            # Claude integration
        google.ts               # Gemini integration
      utils/
        rateLimiter.ts          # Per-tier rate limiting
        encryption.ts           # API key encryption/decryption
        costCalculator.ts       # Token cost tracking
      types.ts                  # TypeScript interfaces
  migrations/
    20260214_ai_assistant.sql  # Database schema
```

---

## Database Schema

### Tables

#### 1. `user_ai_settings` (User API Keys + Tier)
```sql
CREATE TABLE user_ai_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free', -- 'free' | 'byok' | 'premium'
  encrypted_api_keys JSONB, -- {openai: '...', anthropic: '...', google: '...'}
  preferred_provider TEXT DEFAULT 'openai', -- 'openai' | 'anthropic' | 'google'
  daily_usage INTEGER DEFAULT 0,
  monthly_usage INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_ai_settings_user_id ON user_ai_settings(user_id);
CREATE INDEX idx_user_ai_settings_tier ON user_ai_settings(tier);
```

#### 2. `ai_conversations` (Chat History)
```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL, -- [{role, content, timestamp}]
  model_used TEXT NOT NULL, -- 'gpt-4o' | 'claude-sonnet-4' | 'gemini-2.5-pro'
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_created_at ON ai_conversations(created_at);
```

#### 3. `ai_usage_logs` (Rate Limiting + Analytics)
```sql
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  tier TEXT NOT NULL,
  provider TEXT NOT NULL,
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_logs_user_id_created_at ON ai_usage_logs(user_id, created_at);
CREATE INDEX idx_ai_usage_logs_tier ON ai_usage_logs(tier);
```

---

## Edge Function Implementation

### Main Handler (`index.ts`)
```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit } from './utils/rateLimiter.ts';
import { callOpenAI, callClaude, callGemini } from './providers/index.ts';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Get user from JWT
  const authHeader = req.headers.get('Authorization');
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''));
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  // Get request body
  const { message, conversationId } = await req.json();

  // Get user AI settings
  const { data: settings } = await supabase
    .from('user_ai_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (!settings) {
    // Create default free tier settings
    await supabase.from('user_ai_settings').insert({
      user_id: user.id,
      tier: 'free',
      daily_usage: 0,
      monthly_usage: 0,
    });
    settings = { tier: 'free', daily_usage: 0, preferred_provider: 'openai' };
  }

  // Check rate limit
  const rateLimitOk = await checkRateLimit(supabase, user.id, settings.tier, settings.daily_usage);
  if (!rateLimitOk) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        tier: settings.tier,
        limit: settings.tier === 'free' ? 10 : 100,
      }),
      { status: 429 }
    );
  }

  // Call AI provider
  let response;
  try {
    if (settings.tier === 'byok') {
      // Use user's API key
      response = await callWithUserKey(settings, message);
    } else {
      // Use Vromm's API key
      response = await callWithVrommKey(settings.preferred_provider, message);
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // Update usage counters
  await supabase
    .from('user_ai_settings')
    .update({
      daily_usage: settings.daily_usage + 1,
      monthly_usage: settings.monthly_usage + 1,
    })
    .eq('user_id', user.id);

  // Save conversation
  await supabase.from('ai_conversations').insert({
    user_id: user.id,
    messages: [
      { role: 'user', content: message, timestamp: new Date() },
      { role: 'assistant', content: response.content, timestamp: new Date() },
    ],
    model_used: response.model,
    tokens_used: response.tokens,
    cost_usd: response.cost,
  });

  return new Response(JSON.stringify({ content: response.content }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### Rate Limiter (`utils/rateLimiter.ts`)
```typescript
const RATE_LIMITS = {
  free: { daily: 10, perMinute: 2 },
  byok: { daily: Infinity, perMinute: 10 },
  premium: { daily: 100, perMinute: 5 },
};

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  tier: string,
  dailyUsage: number
): Promise<boolean> {
  const limit = RATE_LIMITS[tier as keyof typeof RATE_LIMITS];

  // Check daily limit
  if (dailyUsage >= limit.daily) {
    return false;
  }

  // Check per-minute limit
  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const { count } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneMinuteAgo.toISOString());

  if (count && count >= limit.perMinute) {
    return false;
  }

  return true;
}
```

### Provider: OpenAI (`providers/openai.ts`)
```typescript
import OpenAI from 'openai';

export async function callOpenAI(message: string, apiKey: string) {
  const openai = new OpenAI({ apiKey });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'Du är en AI-assistent för körelever.' },
      { role: 'user', content: message },
    ],
  });

  return {
    content: response.choices[0].message.content,
    model: 'gpt-4o',
    tokens: response.usage?.total_tokens || 0,
    cost: calculateCost(response.usage?.total_tokens || 0, 'gpt-4o'),
  };
}
```

---

## API Key Encryption

```typescript
// utils/encryption.ts
const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY')!;

export async function encryptApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

  return btoa(String.fromCharCode(...iv, ...new Uint8Array(encrypted)));
}

export async function decryptApiKey(encryptedKey: string): Promise<string> {
  const decoder = new TextDecoder();
  const data = Uint8Array.from(atob(encryptedKey), (c) => c.charCodeAt(0));

  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(ENCRYPTION_KEY),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

  return decoder.decode(decrypted);
}
```

---

## Testing Checklist

- [ ] Free tier rate limit enforced (10/day)
- [ ] BYOK tier uses user API key correctly
- [ ] Premium tier rate limit enforced (100/day)
- [ ] Multi-provider fallback works (OpenAI → Claude → Gemini)
- [ ] Encrypted API keys stored securely
- [ ] Cost tracking accurate
- [ ] Conversation history saved correctly
- [ ] Error handling for invalid API keys

---

## Acceptance Criteria

1. ✅ Edge Function deploys successfully
2. ✅ Rate limiting works per tier
3. ✅ BYOK users can use their own API keys
4. ✅ Free users get 10 queries/day
5. ✅ Premium users get 100 queries/day
6. ✅ Conversation history saved to database
7. ✅ Cost tracking logged per message
8. ✅ Error handling for all edge cases

---

## Dependencies

**Needs:** ai-database-vromm (schema must exist)  
**Blocks:** ai-chat-ui-vromm (UI needs backend to test)

---

## Deliverables

1. `supabase/functions/ai-chat/index.ts` - Main Edge Function
2. `supabase/functions/ai-chat/providers/*.ts` - Provider integrations
3. `supabase/functions/ai-chat/utils/*.ts` - Utilities
4. `supabase/migrations/20260214_ai_assistant.sql` - Database schema

**Total estimated:** ~1,200 lines of code

---

**Status:** 🟢 Ready to start  
**Priority:** P0 (critical path)  
**Estimated Time:** 3-4 days
