# AI Assistant Implementation Roadmap
## Vromm Driving Assistant - Technical Implementation Plan

**Version:** 1.0  
**Date:** 2026-02-14  
**Branch:** `feature/ai-driving-assistant`  
**Total Duration:** ~17 weeks (4 months)  
**Project Type:** Planning & Architecture (No Implementation)

---

## Executive Summary

This roadmap outlines the step-by-step implementation of an AI-powered driving assistant for the Vromm app. The assistant will help users discover routes, understand traffic concepts, and personalize their learning experience through natural language conversation.

**Core Technologies:**
- AI Providers: OpenAI GPT-4, Anthropic Claude, Google Gemini
- Backend: Supabase (PostgreSQL + Edge Functions)
- Frontend: React Native (Expo) + Tamagui
- Maps: OpenStreetMap (OSM) integration
- Languages: Swedish (SWE) + English (ENG)

**Success Criteria:**
- 80% user satisfaction with AI responses
- <2s average response time
- <$0.05 cost per conversation
- 60% feature adoption rate within 3 months

---

## Table of Contents

1. [Phase Overview](#phase-overview)
2. [Detailed Phase Breakdown](#detailed-phase-breakdown)
3. [Dependencies & Prerequisites](#dependencies--prerequisites)
4. [Technical Architecture](#technical-architecture)
5. [Testing Strategy](#testing-strategy)
6. [Rollout Plan](#rollout-plan)
7. [Cost Projections](#cost-projections)
8. [Risk Assessment](#risk-assessment)
9. [Team Structure](#team-structure)
10. [Success Metrics](#success-metrics)
11. [Timeline (Gantt Chart)](#timeline-gantt-chart)

---

## Phase Overview

| Phase | Focus | Duration | Key Deliverables |
|-------|-------|----------|------------------|
| **Phase 1** | MVP (Basic Chat) | 2 weeks | Chat UI, basic Q&A, API integration |
| **Phase 2** | Context-Aware Chat | 3 weeks | Learning path context, progress tracking |
| **Phase 3** | Route Discovery | 3 weeks | Database route search, basic OSM |
| **Phase 4** | Route Generation | 4 weeks | AI-generated routes, advanced OSM |
| **Phase 5** | Personalization | 3 weeks | User patterns, custom plans |
| **Phase 6** | Polish & Launch | 2 weeks | Optimization, multi-language, launch |

**Total:** 17 weeks (~4 months)

---

## Detailed Phase Breakdown

### Phase 1: MVP (Minimum Viable Product)
**Duration:** 2 weeks  
**Goal:** Functional chat interface with basic AI Q&A

#### Week 1: Foundation
**Tasks:**
- [ ] Create AI chat screen UI (`src/screens/AIChatScreen.tsx`)
- [ ] Build chat message components (user/assistant bubbles)
- [ ] Implement chat input with keyboard handling
- [ ] Setup Tamagui-based responsive layout
- [ ] Add basic loading states & error handling
- [ ] Create chat history state management (React Context)

**Technical Decisions:**
- Use Tamagui's Sheet component for expandable chat
- FlatList for message rendering (performance)
- AsyncStorage for local chat persistence
- Separate UI from business logic (clean architecture)

#### Week 2: AI Integration + BYOK (Bring Your Own Key)
**Tasks:**
- [ ] Create Supabase Edge Function for AI proxy (`ai-chat`)
- [ ] Implement multi-provider support (OpenAI, Claude, Gemini)
- [ ] Build BYOK system (user API key management)
- [ ] Create API key storage (encrypted in Supabase)
- [ ] Add tier detection (Free 10/day, BYOK unlimited, Premium 100/day)
- [ ] Add rate limiting per tier
- [ ] Build retry logic with exponential backoff
- [ ] Store chat history in Supabase (`ai_conversations` table)
- [ ] Add basic prompt engineering (system prompt)
- [ ] Implement streaming responses (SSE)

**BYOK Implementation:**
```typescript
// User settings for API keys
interface UserAISettings {
  tier: 'free' | 'byok' | 'premium';
  apiKeys?: {
    openai?: string; // Encrypted at rest
    anthropic?: string;
    google?: string;
  };
  preferredProvider: 'openai' | 'anthropic' | 'google';
  dailyUsage: number; // Reset daily
  monthlyUsage: number; // Reset monthly
}

// Rate limits by tier
const RATE_LIMITS = {
  free: { daily: 10, perMinute: 2 },
  byok: { daily: Infinity, perMinute: 10 },
  premium: { daily: 100, perMinute: 5 },
};
```

**Settings UI:**
```typescript
// Settings → AI Assistant
<Screen>
  <Section title="AI Tier">
    <TierBadge current={userSettings.tier} />
  </Section>
  
  {userSettings.tier === 'free' && (
    <UpgradePrompt>
      <Button onPress={upgradeToPremium}>Upgrade ($4.99/mo, 100/day)</Button>
      <Button onPress={showBYOKSetup}>Or add your API key (unlimited)</Button>
    </UpgradePrompt>
  )}
  
  {userSettings.tier === 'byok' && (
    <Section title="API Keys">
      <Input label="OpenAI API Key" secure value={apiKeys.openai} />
      <Input label="Anthropic API Key" secure value={apiKeys.anthropic} />
      <Input label="Google API Key" secure value={apiKeys.google} />
      <Button onPress={saveKeys}>Save Keys</Button>
    </Section>
  )}
  
  <Section title="Usage This Month">
    <Text>{userSettings.monthlyUsage} queries</Text>
  </Section>
</Screen>
```

**Database Schema:**
```sql
-- ai_conversations table
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  messages JSONB NOT NULL, -- Array of {role, content, timestamp}
  model_used TEXT NOT NULL,
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_created_at ON ai_conversations(created_at);
```

**Deliverables:**
- ✅ Working chat UI
- ✅ AI responses from 3 providers
- ✅ Basic chat history
- ✅ Error handling & retries

**Dependencies:**
- None (greenfield)

**Risks:**
- API key security → Use Supabase Secrets
- Token cost overruns → Implement strict rate limits

---

### Phase 2: Context-Aware Chat
**Duration:** 3 weeks  
**Goal:** AI understands user's learning context

#### Week 3: Context Integration
**Tasks:**
- [ ] Design context injection system
- [ ] Create context builder service (`src/services/aiContextBuilder.ts`)
- [ ] Fetch current learning path from database
- [ ] Extract user progress (completed exercises, scores)
- [ ] Build dynamic system prompt with context
- [ ] Add context token management (stay under 4k tokens)
- [ ] Implement context caching (Redis/Supabase cache)

**Context Structure:**
```typescript
interface AIContext {
  user: {
    id: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    language: 'sv' | 'en';
  };
  learningPath: {
    currentModule: string;
    completedExercises: string[];
    strugglingAreas: string[];
  };
  recentActivity: {
    lastSession: Date;
    recentQuizScores: number[];
    timeSpentLearning: number;
  };
}
```

#### Week 4-5: Inline AI Buttons
**Tasks:**
- [ ] Add "Ask AI" button to exercise screens
- [ ] Create contextual question pre-filling
- [ ] Build quick action buttons (Explain, Example, Quiz)
- [ ] Implement deep linking to chat from any screen
- [ ] Add conversation branching (multiple threads)
- [ ] Create AI suggestion cards (proactive tips)
- [ ] Build notification system for AI insights

**UI Components:**
- `<AskAIButton />` - Floating button on content screens
- `<AIQuickActions />` - Action chips (Explain, Example, etc.)
- `<AISuggestionCard />` - Proactive tips based on progress
- `<AIThreadList />` - Manage multiple conversations

**Deliverables:**
- ✅ Context-aware AI responses
- ✅ Inline AI access from 5+ screens
- ✅ Proactive AI suggestions
- ✅ Multi-threaded conversations

**Dependencies:**
- Phase 1 complete
- Existing learning path data structure

**Risks:**
- Context too large → Implement smart summarization
- Slower responses → Add caching layer

---

### Phase 3: Universal Content Discovery
**Duration:** 3 weeks  
**Goal:** AI helps users find ALL content (routes, learning paths, exercises, schools, events, instructors)

#### Week 6: Multi-Content Search System
**Tasks:**
- [ ] Design universal search query system (multi-table)
- [ ] Create full-text search across 6 content types
- [ ] Build semantic search (embedding-based)
- [ ] Add content-specific filters (difficulty, location, price, etc.)
- [ ] Implement content ranking algorithm
- [ ] Cache popular searches
- [ ] Create cross-content recommendation engine

**Search Scope (6 Content Types):**

1. **Routes** - "Hitta nybörjarrutt med rondeller"
2. **Learning Paths** - "Visa uppgifter om parkering"
3. **Exercises** - "Hitta övningar för motorväg"
4. **Schools** - "Vilka körskolor finns i Lund?"
5. **Events** - "Visa kommande kurser"
6. **Instructors** - "Hitta handledare nära mig"

**Preview-First UX Flow:**
```
User query → AI parses → Search DB → Return results
  ↓
Inline preview cards in chat (compact: image + title + 1-2 details)
  ↓
User taps card → Open EXISTING DetailSheet component
  ↓
DetailSheet shows full info → User can save/buy/book/contact
```

**Sheet Reuse Pattern (Zero New UI):**
- Routes → `RoutePreviewSheet` (new, minimal) → `CreateRouteSheet` (existing)
- Learning Paths → `LearningPathDetailSheet` (existing, direct)
- Exercises → `ExerciseDetailSheet` (existing, direct)
- Schools → `SchoolDetailSheet` (existing, direct)
- Events → `EventDetailSheet` (existing, direct)
- Instructors → `InstructorDetailSheet` (existing, direct)

**Search Features:**
- Natural language queries (Swedish/English)
- Multi-criteria filtering per content type
- Semantic matching (understand intent, not just keywords)
- Popularity-based ranking
- Cross-content recommendations ("Users who liked this route also tried these exercises")

**Database Updates:**
```sql
-- Add vector search support (pgvector extension)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embeddings columns for semantic search (all content types)
ALTER TABLE routes ADD COLUMN embedding vector(1536);
ALTER TABLE learning_paths ADD COLUMN embedding vector(1536);
ALTER TABLE exercises ADD COLUMN embedding vector(1536);
ALTER TABLE schools ADD COLUMN embedding vector(1536);
ALTER TABLE events ADD COLUMN embedding vector(1536);
ALTER TABLE instructors ADD COLUMN embedding vector(1536);

-- Create search indexes (one per content type)
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

-- Create universal AI search log
CREATE TABLE ai_content_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  query TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'route' | 'learning_path' | 'exercise' | 'school' | 'event' | 'instructor'
  filters JSONB,
  results_count INTEGER,
  selected_content_id UUID, -- References any content table
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics
CREATE INDEX idx_ai_searches_content_type ON ai_content_searches(content_type);
CREATE INDEX idx_ai_searches_created_at ON ai_content_searches(created_at);
```

#### Week 7-8: Preview Components & Content Integration
**Tasks:**
- [ ] Create `RoutePreviewSheet` component (NEW, only new UI)
- [ ] Build inline preview cards for all 6 content types
- [ ] Implement tap-to-open-sheet logic
- [ ] Add "Spara rutt" → `CreateRouteSheet` flow
- [ ] Setup OSM API integration
- [ ] Implement geocoding (address → coordinates)
- [ ] Add reverse geocoding (coordinates → address)
- [ ] Build place search (find landmarks, cities)
- [ ] Create map-based content filtering
- [ ] Implement content comparison tool

**RoutePreviewSheet (NEW Component):**
```typescript
// Similar to RouteDetailSheet but with isPreview mode
interface RoutePreviewSheetProps {
  route: AIGeneratedRoute; // Temporary, not saved yet
  onSave: () => void; // Opens CreateRouteSheet
  onClose: () => void;
}

// Features:
// - Full map with waypoints marked
// - Metadata: distance, duration, difficulty, features
// - AI-generated description
// - Two buttons: "Spara rutt" | "Stäng"
```

**Inline Preview Cards (6 Types):**
```typescript
// Compact cards shown in chat after AI search
<RoutePreviewCard route={result} onTap={openRoutePreviewSheet} />
<LearningPathCard path={result} onTap={openLearningPathDetailSheet} />
<ExerciseCard exercise={result} onTap={openExerciseDetailSheet} />
<SchoolCard school={result} onTap={openSchoolDetailSheet} />
<EventCard event={result} onTap={openEventDetailSheet} />
<InstructorCard instructor={result} onTap={openInstructorDetailSheet} />
```

**OSM Services:**
- Nominatim for geocoding
- Overpass API for POI data
- OSM tiles for map rendering
- Route snapping to roads

**Deliverables:**
- ✅ AI finds routes in database
- ✅ Natural language route search
- ✅ Map-based filtering
- ✅ Route recommendations

**Dependencies:**
- Existing routes database
- OSM API access

**Risks:**
- OSM rate limits → Implement local Nominatim instance
- Poor search quality → Add user feedback loop

---

### Phase 4: Advanced Route Generation
**Duration:** 4 weeks  
**Goal:** AI creates NEW routes using OSM

#### Week 9-10: Route Generation Engine
**Tasks:**
- [ ] Design route generation algorithm
- [ ] Implement waypoint selection logic
- [ ] Build route optimization (shortest, scenic, learning-focused)
- [ ] Add safety scoring (road type, traffic, complexity)
- [ ] Create route validation (drivable, legal, safe)
- [ ] Implement route smoothing (avoid zigzags)
- [ ] Add elevation profile analysis
- [ ] Build route difficulty calculator

**Route Generation Algorithm:**
1. Parse user request → extract criteria
2. Identify start/end points (geocoding)
3. Query OSM for road network
4. Generate candidate waypoints
5. Apply constraints (distance, difficulty, scenery)
6. Optimize route using A* / Dijkstra
7. Validate safety & legality
8. Calculate difficulty score
9. Generate route metadata
10. Store in database

#### Week 11-12: Deep OSM Integration
**Tasks:**
- [ ] Setup local OSM data store (Planet.osm extract)
- [ ] Implement GraphHopper/OSRM routing engine
- [ ] Add POI integration (gas stations, rest stops)
- [ ] Build scenic route detection (lakes, forests, mountains)
- [ ] Create traffic pattern analysis (historical data)
- [ ] Implement road quality assessment
- [ ] Add multi-modal routing (consider weather)
- [ ] Build route versioning system

**Quality Scoring System:**
```typescript
interface RouteQuality {
  safety: number;        // 0-100 (road type, accidents, visibility)
  scenery: number;       // 0-100 (nature, landmarks, diversity)
  learningValue: number; // 0-100 (skill variety, challenge)
  difficulty: number;    // 1-5 (turns, traffic, complexity)
  duration: number;      // minutes
  distance: number;      // kilometers
}
```

**Deliverables:**
- ✅ AI generates custom routes
- ✅ Route quality scoring
- ✅ Safety validation
- ✅ OSM deep integration

**Dependencies:**
- Phase 3 complete
- OSM data infrastructure
- Routing engine setup

**Risks:**
- Complex routing logic → Start with simple algorithms
- Performance issues → Pre-compute common routes
- Bad route suggestions → Implement human review system

---

### Phase 5: Personalization
**Duration:** 3 weeks  
**Goal:** AI adapts to individual users

#### Week 13-14: Pattern Learning
**Tasks:**
- [ ] Build user behavior tracking system
- [ ] Implement preference extraction (route types, difficulty)
- [ ] Create learning curve analysis
- [ ] Add time-of-day pattern detection
- [ ] Build skill progression tracking
- [ ] Implement adaptive difficulty adjustment
- [ ] Create personalized recommendation engine
- [ ] Add A/B testing framework

**Tracked Patterns:**
- Route preferences (scenic vs. efficient)
- Difficulty tolerance (comfort zone)
- Learning pace (fast/slow progression)
- Time patterns (weekend driver, daily practice)
- Struggle areas (parking, roundabouts, highways)
- Device usage patterns (voice vs. text)

**Machine Learning:**
- Use lightweight ML models (TensorFlow.js)
- Client-side inference for privacy
- Periodic model updates from aggregated data
- Fallback to rule-based system

#### Week 15: Custom Learning Plans
**Tasks:**
- [ ] Design learning plan generator
- [ ] Implement skill gap analysis
- [ ] Create adaptive curriculum builder
- [ ] Add milestone tracking
- [ ] Build progress visualization
- [ ] Implement smart scheduling (optimal practice times)
- [ ] Create achievement system
- [ ] Add motivational messaging

**Deliverables:**
- ✅ Personalized route suggestions
- ✅ Adaptive learning plans
- ✅ Progress insights
- ✅ Pattern-based recommendations

**Dependencies:**
- Phases 1-4 complete
- User behavior data (minimum 2 weeks)

**Risks:**
- Cold start problem → Use default plans for new users
- Privacy concerns → Anonymous data aggregation

---

### Phase 6: Polish & Launch
**Duration:** 2 weeks  
**Goal:** Production-ready release

#### Week 16: Optimization
**Tasks:**
- [ ] Performance profiling & optimization
- [ ] Response time optimization (<2s target)
- [ ] Token usage optimization (reduce costs)
- [ ] Database query optimization
- [ ] Caching strategy refinement
- [ ] Bundle size reduction
- [ ] Memory leak fixes
- [ ] Accessibility improvements (VoiceOver, TalkBack)

**Performance Targets:**
- Response time: <2s (p95)
- Token usage: <500 tokens/message
- Cost per conversation: <$0.05
- App size increase: <5MB

#### Week 17: Multi-language & Launch
**Tasks:**
- [ ] Swedish translation of all prompts
- [ ] English translation completeness check
- [ ] Locale-specific formatting (dates, numbers)
- [ ] Cultural adaptation (Swedish driving rules)
- [ ] Final QA testing
- [ ] Beta user testing (50 users)
- [ ] Production deployment
- [ ] Launch monitoring setup
- [ ] Documentation finalization

**Deliverables:**
- ✅ Production-ready AI assistant
- ✅ Full SWE/ENG support
- ✅ Performance optimized
- ✅ Monitoring & analytics

**Dependencies:**
- All previous phases
- Beta testing group
- Production infrastructure

**Risks:**
- Translation quality → Use professional translators
- Last-minute bugs → Freeze features 1 week before launch

---

## Dependencies & Prerequisites

### Before Phase 1
- [x] Supabase project setup
- [x] AI provider API keys (OpenAI, Anthropic, Google)
- [x] Development environment configured
- [ ] Design mockups approved
- [ ] Privacy policy updated (AI usage disclosure)

### Before Phase 2
- [x] Learning path data structure finalized
- [x] User progress tracking system
- [ ] Context data access patterns defined

### Before Phase 3
- [x] Routes database populated (minimum 100 routes)
- [ ] OSM API account & rate limits understood
- [ ] Search infrastructure decided (Postgres vs. Elasticsearch)

### Before Phase 4
- [ ] OSM data extract downloaded (Sweden region)
- [ ] Routing engine selected (GraphHopper/OSRM)
- [ ] Server infrastructure for routing (8GB+ RAM)
- [ ] Legal review of generated routes (liability)

### Before Phase 5
- [ ] User behavior data collection (2+ weeks)
- [ ] ML model training pipeline setup
- [ ] Privacy compliance review (GDPR)

### Before Phase 6
- [ ] Professional Swedish translator secured
- [ ] Beta testing group recruited (50+ users)
- [ ] Production monitoring tools configured
- [ ] Support team trained on AI features

---

## Technical Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────────┐
│                      React Native App                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Chat Screen  │  │ Route Screen │  │ Learn Screen │      │
│  │              │  │              │  │              │      │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │      │
│  │ │ Ask AI   │ │  │ │ Ask AI   │ │  │ │ Ask AI   │ │      │
│  │ │ Button   │ │  │ │ Button   │ │  │ │ Button   │ │      │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                          │                                   │
│                          ▼                                   │
│              ┌──────────────────────┐                       │
│              │  AI Service Layer    │                       │
│              │  - Context Builder   │                       │
│              │  - Message Manager   │                       │
│              │  - Cache Handler     │                       │
│              └──────────────────────┘                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Edge Functions (Deno)                      │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐ │  │
│  │  │  ai-chat    │  │ route-gen   │  │ context-api  │ │  │
│  │  │             │  │             │  │              │ │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬───────┘ │  │
│  └─────────┼────────────────┼────────────────┼─────────┘  │
│            │                │                │             │
│            ▼                ▼                ▼             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              PostgreSQL Database                     │  │
│  │  - ai_conversations                                  │  │
│  │  - routes (with embeddings)                          │  │
│  │  - user_preferences                                  │  │
│  │  - learning_paths                                    │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────┬──────────────────┬──────────────────┬──────────┘
            │                  │                  │
            ▼                  ▼                  ▼
    ┌───────────────┐  ┌──────────────┐  ┌──────────────┐
    │   OpenAI API  │  │  Claude API  │  │  Gemini API  │
    │   GPT-4       │  │  Sonnet      │  │  Pro         │
    └───────────────┘  └──────────────┘  └──────────────┘

            ▼
    ┌──────────────────────────────────────┐
    │    OpenStreetMap Infrastructure      │
    │  - Nominatim (Geocoding)             │
    │  - Overpass API (POI)                │
    │  - GraphHopper/OSRM (Routing)        │
    └──────────────────────────────────────┘
```

### Data Flow
1. **User sends message** → React Native app
2. **Build context** → Fetch learning path, progress, preferences
3. **Call Edge Function** → Supabase ai-chat function
4. **Route to AI provider** → OpenAI/Claude/Gemini based on load
5. **Stream response** → Server-Sent Events (SSE)
6. **Store conversation** → PostgreSQL
7. **Update UI** → Display response

### Technology Stack

**Frontend:**
- React Native 0.79.3
- Expo SDK 53
- Tamagui 1.121 (UI components)
- React Navigation 7.x
- TypeScript 5.9

**Backend:**
- Supabase (PostgreSQL 15, Edge Functions)
- Deno runtime (Edge Functions)
- Redis (caching - optional)

**AI Providers:**
- OpenAI GPT-4 Turbo (primary)
- Anthropic Claude 3.5 Sonnet (fallback)
- Google Gemini Pro (cost-effective)

**Maps & Routing:**
- OpenStreetMap (data)
- Nominatim (geocoding)
- GraphHopper or OSRM (routing)
- Mapbox/MapLibre GL (rendering)

**DevOps:**
- GitHub Actions (CI/CD)
- Sentry (error tracking)
- Mixpanel/PostHog (analytics)
- EAS (Expo Application Services)

---

## Testing Strategy

### Unit Testing
**Scope:** Individual functions and components  
**Tools:** Jest, React Native Testing Library  
**Coverage Target:** >80%

**Focus Areas:**
- AI context builder logic
- Message parsing & validation
- Route generation algorithms
- Quality scoring functions
- Cache management

**Example:**
```typescript
// __tests__/services/aiContextBuilder.test.ts
describe('AIContextBuilder', () => {
  it('should build context under 4k tokens', async () => {
    const context = await buildContext(userId);
    expect(estimateTokens(context)).toBeLessThan(4000);
  });
  
  it('should prioritize recent activity', async () => {
    const context = await buildContext(userId);
    expect(context.recentActivity).toBeDefined();
  });
});
```

### Integration Testing
**Scope:** Component interactions and API calls  
**Tools:** Detox (E2E), Supertest (API)  
**Coverage Target:** Critical paths

**Test Cases:**
- Chat message send → AI response → display
- Route search → results → selection
- Context injection → AI uses context correctly
- Multi-provider fallback (if OpenAI fails → Claude)
- Rate limiting enforcement

### User Acceptance Testing (UAT)
**Scope:** Real users testing features  
**Duration:** 1 week per phase  
**Participants:** 10 beta users per phase

**Process:**
1. Deploy to TestFlight/Internal Testing
2. Provide test scenarios
3. Collect feedback (in-app survey)
4. Track analytics (engagement, errors)
5. Iterate based on feedback

**UAT Scenarios (Phase 1):**
- Send 5 different questions to AI
- Rate response quality (1-5 stars)
- Test on slow network (3G simulation)
- Try error scenarios (invalid input)

### Performance Testing
**Scope:** Response time, token usage, cost  
**Tools:** k6, Artillery, custom scripts

**Benchmarks:**
- Response time: <2s (p95), <5s (p99)
- Token usage: <500 tokens/message average
- Concurrent users: 100 simultaneous chats
- Database queries: <100ms (p95)

### Security Testing
**Scope:** API key protection, injection attacks  
**Tools:** OWASP ZAP, manual penetration testing

**Checks:**
- Prompt injection resistance
- SQL injection (routes search)
- XSS in chat messages
- Rate limit bypass attempts
- API key exposure

### Accessibility Testing
**Scope:** VoiceOver, TalkBack, keyboard navigation  
**Tools:** Manual testing, Axe DevTools

**Requirements:**
- All chat UI keyboard accessible
- Screen reader announcements for AI responses
- High contrast mode support
- Minimum touch target size (44x44pt)

---

## Rollout Plan

### Phase 1: Internal Alpha
**Duration:** Week 16  
**Audience:** Team members (5 people)  
**Goal:** Catch obvious bugs

**Features:**
- All 6 phases complete
- Basic monitoring enabled
- Internal feedback form

**Success Criteria:**
- No crashes in 20 test sessions
- Average response time <3s
- No API key leaks

### Phase 2: Closed Beta
**Duration:** Week 17 (first 3 days)  
**Audience:** 50 beta testers (recruited via email)  
**Goal:** Real-world usage testing

**Features:**
- Full feature set
- Anonymous usage analytics
- In-app feedback button
- Crash reporting (Sentry)

**Selection Criteria:**
- Mix of beginner/advanced users
- Active Vromm users (>10 sessions)
- Geographic diversity (urban/rural)

**Monitoring:**
- Daily active users
- Messages per user
- Error rate
- API cost per user

**Rollback Trigger:**
- Error rate >5%
- Average response time >10s
- API cost >$0.20 per user/day

### Phase 3: Open Beta
**Duration:** Week 17 (last 4 days)  
**Audience:** All users (opt-in via app update)  
**Goal:** Scale testing

**Communication:**
- In-app banner: "Try AI Assistant (Beta)"
- Email announcement (optional opt-in)
- Social media teaser

**Gradual Rollout:**
- Day 1: 10% of users
- Day 2: 25% of users
- Day 3: 50% of users
- Day 4: 100% of users

**Kill Switch:**
- Feature flag in Supabase
- Can disable AI for all users instantly
- Preserve chat history

### Phase 4: Full Launch
**Duration:** Week 18+  
**Audience:** All users (default enabled)  
**Goal:** Production stability

**Launch Announcement:**
- App Store update notes
- Blog post (vromm.se/blog)
- Social media campaign
- Press release (optional)

**Post-Launch Monitoring (30 days):**
- Daily usage reports
- Cost tracking (budget alerts)
- User satisfaction surveys
- Support ticket analysis

**Success Metrics (30 days):**
- 60% of active users try AI (adoption)
- 4.0+ star rating (satisfaction)
- <$500 monthly API cost
- <0.1% error rate

---

## Cost Projections & Pricing Model

### Pricing Tiers (Updated 2026-02-14)

**3-Tier Strategy: Free + BYOK + Premium**

#### Tier 1: Free (Limited)
- **Queries:** 10 AI queries/day (Vromm pays)
- **Features:** Route search, basic Q&A only
- **Cost to Vromm:** ~$0.05/user/month max (rate limited)
- **Purpose:** Let users try AI with zero friction

#### Tier 2: BYOK (Unlimited)
- **Queries:** Unlimited (user pays with their API key)
- **Features:** Full access (route generation, personalization, search)
- **Cost to Vromm:** $0 (user brings OpenAI/Anthropic/Gemini key)
- **Purpose:** Power users + privacy-conscious users

#### Tier 3: Premium Subscription (Unlimited)
- **Queries:** 100 AI queries/day included (Vromm pays)
- **Features:** Full access + priority processing
- **Cost to Vromm:** ~$0.50/user/month (offset by subscription revenue)
- **Purpose:** Monetization + seamless UX (no API key setup)
- **Integration:** Part of existing IAP for learning paths

**Conversion Funnel:**
```
Free (try it, 10/day) 
  → Hit limit 
    → Upgrade to Premium ($X/mo, 100/day) 
      OR 
    → Add BYOK (unlimited, $0 to Vromm)
```

**UI Flow:**
- Settings → AI Assistant → API Key (optional field)
- When limit hit: Modal with 2 CTAs:
  - "Upgrade to Premium for 100/day" (subscription)
  - "Add your API key for unlimited" (BYOK setup)

### Development Costs
| Item | Hours | Rate | Total |
|------|-------|------|-------|
| Senior Developer | 680 | $100/hr | $68,000 |
| UI/UX Designer | 80 | $80/hr | $6,400 |
| QA Engineer | 120 | $60/hr | $7,200 |
| Project Manager | 100 | $90/hr | $9,000 |
| **Total Development** | | | **$90,600** |

### Infrastructure Costs (Monthly)
| Service | Usage | Cost |
|---------|-------|------|
| Supabase Pro | 1 project | $25 |
| AI API (OpenAI) | Free: 100k tokens, Premium: 1M tokens | $50-200 |
| AI API (Claude) | Fallback, 200k tokens | $40 |
| AI API (Gemini) | Fallback, 200k tokens | $10 |
| OSM Routing Server | 1 VPS (8GB) | $40 |
| Database Storage | 50GB | $15 |
| Monitoring (Sentry) | 10k events | $26 |
| Analytics (Mixpanel) | 100k MTU | $0 (free tier) |
| **Total Monthly** | | **$206-$356** |

### Cost per User (Monthly Active) - Updated Model

**Assumptions (1,000 MAU):**
- 70% Free tier (10 queries/day max) = 700 users
- 20% BYOK (unlimited, $0 cost) = 200 users
- 10% Premium (100 queries/day) = 100 users

**Free Tier Calculation:**
- 700 users × 10 queries/day × 30 days = 210k queries/month
- Average 300 tokens/query = 63M tokens/month
- OpenAI cost: 63M × $0.10/1M = $6.30/month
- **Cost per free user: $0.009/month**

**Premium Tier Calculation:**
- 100 users × 100 queries/day × 30 days = 300k queries/month
- Average 300 tokens/query = 90M tokens/month
- OpenAI cost: 90M × $0.10/1M = $9.00/month
- **Cost per premium user: $0.09/month**

**Total AI Cost (1k MAU):**
- Free: $6.30
- BYOK: $0
- Premium: $9.00
- **Total: $15.30/month**

**With infrastructure:**
- Infrastructure: $206/month (base tier)
- AI: $15.30/month
- **Total: $221.30/month for 1,000 MAU**
- **Cost per user: $0.22/month**

### Scaling Projections (BYOK Model)
| Users | Free Users | BYOK Users | Premium Users | AI Cost | Infrastructure | Total/Month |
|-------|------------|------------|---------------|---------|----------------|-------------|
| 100 | 70 | 20 | 10 | $1.50 | $206 | $207.50 |
| 1,000 | 700 | 200 | 100 | $15.30 | $206 | $221.30 |
| 5,000 | 3,500 | 1,000 | 500 | $76.50 | $306 | $382.50 |
| 10,000 | 7,000 | 2,000 | 1,000 | $153 | $506 | $659 |

**Cost Optimization Strategies:**
1. Rate limiting prevents free tier abuse (10/day max)
2. BYOK offloads 20% of users to $0 cost
3. Premium revenue offsets AI costs (e.g., $4.99/mo × 100 users = $499/mo revenue)
4. Aggressive caching (save 30% tokens)
5. Use Gemini for simple queries (save 50% on those)
6. Batch requests where possible
7. Cache route search results (30-day TTL)

---

## Risk Assessment

### High-Risk Items

#### 1. API Cost Overruns
**Probability:** HIGH  
**Impact:** HIGH  
**Risk Score:** 9/10

**Scenario:** Users spam AI with long conversations, token usage 5x projections.

**Mitigation:**
- Hard rate limits (5 messages/minute, 100/day per user)
- Token budget per conversation (max 10k tokens)
- Automatic switch to cheaper models (Gemini) at high volume
- Real-time cost monitoring with alerts
- Kill switch if daily cost >$200

**Contingency:**
- Pause AI for new users
- Implement pay-per-use tier ($2.99/month unlimited)

#### 2. Poor AI Response Quality
**Probability:** MEDIUM  
**Impact:** HIGH  
**Risk Score:** 7/10

**Scenario:** AI gives incorrect driving advice, confuses users.

**Mitigation:**
- Extensive prompt engineering & testing
- Disclaimer: "AI suggestions are not professional advice"
- Human review of first 1,000 conversations
- User feedback thumbs up/down on every response
- Fallback responses for uncertain queries
- Regular prompt updates based on feedback

**Contingency:**
- Curated Q&A fallback (scripted responses)
- Option to escalate to human support

#### 3. OSM Route Generation Failures
**Probability:** MEDIUM  
**Impact:** MEDIUM  
**Risk Score:** 6/10

**Scenario:** Generated routes are unsafe, illegal, or nonsensical.

**Mitigation:**
- Multi-stage validation (road type, speed limits, legality)
- Manual review of first 100 generated routes
- User reporting system (flag bad routes)
- Automated safety checks (no highways for beginners)
- Limit generation to verified areas initially

**Contingency:**
- Disable route generation, keep discovery only
- Partner with professional route creators

#### 4. Performance/Latency Issues
**Probability:** MEDIUM  
**Impact:** MEDIUM  
**Risk Score:** 5/10

**Scenario:** AI responses take >10s, users abandon feature.

**Mitigation:**
- Streaming responses (show partial answers)
- Optimistic UI (show "thinking" animation)
- Aggressive caching (same question → cached answer)
- CDN for static assets
- Database query optimization
- Horizontal scaling (multiple Edge Function instances)

**Contingency:**
- Reduce context size (faster, less accurate)
- Queue system (process during off-peak)

### Medium-Risk Items

#### 5. User Privacy Concerns
**Probability:** LOW  
**Impact:** HIGH  
**Risk Score:** 5/10

**Mitigation:**
- GDPR compliance (data deletion on request)
- Anonymous conversation analytics
- No conversation data shared with AI providers
- Clear privacy policy
- Opt-out option (disable AI)

#### 6. Technical Debt Accumulation
**Probability:** HIGH  
**Impact:** MEDIUM  
**Risk Score:** 5/10

**Mitigation:**
- Code reviews for all AI-related code
- Refactoring sprints every 2 weeks
- Documentation alongside code
- Automated linting & formatting
- Limit "quick fixes"

### Low-Risk Items

#### 7. Multi-language Translation Quality
**Probability:** LOW  
**Impact:** MEDIUM  
**Risk Score:** 3/10

**Mitigation:**
- Professional Swedish translator
- Native speaker testing

#### 8. Dependency Updates Breaking Changes
**Probability:** MEDIUM  
**Impact:** LOW  
**Risk Score:** 2/10

**Mitigation:**
- Lock dependency versions
- Automated testing on updates

---

## Team Structure

### Option 1: Solo Developer (17 weeks)
**Best for:** Side project, tight budget

**Roles:**
- 1 Full-Stack Developer (Frontend + Backend + AI)
- Part-time designer (20 hours total)
- Part-time QA (beta testing volunteers)

**Pros:**
- Low cost ($90k total)
- Simple coordination
- Fast decisions

**Cons:**
- Slower progress
- Single point of failure
- Limited expertise depth

---

### Option 2: Small Team (12 weeks) ⭐ RECOMMENDED
**Best for:** Startup, balanced speed/cost

**Team:**
- 1 Frontend Developer (React Native)
- 1 Backend Developer (Supabase, AI integration)
- 0.5 UI/UX Designer (part-time)
- 0.5 QA Engineer (part-time)
- 1 Project Manager (part-time, 20 hrs/week)

**Timeline Reduction:**
- Parallel work on frontend/backend
- Dedicated QA catches bugs early
- PM handles coordination

**Cost:** ~$150k (12 weeks)

**Pros:**
- Faster delivery
- Better quality (specialization)
- Redundancy (vacation/sick days)

**Cons:**
- Higher cost
- Coordination overhead

---

### Option 3: Full Team (8 weeks)
**Best for:** Enterprise, need speed

**Team:**
- 2 Frontend Developers
- 2 Backend Developers
- 1 ML Engineer (route generation)
- 1 UI/UX Designer
- 1 QA Engineer
- 1 Project Manager

**Cost:** ~$250k (8 weeks)

**Pros:**
- Very fast
- High quality
- Expert-level ML/AI

**Cons:**
- Expensive
- Coordination complexity
- Potential over-engineering

---

### Recommended: Option 2 (Small Team)

**Rationale:**
- Good balance of speed and cost
- Realistic for most startups
- Allows specialization without bloat
- 12 weeks faster than solo (5 weeks saved)

---

## Success Metrics

### Adoption Metrics
| Metric | Target (30 days) | Measurement |
|--------|------------------|-------------|
| **Feature Awareness** | 90% of active users | In-app survey |
| **Feature Trial** | 60% of active users | Analytics (sent ≥1 message) |
| **Repeat Usage** | 40% send ≥5 messages | Analytics |
| **Daily Active Users** | 20% of MAU | Analytics |
| **Retention** | 50% use in week 2 | Cohort analysis |

### Quality Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| **User Satisfaction** | 4.0+ stars | In-app rating (thumbs up/down) |
| **Response Accuracy** | >85% thumbs up | User feedback |
| **Response Time** | <2s (p95) | Server logs |
| **Error Rate** | <0.5% | Sentry |
| **Crash Rate** | <0.1% | Expo/Firebase |

### Business Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| **Cost per User** | <$0.50/month | API bills / MAU |
| **Cost per Conversation** | <$0.05 | API bills / total conversations |
| **Revenue Impact** | +10% conversion | A/B test (AI vs. no AI) |
| **Support Ticket Reduction** | -20% | Ticket volume |

### Engagement Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| **Messages per User** | 20/month | Analytics |
| **Conversation Length** | 5+ messages | Session analysis |
| **Route Discovery Usage** | 30% of AI users | Feature analytics |
| **Inline "Ask AI" Clicks** | 15% of content views | Event tracking |

### Technical Metrics
| Metric | Target | Measurement |
|--------|--------|-------------|
| **Uptime** | 99.5% | Monitoring (UptimeRobot) |
| **Token Efficiency** | <500 tokens/message | API logs |
| **Cache Hit Rate** | >40% | Redis/Supabase cache stats |
| **Database Queries** | <100ms (p95) | Supabase logs |

### Monitoring Dashboard
Create real-time dashboard (Mixpanel/Grafana) showing:
- Hourly active users using AI
- Average response time (rolling 1hr)
- API cost (daily budget)
- Error rate (last 24hrs)
- User satisfaction (rolling 7 days)
- Top queries (word cloud)

**Alerts:**
- Response time >5s for 5 minutes → Page on-call
- Error rate >2% → Slack alert
- Daily cost >$100 → Email alert
- Satisfaction <3.5 stars → Review urgently

---

## Timeline (Gantt Chart)

```
WEEK │ PHASE                          │ MILESTONES
─────┼────────────────────────────────┼─────────────────────────────
  1  │ ████████████ Phase 1: MVP      │ Chat UI complete
     │ - Chat UI                      │
     │ - Chat components              │
─────┼────────────────────────────────┼─────────────────────────────
  2  │ ████████████ Phase 1: MVP      │ ✅ Basic AI working
     │ - AI integration               │ - 3 providers integrated
     │ - Edge functions               │ - Chat history stored
─────┼────────────────────────────────┼─────────────────────────────
  3  │ ████████████ Phase 2: Context  │ Context system built
     │ - Context builder              │
     │ - Learning path integration    │
─────┼────────────────────────────────┼─────────────────────────────
  4  │ ████████████ Phase 2: Context  │ Inline AI buttons
     │ - Inline "Ask AI" buttons      │
     │ - Quick actions                │
─────┼────────────────────────────────┼─────────────────────────────
  5  │ ████████████ Phase 2: Context  │ ✅ Context-aware AI
     │ - AI suggestions               │ - Proactive tips working
     │ - Multi-threading              │ - 5+ screen integrations
─────┼────────────────────────────────┼─────────────────────────────
  6  │ ████████████ Phase 3: Routes   │ Route search working
     │ - Database search              │
     │ - Semantic search              │
─────┼────────────────────────────────┼─────────────────────────────
  7  │ ████████████ Phase 3: Routes   │ OSM integration live
     │ - OSM API integration          │
     │ - Geocoding                    │
─────┼────────────────────────────────┼─────────────────────────────
  8  │ ████████████ Phase 3: Routes   │ ✅ Route discovery complete
     │ - Route filtering              │ - NL search working
     │ - Recommendations              │ - Map integration
─────┼────────────────────────────────┼─────────────────────────────
  9  │ ████████████ Phase 4: Advanced │ Route gen algorithm v1
     │ - Route generation engine      │
     │ - Waypoint selection           │
─────┼────────────────────────────────┼─────────────────────────────
 10  │ ████████████ Phase 4: Advanced │ Quality scoring done
     │ - Route optimization           │
     │ - Safety scoring               │
─────┼────────────────────────────────┼─────────────────────────────
 11  │ ████████████ Phase 4: Advanced │ Deep OSM working
     │ - OSM data store               │
     │ - Routing engine (GraphHopper) │
─────┼────────────────────────────────┼─────────────────────────────
 12  │ ████████████ Phase 4: Advanced │ ✅ AI generates routes
     │ - POI integration              │ - Quality validated
     │ - Scenic detection             │ - Safety checks pass
─────┼────────────────────────────────┼─────────────────────────────
 13  │ ████████████ Phase 5: Personal │ Pattern learning active
     │ - Behavior tracking            │
     │ - Preference extraction        │
─────┼────────────────────────────────┼─────────────────────────────
 14  │ ████████████ Phase 5: Personal │ Adaptive system working
     │ - Learning curve analysis      │
     │ - Adaptive difficulty          │
─────┼────────────────────────────────┼─────────────────────────────
 15  │ ████████████ Phase 5: Personal │ ✅ Personalization live
     │ - Custom learning plans        │ - ML models deployed
     │ - Progress insights            │ - Recommendations smart
─────┼────────────────────────────────┼─────────────────────────────
 16  │ ████████████ Phase 6: Polish   │ Performance optimized
     │ - Performance optimization     │ - <2s response time ✅
     │ - Cost optimization            │ - Token usage reduced
     │                                │ 
     │ 🔍 INTERNAL ALPHA (5 testers)  │
─────┼────────────────────────────────┼─────────────────────────────
 17  │ ████████████ Phase 6: Launch   │ ✅ FULL LAUNCH 🚀
     │ - Swedish translation          │ - Multi-language ✅
     │ - Final QA                     │ - Beta testing done
     │ - Production deploy            │ - Monitoring live
     │                                │
     │ 🧪 CLOSED BETA (50 users)      │ Days 1-3
     │ 🌍 OPEN BETA (gradual rollout) │ Days 4-7
     │ 🚀 FULL LAUNCH                 │ Day 8
─────┼────────────────────────────────┼─────────────────────────────
 18+ │ 📊 POST-LAUNCH MONITORING      │ 30-day metrics review
     │ - Usage analytics              │
     │ - Cost tracking                │
     │ - User feedback collection     │
```

### Critical Path
The following tasks **cannot be delayed** without affecting the timeline:

1. **Week 1-2:** Phase 1 MVP → Foundation for everything else
2. **Week 3-5:** Phase 2 Context → Required for quality AI
3. **Week 6-8:** Phase 3 Route Discovery → Required for Phase 4
4. **Week 9-12:** Phase 4 Route Generation → Most complex, high risk
5. **Week 16-17:** Testing & Launch → Cannot rush quality

### Parallel Workstreams
These can happen simultaneously with a team of 2+:

- **Frontend + Backend:** UI work while API is being built
- **Route Discovery + Personalization:** Different codebases
- **Testing + Development:** QA can test previous phase while dev works on next

### Buffer Time
Built-in buffer: **2 weeks** (not shown in chart)

- Use if any phase takes longer than estimated
- Reserve for unforeseen issues (API changes, bugs)
- Can compress timeline if ahead of schedule

---

## Appendix

### A. Glossary
- **Edge Function:** Serverless function running on Supabase (Deno runtime)
- **Embedding:** Vector representation of text for semantic search
- **OSM:** OpenStreetMap, open-source map data
- **Geocoding:** Converting address to coordinates (lat/lng)
- **Token:** Unit of text for AI APIs (~4 characters)
- **SSE:** Server-Sent Events, streaming protocol
- **p95:** 95th percentile (95% of requests are faster)
- **MAU:** Monthly Active Users

### B. Reference Documents
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [OSM Routing Guide](https://wiki.openstreetmap.org/wiki/Routing)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Vromm App Architecture](./docs/ARCHITECTURE.md) *(to be created)*

### C. Change Log
| Date | Version | Changes |
|------|---------|---------|
| 2026-02-14 | 1.0 | Initial roadmap created |

---

## Next Steps

1. **Get stakeholder approval** on this roadmap
2. **Recruit team** (if not solo)
3. **Setup development environment** (API keys, Supabase)
4. **Create GitHub issues** for Week 1 tasks
5. **Start Phase 1** 🚀

---

**Document Owner:** Development Team  
**Last Updated:** 2026-02-14  
**Status:** Planning Phase - No Implementation Yet
