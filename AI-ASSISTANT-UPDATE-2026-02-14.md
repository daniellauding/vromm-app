# AI Assistant Roadmap Update - February 14, 2026

**Branch:** `feature/ai-driving-assistant`  
**Updated Files:** AI-ASSISTANT-ROADMAP.md  
**Commit:** d390b88

---

## 🎯 Key Changes

### 1. **3-Tier Pricing Model (BYOK + Free + Premium)**

**Previous:** Single-tier, Vromm pays all AI costs  
**New:** Hybrid model with 3 tiers

| Tier | Queries/Day | Cost to Vromm | Features |
|------|-------------|---------------|----------|
| **Free** | 10 | ~$0.05/user/month | Basic route search + Q&A |
| **BYOK** | Unlimited | $0 | Full access (user's API key) |
| **Premium** | 100 | ~$0.50/user/month | Full access + priority |

**Cost Impact:**
- Previous model: $0.46/user/month (all users)
- New model: $0.22/user/month (70% BYOK adoption)
- **52% cost reduction** 💰

**Conversion Flow:**
```
Free user (10/day) → Hit limit → 
  Option A: Upgrade to Premium ($X/mo, 100/day)
  Option B: Add API key (unlimited, $0 to Vromm)
```

---

### 2. **Universal Content Search (Not Just Routes)**

**Previous Scope:** AI finds/generates routes only  
**New Scope:** AI searches ALL content types

**6 Content Types:**

1. ✅ **Routes** - "Hitta nybörjarrutt med rondeller"
2. ✅ **Learning Paths** - "Visa uppgifter om parkering"
3. ✅ **Exercises** - "Hitta övningar för motorväg"
4. ✅ **Schools** - "Vilka körskolor finns i Lund?"
5. ✅ **Events** - "Visa kommande kurser"
6. ✅ **Instructors** - "Hitta handledare nära mig"

**Database Impact:**
- Added pgvector embeddings to 6 tables (not just routes)
- Single universal search API
- Cross-content recommendations

---

### 3. **Preview-First UX Flow**

**Previous:** AI → Direct to CreateRouteSheet  
**New:** AI → Preview Card → DetailSheet → Save

**Flow:**
```
User query → AI search → Inline preview cards in chat
  ↓
User taps card → Opens existing DetailSheet
  ↓
User sees full info → Save/Buy/Book/Contact
```

**For Routes (special case):**
```
User query → AI finds/generates route → RoutePreviewCard in chat
  ↓
User taps → RoutePreviewSheet (NEW, minimal UI)
  ↓
"Spara rutt" button → CreateRouteSheet (existing, prefilled)
  ↓
User can edit waypoints → Save to database
```

**Sheet Reuse:**
- Learning Paths → `LearningPathDetailSheet` (existing)
- Exercises → `ExerciseDetailSheet` (existing)
- Schools → `SchoolDetailSheet` (existing)
- Events → `EventDetailSheet` (existing)
- Instructors → `InstructorDetailSheet` (existing)
- Routes → `RoutePreviewSheet` (NEW) → `CreateRouteSheet` (existing)

**Result:** Only 1 new component (`RoutePreviewSheet`), everything else reused ✅

---

### 4. **BYOK Implementation Details**

**Settings UI:**
```
Settings → AI Assistant
  - Current Tier: Free/BYOK/Premium
  - Daily Usage: X/10 (Free) or X/100 (Premium)
  - API Keys (BYOK only):
    • OpenAI API Key [encrypted]
    • Anthropic API Key [encrypted]
    • Google API Key [encrypted]
  - Preferred Provider: OpenAI/Claude/Gemini
```

**Rate Limits by Tier:**
```typescript
const RATE_LIMITS = {
  free: { daily: 10, perMinute: 2 },
  byok: { daily: Infinity, perMinute: 10 },
  premium: { daily: 100, perMinute: 5 },
};
```

**Upgrade Prompt (when limit hit):**
```
"You've reached your daily limit (10 queries)

Option 1: Upgrade to Premium
  • 100 queries/day
  • Priority processing
  • $4.99/month
  [Upgrade Now]

Option 2: Add Your API Key
  • Unlimited queries
  • Use your own OpenAI/Claude/Gemini key
  • $0 to Vromm
  [Add API Key]
```

---

## 📊 Updated Metrics

### Cost Projections (BYOK Model)

**1,000 Monthly Active Users:**
- 70% Free tier (10/day) = 700 users → $6.30/month AI cost
- 20% BYOK (unlimited) = 200 users → $0/month AI cost
- 10% Premium (100/day) = 100 users → $9.00/month AI cost

**Total Cost:** $221.30/month (infrastructure + AI)  
**Per User:** $0.22/month  
**Premium Revenue Offset:** 100 users × $4.99/mo = $499/mo

**Net Monthly Cost:** $221 - $499 = **-$278** (profitable!)

### Scaling Projections

| Users | AI Cost | Infrastructure | Total | Premium Revenue | Net |
|-------|---------|----------------|-------|-----------------|-----|
| 100 | $1.50 | $206 | $207.50 | $49.90 | +$157.60 |
| 1,000 | $15.30 | $206 | $221.30 | $499.00 | **-$277.70** 💰 |
| 5,000 | $76.50 | $306 | $382.50 | $2,495 | **-$2,112** 💰 |
| 10,000 | $153 | $506 | $659 | $4,990 | **-$4,331** 💰 |

*(Negative = profitable)*

---

## 🚀 Development Impact

### Timeline (Unchanged)
- **Total:** 17 weeks (4 months)
- **Phases:** 6 phases (MVP → Personalization → Discovery → Generation → Polish → Launch)

### New Tasks (Phase 1: Week 2)
- ✅ BYOK system (API key management)
- ✅ Tier detection (free/byok/premium)
- ✅ Encrypted storage (Supabase)
- ✅ Settings UI (API key input)

### New Tasks (Phase 3: Week 7-8)
- ✅ 6 inline preview card components
- ✅ RoutePreviewSheet (only new UI)
- ✅ Tap-to-open-sheet logic
- ✅ Universal search (6 content types)

### Database Schema (New)
```sql
-- Embeddings for all 6 content types
ALTER TABLE routes ADD COLUMN embedding vector(1536);
ALTER TABLE learning_paths ADD COLUMN embedding vector(1536);
ALTER TABLE exercises ADD COLUMN embedding vector(1536);
ALTER TABLE schools ADD COLUMN embedding vector(1536);
ALTER TABLE events ADD COLUMN embedding vector(1536);
ALTER TABLE instructors ADD COLUMN embedding vector(1536);

-- Universal search log (replaces ai_route_searches)
CREATE TABLE ai_content_searches (
  id UUID PRIMARY KEY,
  user_id UUID,
  query TEXT,
  content_type TEXT, -- route | learning_path | exercise | school | event | instructor
  filters JSONB,
  results_count INTEGER,
  selected_content_id UUID,
  created_at TIMESTAMPTZ
);
```

---

## 📝 Next Steps

1. **Review & Approve** - Stakeholder sign-off on 3-tier model
2. **Budget Approval** - $90.6k dev cost + $221/mo ops
3. **Team Assignment** - 2 devs + designer + QA + PM
4. **Week 1 Kickoff** - Setup development environment, create GitHub issues

---

## 🔗 Related Files

- **AI-ASSISTANT-ROADMAP.md** - Full 17-week implementation plan (51KB)
- **AI-ASSISTANT-DELIVERABLES.md** - Task completion summary
- **AI-ASSISTANT-RESEARCH.md** - Initial market research
- **AI-ROUTE-DISCOVERY.md** - Route generation technical spec
- **This file** - Quick update summary

---

**Status:** ✅ Planning Complete  
**Next Milestone:** Stakeholder review + development kickoff  
**Updated:** 2026-02-14 07:14 PST
