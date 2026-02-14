# AI Assistant - Quick Reference Guide

**Project:** Vromm AI Driving Assistant  
**Status:** Planning Phase (No Implementation)  
**Branch:** `feature/ai-driving-assistant`  
**Last Updated:** 2026-02-14  

---

## 📋 TL;DR

**Goal:** Build an AI assistant that helps users learn to drive, discover routes, and get personalized guidance.

**Timeline:** 17 weeks (4 months)  
**Team:** Small team (2 devs + 0.5 designer + 0.5 QA + PM) - RECOMMENDED  
**Budget:** $134,400 (development) + $159/month (operations at 1k MAU)  
**Launch:** Mid-June 2026  

**Success Metric:** 60% adoption, 85% satisfaction, <$0.20/user cost

---

## 🗺️ Roadmap Overview

| Phase | Duration | Key Features | Milestone |
|-------|----------|--------------|-----------|
| **1: MVP** | 2 weeks | Chat UI, basic Q&A, 3 AI providers | ✅ Chat works |
| **2: Context** | 3 weeks | Knows learning path, progress, inline buttons | ✅ Context-aware |
| **3: Routes** | 3 weeks | Finds routes in DB, OSM integration | ✅ Route discovery |
| **4: Advanced** | 4 weeks | Generates NEW routes, deep OSM | ✅ Route generation |
| **5: Personal** | 3 weeks | Learns user patterns, custom plans | ✅ Personalized |
| **6: Launch** | 2 weeks | Multi-language (SWE/ENG), optimization | 🚀 Production |

**Total:** 17 weeks

---

## 🎯 Success Criteria (30 Days Post-Launch)

| Metric | Target | Status |
|--------|--------|--------|
| **Adoption** | 60% of active users try AI | - |
| **Engagement** | 20 messages/user/month | - |
| **Satisfaction** | 85% thumbs up | - |
| **Response Time** | <2s (p95) | - |
| **Error Rate** | <0.5% | - |
| **Cost** | <$0.20/user | - |
| **Conversion Uplift** | +10% (free → premium) | - |
| **Support Reduction** | -20% tickets (driving questions) | - |

---

## 💰 Budget Breakdown

### Development (One-Time)
| Item | Cost |
|------|------|
| Small Team (12 weeks) | $134,400 |
| Testing & QA | $5,000 |
| **Total** | **$139,400** |

### Operations (Monthly, 1k MAU)
| Item | Cost/Month |
|------|------------|
| AI APIs (OpenAI, Claude, Gemini) | $0.68 |
| Supabase | $57.75 |
| OSM Routing Servers | $75 |
| Monitoring (Sentry) | $26 |
| **Total** | **$159.43** |

**Cost per User:** ~$0.16/month (at 1k MAU)

### Scaling
| MAU | Monthly Cost | Cost/User |
|-----|--------------|-----------|
| 100 | $159 | $1.59 |
| 1,000 | $159 | $0.16 |
| 5,000 | $362 | $0.07 |
| 10,000 | $566 | $0.06 |

---

## 🔧 Tech Stack

**Frontend:**
- React Native 0.79.3
- Expo SDK 53
- Tamagui 1.121
- TypeScript 5.9

**Backend:**
- Supabase (PostgreSQL + Edge Functions)
- Deno runtime

**AI:**
- OpenAI GPT-4 Turbo (primary, 80%)
- Anthropic Claude 3.5 Sonnet (fallback, 15%)
- Google Gemini Pro (cost-effective, 5%)

**Maps:**
- OpenStreetMap (data)
- Nominatim (geocoding)
- GraphHopper/OSRM (routing)

**Monitoring:**
- Sentry (errors)
- Mixpanel/PostHog (analytics)
- Grafana (performance)

---

## 📊 Key Metrics to Track

### Adoption
- **Trial Rate:** % of users who send ≥1 message (Target: 60%)
- **Repeat Usage:** % who send ≥5 messages (Target: 50%)
- **Daily Active AI Users:** Users/day (Target: 500/day at Month 3)

### Quality
- **Satisfaction:** % thumbs up (Target: 85%)
- **Response Time:** p95 latency (Target: <2s)
- **Error Rate:** % failed requests (Target: <0.5%)

### Business
- **Conversion Uplift:** AI users vs. non-AI users (Target: +10%)
- **Support Tickets:** Reduction in driving questions (Target: -20%)
- **Cost per User:** Monthly cost (Target: <$0.20)

---

## ⚠️ Top 5 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **1. API Cost Overruns** | HIGH | HIGH | Rate limits, caching, Gemini fallback |
| **2. Poor AI Quality** | MEDIUM | HIGH | Prompt engineering, human review, feedback loop |
| **3. OSM Route Gen Fails** | MEDIUM | MEDIUM | Validation, manual review, safe areas only |
| **4. Performance Issues** | MEDIUM | MEDIUM | Streaming, caching, optimization |
| **5. Low Adoption** | MEDIUM | HIGH | Prominent UI, onboarding, marketing |

**Kill Switch:** Feature flag to disable AI instantly if critical issue arises.

---

## 🚀 Launch Plan

### Week 17: Beta Testing
**Day 1-3:** Closed Beta (50 users)
- Invite-only
- Feedback collection
- Monitor errors & cost

**Day 4-7:** Open Beta (gradual rollout)
- Day 4: 10% of users
- Day 5: 25% of users
- Day 6: 50% of users
- Day 7: 100% of users

### Week 18: Full Launch
- App Store update
- Blog post + social media
- Monitoring dashboard live
- 30-day intensive tracking

**Rollback Trigger:**
- Error rate >5%
- Response time >10s
- Daily cost >$100

---

## 🛠️ Development Priorities

### Phase 1 (Weeks 1-2) - MUST HAVE
- ✅ Chat UI (Tamagui)
- ✅ Message bubbles (user/assistant)
- ✅ Supabase Edge Function (AI proxy)
- ✅ OpenAI + Claude + Gemini integration
- ✅ Rate limiting (5 msg/min, 100/day)
- ✅ Chat history (database)
- ✅ Streaming responses (SSE)

### Phase 2 (Weeks 3-5) - MUST HAVE
- ✅ Context builder (learning path, progress)
- ✅ Dynamic system prompt
- ✅ Inline "Ask AI" buttons (5+ screens)
- ✅ Quick actions (Explain, Example, Quiz)
- ✅ Multi-threaded conversations

### Phase 3 (Weeks 6-8) - MUST HAVE
- ✅ Database route search (full-text + semantic)
- ✅ OSM geocoding (Nominatim)
- ✅ Natural language route queries
- ✅ Route recommendations

### Phase 4 (Weeks 9-12) - SHOULD HAVE
- ⚠️ Route generation engine (complex!)
- ⚠️ Safety validation (multi-stage)
- ⚠️ Quality scoring (0-100)
- ⚠️ Deep OSM integration (GraphHopper)

_Note: If timeline slips, deprioritize route generation (keep discovery only)_

### Phase 5 (Weeks 13-15) - NICE TO HAVE
- 💡 Pattern learning (user behavior)
- 💡 Adaptive difficulty
- 💡 Custom learning plans
- 💡 ML models (lightweight)

_Note: Can be post-launch feature (v2.0)_

### Phase 6 (Weeks 16-17) - MUST HAVE
- ✅ Performance optimization
- ✅ Swedish translation (professional)
- ✅ English completeness check
- ✅ Beta testing (50 users)
- ✅ Monitoring dashboard

---

## 📈 Cost Optimization Strategies

### Immediate (30% savings)
- ✅ Cache responses (30-day TTL)
- ✅ Compress context (summarize old messages)
- ✅ Smart prompt design (fewer tokens)

### Advanced (50% additional savings)
- ✅ Use Gemini for simple queries (50% cheaper)
- ✅ Semantic caching (similar questions)
- ✅ Fine-tune smaller model (GPT-3.5)

**Result:** $0.68/1k users → $0.20/1k users (70% reduction)

---

## 🎨 UI/UX Guidelines

### Chat Screen
- Tamagui `Sheet` component (expandable)
- `FlatList` for messages (performance)
- Streaming indicator (typing animation)
- Error states (retry button)
- Thumbs up/down feedback (every response)

### Inline "Ask AI" Buttons
- Floating button (bottom-right, 56×56pt)
- Quick actions (chips: Explain, Example, Quiz)
- Pre-filled questions (contextual)
- Deep link to chat (preserve context)

### Accessibility
- VoiceOver/TalkBack support
- High contrast mode
- Minimum touch targets (44×44pt)
- Keyboard navigation

---

## 🔍 Testing Strategy

### Unit Tests (Jest)
- AI context builder
- Message parsing
- Route generation logic
- Quality scoring
- **Coverage:** >80%

### Integration Tests (Detox)
- Chat send → AI response → display
- Route search → results → selection
- Multi-provider fallback (OpenAI fails → Claude)
- Rate limiting enforcement

### UAT (10 Beta Users per Phase)
- Test scenarios (scripted)
- Feedback collection (in-app survey)
- Analytics tracking (engagement, errors)

### Performance Tests (k6)
- Response time: <2s (p95)
- Concurrent users: 100 simultaneous chats
- Token usage: <500 tokens/message

---

## 📝 Documentation Checklist

### Before Development
- [ ] Stakeholder approval on roadmap
- [ ] Design mockups finalized
- [ ] Privacy policy updated (AI usage disclosure)
- [ ] API keys secured (Supabase Secrets)

### During Development
- [ ] Code documentation (JSDoc)
- [ ] API documentation (OpenAPI spec for Edge Functions)
- [ ] Database schema documentation
- [ ] Testing documentation (test plans)

### Before Launch
- [ ] User guide (how to use AI assistant)
- [ ] Support team training (AI feature)
- [ ] Marketing materials (blog post, social media)
- [ ] Legal review (GDPR compliance)

---

## 🚨 Emergency Procedures

### If Error Rate >10%
1. Check AI provider status (OpenAI, Claude, Gemini)
2. Review recent code changes (rollback if needed)
3. Check network/server status
4. If unresolved in 1 hour → **Disable AI (kill switch)**

### If Cost >$100/Day
1. Check top users by token usage (flag outliers)
2. Check for abuse/bots (abnormal message patterns)
3. Temporarily reduce rate limits (5 → 3 msg/min)
4. Switch all traffic to Gemini (cheapest)

### If Satisfaction <60% for 7 Days
1. Sample 100 thumbs down responses
2. Identify common issues (hallucinations, irrelevant answers)
3. Update system prompts
4. Consider pausing AI for new users until fixed

---

## 📞 Contact & Resources

### Team Roles
- **Product Owner:** [Name] - Feature priorities, roadmap
- **Tech Lead:** [Name] - Architecture, code reviews
- **Frontend Dev:** [Name] - Chat UI, inline buttons
- **Backend Dev:** [Name] - Edge Functions, AI integration
- **QA:** [Name] - Testing, bug tracking
- **PM:** [Name] - Timeline, coordination

### Key Documents
- **Full Roadmap:** `AI-ASSISTANT-ROADMAP.md`
- **Gantt Chart:** `docs/AI-ASSISTANT-GANTT.txt`
- **Risk Matrix:** `docs/AI-ASSISTANT-RISK-MATRIX.md`
- **Cost Breakdown:** `docs/AI-ASSISTANT-COST-BREAKDOWN.md`
- **Success Metrics:** `docs/AI-ASSISTANT-SUCCESS-METRICS.md`

### External Resources
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OpenAI API Docs](https://platform.openai.com/docs/api-reference)
- [OSM Routing Wiki](https://wiki.openstreetmap.org/wiki/Routing)
- [React Native Performance](https://reactnative.dev/docs/performance)

---

## ✅ Next Steps (Week 1)

### Day 1-2: Setup
- [ ] Create GitHub issues for Week 1 tasks
- [ ] Setup Supabase project (if not exists)
- [ ] Get API keys (OpenAI, Claude, Gemini)
- [ ] Create development branch (`feature/ai-driving-assistant`)

### Day 3-4: Frontend
- [ ] Create `AIChatScreen.tsx`
- [ ] Build message components (`MessageBubble.tsx`)
- [ ] Implement chat input with keyboard handling
- [ ] Add loading states

### Day 5: Backend
- [ ] Create Supabase Edge Function (`ai-chat`)
- [ ] Setup OpenAI integration
- [ ] Add basic error handling

### End of Week 1: Demo
- [ ] Internal demo (send message → get response)
- [ ] Team feedback
- [ ] Adjust Week 2 priorities

---

## 🎉 Success Looks Like...

**Week 2:**
- "I can chat with the AI and it responds!" ✅

**Week 5:**
- "The AI knows what I'm learning and gives personalized tips!" ✅

**Week 8:**
- "I asked for scenic routes near Stockholm and it found 5 great options!" ✅

**Week 12:**
- "The AI just generated a custom practice route for me!" ✅

**Month 3:**
- "60% of our users are using the AI assistant!" 🎉
- "Support tickets about driving questions are down 20%!" 🎉
- "Users love it (85% satisfaction)!" 🎉

---

## 🤔 FAQs

**Q: What if we're behind schedule after Phase 2?**  
A: Use the 2-week buffer, or deprioritize Phase 5 (personalization) to post-launch.

**Q: What if API costs are too high?**  
A: Switch more traffic to Gemini (5x cheaper), implement aggressive caching, reduce rate limits.

**Q: What if users don't adopt the feature?**  
A: A/B test UI placement, add onboarding tutorial, send push notifications, add gamification (badges).

**Q: Can we launch without route generation (Phase 4)?**  
A: Yes! Route discovery (Phase 3) is valuable on its own. Generation can be v2.0.

**Q: What if one AI provider goes down?**  
A: Automatic failover to backup provider (OpenAI → Claude → Gemini).

---

**Last Updated:** 2026-02-14  
**Document Owner:** Development Team  
**Review Cadence:** Weekly during development

---

## 🏁 Ready to Build?

1. Read full roadmap: `AI-ASSISTANT-ROADMAP.md`
2. Review risks: `docs/AI-ASSISTANT-RISK-MATRIX.md`
3. Setup development environment
4. Create Week 1 GitHub issues
5. **Start coding!** 🚀

Good luck! 🎉
