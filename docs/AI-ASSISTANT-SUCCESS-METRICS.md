# AI Assistant - Success Metrics & KPIs

**Project:** Vromm AI Driving Assistant  
**Date:** 2026-02-14  
**Review Period:** Weekly (Weeks 1-4), Bi-weekly (Weeks 5-12), Monthly (Post-Launch)  

---

## Table of Contents

1. [Overview](#overview)
2. [North Star Metric](#north-star-metric)
3. [Adoption Metrics](#adoption-metrics)
4. [Engagement Metrics](#engagement-metrics)
5. [Quality Metrics](#quality-metrics)
6. [Business Metrics](#business-metrics)
7. [Technical Metrics](#technical-metrics)
8. [User Satisfaction Metrics](#user-satisfaction-metrics)
9. [Measurement Methods](#measurement-methods)
10. [Dashboard & Reporting](#dashboard--reporting)
11. [Success Criteria](#success-criteria)

---

## Overview

**Purpose:** Measure the success of the AI Assistant feature across adoption, engagement, quality, and business impact.

**Tracking Period:**
- **Beta (Week 17):** Daily tracking
- **Launch (Week 18+):** Daily for 30 days, then weekly
- **Long-term:** Monthly reviews

**Tools:**
- **Analytics:** Mixpanel, PostHog
- **Monitoring:** Sentry (errors), Datadog/Grafana (performance)
- **User Feedback:** In-app surveys, thumbs up/down
- **Business:** Supabase database queries

---

## North Star Metric

### 🌟 Primary Metric: AI-Assisted Learning Sessions
**Definition:** Number of sessions where users interact with AI ≥3 times AND complete a learning activity (quiz, practice route, etc.)

**Why this metric:**
- Captures both AI engagement AND business value (learning)
- Indicates users find AI helpful (not just curious)
- Correlates with retention and premium conversion

**Target:**
- **Week 1:** 50 sessions
- **Week 4:** 500 sessions
- **Month 3:** 2,000 sessions
- **Month 6:** 5,000 sessions

**Measurement:**
```sql
SELECT COUNT(DISTINCT session_id)
FROM user_sessions
WHERE ai_interactions >= 3
  AND learning_activity_completed = true
  AND session_date >= NOW() - INTERVAL '7 days';
```

---

## Adoption Metrics

### 1. Feature Awareness
**Definition:** % of active users who have SEEN the AI feature (viewed chat screen or "Ask AI" button)

**Target:**
- Week 1: 50%
- Week 2: 75%
- Week 4: 90%

**Measurement:**
- Event: `ai_feature_viewed`
- Formula: `(Users who viewed) / (Total active users) × 100`

**Data Source:** Mixpanel/PostHog

---

### 2. Feature Trial Rate
**Definition:** % of active users who sent ≥1 message to AI

**Target:**
- Week 1: 30%
- Week 2: 50%
- Week 4: 60%

**Measurement:**
```sql
SELECT 
  COUNT(DISTINCT user_id) AS trial_users,
  (SELECT COUNT(DISTINCT user_id) FROM users WHERE last_active >= NOW() - INTERVAL '7 days') AS active_users,
  ROUND(100.0 * trial_users / active_users, 2) AS trial_rate_pct
FROM ai_conversations
WHERE created_at >= NOW() - INTERVAL '7 days';
```

**Insights:**
- If <30% Week 1 → Improve discoverability (add banner, tutorial)
- If plateau at 40% → A/B test different UI placements

---

### 3. Repeat Usage Rate
**Definition:** % of trial users who send ≥5 messages (across multiple sessions)

**Target:**
- Week 2: 40%
- Week 4: 50%
- Month 3: 60%

**Measurement:**
```sql
SELECT 
  COUNT(DISTINCT user_id) FILTER (WHERE message_count >= 5) AS repeat_users,
  COUNT(DISTINCT user_id) AS total_trial_users,
  ROUND(100.0 * repeat_users / total_trial_users, 2) AS repeat_rate_pct
FROM (
  SELECT user_id, COUNT(*) AS message_count
  FROM ai_conversations
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY user_id
) AS user_message_counts;
```

---

### 4. Daily Active AI Users (DAAU)
**Definition:** Number of users who interact with AI on a given day

**Target:**
- Week 1: 50 users/day
- Week 4: 200 users/day
- Month 3: 500 users/day

**Measurement:**
- Event: `ai_message_sent`
- Unique users per day

**Visualization:** Line chart (daily trend)

---

### 5. Retention (7-Day)
**Definition:** % of users who tried AI in Week 1 and are still using it in Week 2

**Target:**
- Week 2: 50%
- Week 4: 40% (natural decay)

**Measurement:**
```sql
-- Cohort analysis
SELECT 
  cohort_week,
  COUNT(DISTINCT user_id) AS cohort_size,
  COUNT(DISTINCT CASE WHEN week_number = cohort_week + 1 THEN user_id END) AS retained_week1,
  ROUND(100.0 * retained_week1 / cohort_size, 2) AS retention_rate_pct
FROM user_ai_activity
GROUP BY cohort_week;
```

---

## Engagement Metrics

### 6. Messages per User (MPU)
**Definition:** Average number of AI messages sent per user (monthly)

**Target:**
- Week 1: 5 messages/user
- Week 4: 15 messages/user
- Month 3: 20 messages/user

**Measurement:**
```sql
SELECT 
  AVG(message_count) AS avg_messages_per_user
FROM (
  SELECT user_id, COUNT(*) AS message_count
  FROM ai_conversations
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY user_id
);
```

**Insights:**
- If <10 MPU → Improve response quality (users don't find it useful)
- If >50 MPU → Check for abuse/bots

---

### 7. Conversation Length
**Definition:** Average number of messages per conversation session

**Target:**
- Phase 1-2: 3-5 messages
- Phase 3-4: 5-8 messages
- Phase 5-6: 8-12 messages

**Measurement:**
- Session = messages within 30-minute window
- Count messages per session, average

**Insight:** Longer conversations = deeper engagement

---

### 8. Inline "Ask AI" Click Rate
**Definition:** % of content views (exercises, routes) that result in "Ask AI" button click

**Target:**
- Week 4: 10%
- Month 3: 15%
- Month 6: 20%

**Measurement:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE action = 'ask_ai_clicked') AS clicks,
  COUNT(*) FILTER (WHERE action = 'content_viewed') AS views,
  ROUND(100.0 * clicks / views, 2) AS click_rate_pct
FROM user_events
WHERE created_at >= NOW() - INTERVAL '30 days';
```

---

### 9. Route Discovery Usage
**Definition:** % of AI users who use AI to find/generate routes

**Target:**
- Phase 3+: 30%
- Phase 4+: 50%
- Phase 5+: 60%

**Measurement:**
- Event: `ai_route_search` or `ai_route_generated`
- Formula: `(Users who searched/generated routes) / (Total AI users)`

---

### 10. Time Spent in AI Chat
**Definition:** Average time users spend in AI chat screen (per session)

**Target:**
- Week 1: 2 minutes
- Month 3: 5 minutes
- Month 6: 8 minutes

**Measurement:**
- Track `ai_chat_opened` and `ai_chat_closed` events
- Calculate duration, average

---

## Quality Metrics

### 11. User Satisfaction (Thumbs Up Rate)
**Definition:** % of AI responses that receive a thumbs up (vs. thumbs down or no reaction)

**Target:**
- Week 1: 70%
- Month 3: 80%
- Month 6: 85%

**Measurement:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE feedback = 'thumbs_up') AS positive,
  COUNT(*) FILTER (WHERE feedback = 'thumbs_down') AS negative,
  COUNT(*) AS total_responses,
  ROUND(100.0 * positive / total_responses, 2) AS satisfaction_pct
FROM ai_response_feedback
WHERE created_at >= NOW() - INTERVAL '30 days';
```

**Insights:**
- If <70% → Review prompts, improve response quality
- If thumbs down >15% → Immediate intervention (check examples)

---

### 12. Response Accuracy
**Definition:** % of responses that are factually correct (human review)

**Target:**
- Week 1: 80%
- Month 3: 90%
- Month 6: 95%

**Measurement:**
- Sample 100 random conversations/week
- Human reviewers rate accuracy (0-100%)
- Average score

**Review Criteria:**
- Correct driving information
- Relevant to question
- No hallucinations (making up facts)

---

### 13. Response Time (p95)
**Definition:** 95th percentile AI response time (time from message sent → response starts streaming)

**Target:**
- Week 1: <5s
- Month 3: <2s
- Month 6: <1.5s

**Measurement:**
- Server logs (Edge Function timing)
- Calculate p50, p95, p99

**Alerts:**
- If p95 >5s for 30 minutes → Page on-call
- If p95 >10s → Emergency (investigate immediately)

---

### 14. Error Rate
**Definition:** % of AI requests that result in errors (5xx, timeouts, API failures)

**Target:**
- Week 1: <2%
- Month 3: <1%
- Month 6: <0.5%

**Measurement:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE status = 'error') AS errors,
  COUNT(*) AS total_requests,
  ROUND(100.0 * errors / total_requests, 2) AS error_rate_pct
FROM ai_request_logs
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

**Insights:**
- If >5% → Critical issue (check AI provider status, network)
- If >10% → Disable feature (kill switch)

---

### 15. First Response Success Rate
**Definition:** % of first AI responses that DON'T result in immediate re-ask (user asks same question differently)

**Target:**
- Week 1: 70%
- Month 3: 80%
- Month 6: 85%

**Measurement:**
- Detect similar follow-up questions (semantic similarity)
- If similarity >80% within 2 minutes → Failed first response

---

## Business Metrics

### 16. Conversion Impact (Free → Premium)
**Definition:** Conversion rate of users who used AI vs. those who didn't

**Target:**
- AI users convert at +10% higher rate than non-AI users

**Measurement:**
```sql
-- A/B test: AI users vs. non-AI users
SELECT 
  ai_user,
  COUNT(*) FILTER (WHERE converted_to_premium = true) AS conversions,
  COUNT(*) AS total_users,
  ROUND(100.0 * conversions / total_users, 2) AS conversion_rate_pct
FROM users
WHERE created_at >= '2026-06-01' -- Launch date
GROUP BY ai_user;
```

**Insights:**
- If no difference → AI doesn't drive conversions (re-evaluate strategy)
- If negative impact → AI is cannibalizing premium (offer AI as premium-only feature)

---

### 17. Support Ticket Reduction
**Definition:** % reduction in support tickets related to driving questions

**Target:**
- Month 3: -10%
- Month 6: -20%
- Month 12: -30%

**Measurement:**
- Compare support ticket volume (month over month)
- Filter tickets by category (driving questions, route help)

**Calculation:**
```
Baseline: 100 tickets/month (Jan-May 2026, pre-AI)
Post-AI: 80 tickets/month (Jun-Aug 2026)
Reduction: (100 - 80) / 100 = 20%
```

---

### 18. Revenue per AI User
**Definition:** Average revenue (subscriptions, ads) per user who uses AI

**Target:**
- Month 3: $1.50/user (vs. $1.00 baseline)
- Month 6: $2.00/user
- Month 12: $3.00/user

**Measurement:**
```sql
SELECT 
  AVG(revenue) AS avg_revenue_per_ai_user
FROM users
WHERE used_ai = true
  AND created_at >= NOW() - INTERVAL '30 days';
```

---

### 19. User Lifetime Value (LTV) Impact
**Definition:** LTV of AI users vs. non-AI users (12-month cohort)

**Target:**
- AI users have 20% higher LTV

**Measurement:**
- Track cohorts over 12 months
- Calculate LTV (average revenue per user over lifetime)
- Compare AI vs. non-AI cohorts

---

## Technical Metrics

### 20. Token Usage per Message
**Definition:** Average tokens consumed per AI message (input + output)

**Target:**
- Week 1: 500 tokens/message
- Month 3: 400 tokens/message (with optimization)
- Month 6: 300 tokens/message

**Measurement:**
- Log token counts from AI provider APIs
- Average per message

**Insights:**
- If >600 tokens → Context too large (compress)
- If <200 tokens → Responses too short (may lack quality)

---

### 21. Cache Hit Rate
**Definition:** % of AI requests served from cache (exact or semantic match)

**Target:**
- Week 4: 20%
- Month 3: 40%
- Month 6: 50%

**Measurement:**
```sql
SELECT 
  COUNT(*) FILTER (WHERE served_from_cache = true) AS cache_hits,
  COUNT(*) AS total_requests,
  ROUND(100.0 * cache_hits / total_requests, 2) AS cache_hit_rate_pct
FROM ai_request_logs
WHERE created_at >= NOW() - INTERVAL '30 days';
```

**Insights:**
- Higher cache hit rate = lower cost, faster responses
- If <20% → Improve caching strategy (semantic matching, longer TTL)

---

### 22. Database Query Performance
**Definition:** p95 query time for AI context fetching (learning path, user progress)

**Target:**
- Week 1: <500ms
- Month 3: <100ms
- Month 6: <50ms

**Measurement:**
- Supabase logs (query duration)
- Calculate p95

**Alerts:**
- If p95 >1s → Optimize queries (add indexes)

---

### 23. Uptime (AI Feature)
**Definition:** % of time AI feature is available (not disabled, no critical errors)

**Target:**
- Week 1: 95%
- Month 3: 99%
- Month 6: 99.5%

**Measurement:**
- Monitor health check endpoint (`/ai/health`)
- Calculate uptime percentage

**Calculation:**
```
Uptime = (Total time - Downtime) / Total time × 100
```

---

## User Satisfaction Metrics

### 24. Net Promoter Score (NPS) - AI Feature
**Definition:** How likely users are to recommend the AI feature (0-10 scale)

**Target:**
- Month 1: NPS 30 (Promoters - Detractors)
- Month 3: NPS 50
- Month 6: NPS 60

**Measurement:**
- In-app survey (monthly)
- Question: "How likely are you to recommend Vromm's AI assistant to a friend?"
- Promoters (9-10) - Detractors (0-6)

**Calculation:**
```
NPS = (% Promoters - % Detractors)
```

---

### 25. Feature Satisfaction Score
**Definition:** Average rating of AI feature (1-5 stars)

**Target:**
- Week 1: 3.5 stars
- Month 3: 4.0 stars
- Month 6: 4.3 stars

**Measurement:**
- In-app rating prompt (after 5+ interactions)
- Average all ratings

**Insights:**
- If <3.5 → Critical issues (investigate urgently)
- If >4.5 → Excellent (use for marketing)

---

### 26. Qualitative Feedback Volume
**Definition:** Number of users who provide written feedback (open-ended)

**Target:**
- Week 1: 20 responses
- Month 3: 100 responses
- Month 6: 300 responses

**Measurement:**
- Track in-app feedback form submissions
- Categorize feedback (positive, negative, feature request)

**Analysis:**
- Monthly review of themes
- Prioritize feature requests based on frequency

---

## Measurement Methods

### Analytics Implementation

**Event Tracking (Mixpanel/PostHog):**
```javascript
// User views AI chat
analytics.track('ai_chat_viewed', {
  screen: 'ChatScreen',
  timestamp: Date.now()
});

// User sends message
analytics.track('ai_message_sent', {
  conversation_id: conversationId,
  message_length: message.length,
  has_context: true,
  timestamp: Date.now()
});

// User receives response
analytics.track('ai_response_received', {
  conversation_id: conversationId,
  response_time_ms: responseTime,
  tokens_used: tokensUsed,
  model: 'gpt-4',
  timestamp: Date.now()
});

// User provides feedback
analytics.track('ai_feedback_given', {
  conversation_id: conversationId,
  feedback: 'thumbs_up',
  message_id: messageId,
  timestamp: Date.now()
});

// Inline "Ask AI" clicked
analytics.track('ask_ai_button_clicked', {
  source_screen: 'ExerciseDetailScreen',
  exercise_id: exerciseId,
  pre_filled_question: 'Explain this exercise',
  timestamp: Date.now()
});
```

**Database Logging:**
```sql
-- Create metrics table
CREATE TABLE ai_metrics_daily (
  date DATE PRIMARY KEY,
  total_messages INTEGER,
  unique_users INTEGER,
  avg_messages_per_user DECIMAL(10, 2),
  avg_response_time_ms INTEGER,
  error_rate_pct DECIMAL(5, 2),
  thumbs_up_pct DECIMAL(5, 2),
  cost_usd DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily aggregation (cron job)
INSERT INTO ai_metrics_daily (date, total_messages, unique_users, ...)
SELECT 
  CURRENT_DATE,
  COUNT(*) AS total_messages,
  COUNT(DISTINCT user_id) AS unique_users,
  AVG(messages_per_user),
  ...
FROM ai_conversations
WHERE DATE(created_at) = CURRENT_DATE;
```

---

## Dashboard & Reporting

### Real-Time Dashboard (Grafana/Mixpanel)
**Metrics Displayed:**
- 🟢 AI Uptime (99.5% ✅)
- ⚡ Response Time p95 (1.2s)
- 👥 Active AI Users (last hour: 23)
- 💬 Messages sent (today: 1,247)
- 😊 Satisfaction (thumbs up: 82%)
- 🔴 Error Rate (0.3%)
- 💰 Cost Today ($12.45)

**Update Frequency:** Every 5 minutes

---

### Weekly Report (Email to Team)
**Sections:**
1. **Adoption:**
   - New AI users this week: 145
   - Total AI users (all-time): 1,203
   - Trial rate: 58% ✅

2. **Engagement:**
   - Messages per user: 18.5 ✅
   - Conversation length: 6.2 messages
   - Inline "Ask AI" clicks: 432 (12% of views) ✅

3. **Quality:**
   - Satisfaction: 79% thumbs up 🟡 (target: 80%)
   - Response time p95: 1.8s ✅
   - Error rate: 0.4% ✅

4. **Business:**
   - Support tickets (driving questions): -15% 🎉
   - Conversion rate (AI users): 6.2% vs. 5.5% (non-AI) ✅

5. **Cost:**
   - Total cost this week: $85
   - Cost per user: $0.07 ✅
   - Budget status: 85% remaining

**Action Items:**
- 🟡 Improve satisfaction (currently 79%, target 80%)
  - Action: Review thumbs down responses, update prompts

---

### Monthly Review (Stakeholder Meeting)
**Agenda:**
1. **North Star Metric:** AI-Assisted Learning Sessions (target vs. actual)
2. **Key Wins:** Highlight biggest successes
3. **Challenges:** What's not working?
4. **Insights:** User feedback themes
5. **Next Month:** Priorities and experiments

**Deliverable:** Slide deck (10-15 slides)

---

## Success Criteria

### Phase 1 Success (Week 2)
- ✅ 30% of users try AI (send ≥1 message)
- ✅ 70% satisfaction (thumbs up rate)
- ✅ <5s response time (p95)
- ✅ <2% error rate
- ✅ Cost <$50/week

### Phase 2-5 Success (Week 15)
- ✅ 60% of users try AI
- ✅ 50% repeat usage (≥5 messages)
- ✅ 80% satisfaction
- ✅ <2s response time (p95)
- ✅ <0.5% error rate
- ✅ 30% use route discovery

### Phase 6 Success (Month 3 Post-Launch)
- ✅ 60% feature adoption
- ✅ 20 messages per user/month
- ✅ 85% satisfaction
- ✅ <2s response time (p95)
- ✅ <0.5% error rate
- ✅ +10% conversion uplift
- ✅ -20% support tickets (driving questions)
- ✅ NPS 50+
- ✅ Cost <$0.20/user

### Long-Term Success (Month 12)
- ✅ 70% feature adoption
- ✅ 25 messages per user/month
- ✅ 4.5+ star rating
- ✅ +20% LTV for AI users
- ✅ -30% support tickets
- ✅ Feature profitable (revenue > cost)

---

## Failure Criteria (Kill Switch Triggers)

**Immediate Disable (🔴 Critical):**
- Error rate >10% for 1 hour
- Response time p95 >30s
- Daily cost >$500 (unexpected spike)
- Critical safety issue (AI gives dangerous advice)

**Review & Fix (🟡 Warning):**
- Satisfaction <60% for 7 days
- Error rate >5% for 24 hours
- Adoption plateau <30% after 4 weeks
- Negative conversion impact (AI users convert less)

---

## Appendix: Metric Glossary

| Term | Definition |
|------|------------|
| **MAU** | Monthly Active Users (users who opened app ≥1 time in 30 days) |
| **DAU** | Daily Active Users (users who opened app on a given day) |
| **DAAU** | Daily Active AI Users (users who used AI on a given day) |
| **MPU** | Messages Per User (average AI messages sent per user) |
| **p50** | 50th percentile (median) |
| **p95** | 95th percentile (95% of values are below this) |
| **NPS** | Net Promoter Score (% Promoters - % Detractors) |
| **LTV** | Lifetime Value (total revenue from a user over their lifetime) |
| **Churn** | % of users who stop using the app |

---

**Last Updated:** 2026-02-14  
**Document Owner:** Product & Analytics Team  
**Review Cadence:** Weekly (first 3 months), Bi-weekly (months 4-6), Monthly (ongoing)
