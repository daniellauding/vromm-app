# AI Assistant - Risk Assessment Matrix

**Project:** Vromm AI Driving Assistant  
**Date:** 2026-02-14  
**Risk Owner:** Development Team  

---

## Risk Scoring

**Probability:** Low (1) | Medium (2) | High (3)  
**Impact:** Low (1) | Medium (2) | High (3)  
**Risk Score:** Probability × Impact (1-9)

**Priority:**
- 🔴 Critical (7-9): Immediate mitigation required
- 🟡 High (4-6): Monitor closely, plan mitigation
- 🟢 Low (1-3): Monitor, accept risk

---

## Risk Matrix

| ID | Risk | Prob | Impact | Score | Priority | Phase |
|----|------|------|--------|-------|----------|-------|
| R1 | API Cost Overruns | 3 | 3 | 9 | 🔴 Critical | All |
| R2 | Poor AI Response Quality | 2 | 3 | 6 | 🟡 High | 1-2 |
| R3 | OSM Route Gen Failures | 2 | 2 | 4 | 🟡 High | 4 |
| R4 | Performance/Latency | 2 | 2 | 4 | 🟡 High | All |
| R5 | User Privacy Concerns | 1 | 3 | 3 | 🟢 Low | All |
| R6 | Technical Debt | 3 | 2 | 6 | 🟡 High | All |
| R7 | Translation Quality | 1 | 2 | 2 | 🟢 Low | 6 |
| R8 | Dependency Breaking Changes | 2 | 1 | 2 | 🟢 Low | All |
| R9 | Team Velocity Slower | 2 | 2 | 4 | 🟡 High | All |
| R10 | Scope Creep | 2 | 2 | 4 | 🟡 High | All |
| R11 | AI Provider Downtime | 1 | 3 | 3 | 🟢 Low | All |
| R12 | User Adoption Low | 2 | 3 | 6 | 🟡 High | 6 |

---

## Detailed Risk Analysis

### 🔴 R1: API Cost Overruns
**Risk Score:** 9 (Probability: 3 | Impact: 3)

**Description:**  
Users send excessive messages, token usage exceeds budget by 5-10x, causing unsustainable costs.

**Impact:**
- Monthly cost exceeds $5,000
- Feature must be disabled or paywalled
- Negative revenue impact

**Probability Drivers:**
- No enforcement of rate limits initially
- Users discover unlimited free AI chat
- Viral growth without cost controls

**Mitigation Strategy:**

**Preventive (Before Launch):**
- ✅ Implement hard rate limits (5 msg/min, 100/day per user)
- ✅ Set token budget per conversation (max 10k tokens)
- ✅ Add cost monitoring dashboard (real-time)
- ✅ Use cheaper models (Gemini) for simple queries
- ✅ Implement aggressive caching (30% token savings)

**Detective (During Launch):**
- ✅ Daily cost alerts (email if >$100/day)
- ✅ Monitor cost per user (flag outliers >$5/month)
- ✅ Track token usage trends

**Corrective (If Triggered):**
- 🔴 Kill switch (disable AI for all new users)
- 🟡 Reduce rate limits to 3 msg/min, 50/day
- 🟡 Switch all traffic to Gemini (cheapest)
- 🟢 Implement freemium model ($2.99/month unlimited)

**Contingency Plan:**
- Budget: $500/month (1,000 MAU)
- Trigger: If cost >$750/month for 3 consecutive days
- Action: Pause AI for new users, investigate top users

**Status:** Active mitigation in progress

---

### 🟡 R2: Poor AI Response Quality
**Risk Score:** 6 (Probability: 2 | Impact: 3)

**Description:**  
AI provides incorrect driving advice, confusing or irrelevant responses, hurting user trust.

**Impact:**
- User complaints & poor ratings
- Support ticket increase
- Feature abandonment
- Potential safety liability

**Probability Drivers:**
- Inadequate prompt engineering
- AI model limitations (hallucinations)
- Insufficient context
- Edge cases not tested

**Mitigation Strategy:**

**Preventive:**
- ✅ Extensive prompt engineering (100+ test cases)
- ✅ Add disclaimer: "AI suggestions are not professional advice"
- ✅ Human review of first 1,000 conversations
- ✅ Thumbs up/down feedback on every response
- ✅ Fallback responses for uncertain queries ("I'm not sure, please ask...")
- ✅ Context validation (ensure learning path data is correct)

**Detective:**
- ✅ Track thumbs down rate (alert if >20%)
- ✅ Keyword monitoring (flag responses mentioning "illegal", "dangerous")
- ✅ User feedback analysis (weekly review)

**Corrective:**
- 🟡 Update system prompt based on feedback
- 🟡 Add response validation layer (filter unsafe advice)
- 🟢 Create curated Q&A fallback (100 common questions)

**Contingency Plan:**
- If satisfaction <60% (thumbs up) for 7 days:
  1. Pause AI for new users
  2. Conduct root cause analysis
  3. Implement fixes
  4. Re-enable for beta users only

**Status:** Monitoring in Phase 1-2

---

### 🟡 R3: OSM Route Generation Failures
**Risk Score:** 4 (Probability: 2 | Impact: 2)

**Description:**  
AI-generated routes are unsafe, illegal (one-way violations), or nonsensical (zigzags, dead ends).

**Impact:**
- User frustration
- Negative reviews
- Potential liability (if user follows unsafe route)
- Feature disabled

**Probability Drivers:**
- Complex routing logic (bugs)
- OSM data quality issues
- Insufficient validation

**Mitigation Strategy:**

**Preventive:**
- ✅ Multi-stage validation (road type, speed limits, legality)
- ✅ Manual review of first 100 generated routes
- ✅ Automated safety checks:
  - No highways for beginners
  - No one-way violations
  - No private roads
  - Minimum road width
- ✅ Route quality scoring (reject if score <60/100)
- ✅ Start with known-safe areas only (Stockholm, Gothenburg)

**Detective:**
- ✅ User reporting system ("Flag Route" button)
- ✅ Track route acceptance rate
- ✅ Monitor route generation errors

**Corrective:**
- 🟡 Disable route generation for problematic areas
- 🟡 Add more validation rules
- 🟢 Human review queue (flagged routes)

**Contingency Plan:**
- If >5% of generated routes are flagged as unsafe:
  1. Disable route generation
  2. Keep route discovery only
  3. Partner with professional route creators

**Status:** Design validation system in Phase 4

---

### 🟡 R4: Performance/Latency Issues
**Risk Score:** 4 (Probability: 2 | Impact: 2)

**Description:**  
AI responses take >10 seconds, app feels slow, users abandon feature.

**Impact:**
- Poor user experience
- Feature abandonment
- Negative reviews

**Probability Drivers:**
- Large context size (too many tokens)
- Slow AI provider responses
- Database query bottlenecks
- Network latency

**Mitigation Strategy:**

**Preventive:**
- ✅ Streaming responses (show partial answers)
- ✅ Optimistic UI ("AI is thinking..." animation)
- ✅ Aggressive caching (same question → instant response)
- ✅ Database query optimization (indexes on all queries)
- ✅ Context compression (summarize, don't send full history)

**Detective:**
- ✅ Monitor response time (p50, p95, p99)
- ✅ Alert if p95 >5s
- ✅ Track slow queries (>1s)

**Corrective:**
- 🟡 Reduce context size (sacrifice accuracy for speed)
- 🟡 Switch to faster models (GPT-4 Turbo → GPT-3.5)
- 🟡 Add queue system (process during off-peak)

**Performance Targets:**
- p50: <1s
- p95: <2s
- p99: <5s

**Contingency Plan:**
- If p95 >10s for 1 hour:
  1. Switch all traffic to GPT-3.5 (faster)
  2. Reduce context to 1,000 tokens
  3. Disable route generation (slowest feature)

**Status:** Monitor starting Phase 1

---

### 🟢 R5: User Privacy Concerns
**Risk Score:** 3 (Probability: 1 | Impact: 3)

**Description:**  
Users worry about conversation data privacy, GDPR violations, or data sharing with AI providers.

**Impact:**
- Trust erosion
- Feature opt-out
- Legal liability (GDPR fines)
- PR damage

**Probability Drivers:**
- Unclear privacy policy
- Data breach
- Perceived data sharing with AI providers

**Mitigation Strategy:**

**Preventive:**
- ✅ GDPR compliance from day 1
- ✅ Data deletion on user request (right to be forgotten)
- ✅ Anonymous conversation analytics (no PII)
- ✅ No conversation data shared with AI providers (proxy via Supabase)
- ✅ Clear privacy policy (AI usage disclosed)
- ✅ Opt-out option (disable AI entirely)
- ✅ Encrypt conversations at rest

**Detective:**
- ✅ Privacy policy acceptance tracking
- ✅ Monitor opt-out rate

**Corrective:**
- 🟡 Update privacy policy based on feedback
- 🟢 Add more transparency (show what data is sent)

**Compliance Checklist:**
- [ ] GDPR data processing agreement
- [ ] Data retention policy (delete after 90 days)
- [ ] User consent (explicit opt-in)
- [ ] Data export functionality (download conversations)
- [ ] Data deletion functionality (delete all conversations)

**Status:** Legal review before Phase 6 launch

---

### 🟡 R6: Technical Debt Accumulation
**Risk Score:** 6 (Probability: 3 | Impact: 2)

**Description:**  
Rushed development leads to messy code, bugs, and maintenance nightmares post-launch.

**Impact:**
- Slower feature development later
- Higher bug rate
- Team frustration
- Difficulty onboarding new developers

**Probability Drivers:**
- Tight deadlines
- "Just ship it" mentality
- Lack of code reviews

**Mitigation Strategy:**

**Preventive:**
- ✅ Code reviews for all AI-related code
- ✅ Refactoring sprints every 2 weeks (20% of time)
- ✅ Documentation alongside code (JSDoc, README)
- ✅ Automated linting & formatting (ESLint, Prettier)
- ✅ Unit tests for critical functions (>80% coverage)
- ✅ Architecture review before each phase

**Detective:**
- ✅ Track code complexity (SonarQube)
- ✅ Monitor tech debt issues (GitHub labels)

**Corrective:**
- 🟡 Schedule dedicated refactoring weeks
- 🟢 Reject PRs with high complexity

**Technical Debt Budget:**
- Maximum 5 "quick fix" items per phase
- Refactoring sprint after Phase 3 and Phase 5

**Status:** Ongoing monitoring

---

### 🟢 R7: Translation Quality (Swedish)
**Risk Score:** 2 (Probability: 1 | Impact: 2)

**Description:**  
Swedish translations are awkward, incorrect, or missing, hurting UX for Swedish users.

**Impact:**
- Poor user experience
- Complaints from Swedish users
- Rework required

**Probability Drivers:**
- Relying on machine translation (Google Translate)
- Lack of native speaker review

**Mitigation Strategy:**

**Preventive:**
- ✅ Hire professional Swedish translator (native speaker)
- ✅ Native speaker testing (5 Swedish beta users)
- ✅ Translation memory (reuse common phrases)

**Detective:**
- ✅ User feedback on translation quality

**Corrective:**
- 🟡 Update translations based on feedback

**Contingency Plan:**
- If Swedish translation quality complaints >10%:
  - Hire second translator for review
  - Re-translate all AI prompts

**Status:** Plan for Phase 6

---

### 🟢 R8: Dependency Breaking Changes
**Risk Score:** 2 (Probability: 2 | Impact: 1)

**Description:**  
Expo, React Native, Supabase, or AI provider updates break existing code.

**Impact:**
- Development delays
- Bugs introduced
- Rework required

**Mitigation Strategy:**

**Preventive:**
- ✅ Lock dependency versions (package-lock.json)
- ✅ Test updates in staging first
- ✅ Subscribe to changelogs (OpenAI, Supabase)
- ✅ Automated tests catch breakage

**Corrective:**
- 🟡 Rollback to previous version
- 🟡 Apply patches

**Status:** Ongoing monitoring

---

### 🟡 R9: Team Velocity Slower Than Expected
**Risk Score:** 4 (Probability: 2 | Impact: 2)

**Description:**  
Development takes longer than estimated, phases slip, launch delayed.

**Impact:**
- Timeline delay (17 weeks → 20+ weeks)
- Budget overrun
- Missed market opportunity

**Probability Drivers:**
- Underestimated complexity
- Team member sick/vacation
- Scope creep
- Unforeseen technical issues

**Mitigation Strategy:**

**Preventive:**
- ✅ Add 2-week buffer (not in timeline)
- ✅ Weekly velocity tracking (burndown chart)
- ✅ Break work into small tasks (1-2 day chunks)
- ✅ Daily standups (identify blockers)

**Detective:**
- ✅ Monitor velocity weekly
- ✅ Alert if phase is >20% behind

**Corrective:**
- 🟡 Add temporary contractor
- 🟡 Reduce scope (cut Phase 5 features)
- 🟢 Extend timeline (use buffer)

**Contingency Plan:**
- If 1 week behind after Phase 2:
  - Review scope, cut non-essential features
  - Consider adding 1 more developer

**Status:** Track starting Week 1

---

### 🟡 R10: Scope Creep
**Risk Score:** 4 (Probability: 2 | Impact: 2)

**Description:**  
Stakeholders request new features mid-development, expanding scope and delaying launch.

**Impact:**
- Timeline delay
- Budget overrun
- Team burnout

**Mitigation Strategy:**

**Preventive:**
- ✅ Lock scope after Phase 1
- ✅ Feature request backlog (for post-launch)
- ✅ Stakeholder sign-off on roadmap

**Detective:**
- ✅ Track feature requests

**Corrective:**
- 🟡 Evaluate impact, delay to v2.0
- 🟢 Say no (politely)

**Status:** Enforce starting Week 1

---

### 🟢 R11: AI Provider Downtime
**Risk Score:** 3 (Probability: 1 | Impact: 3)

**Description:**  
OpenAI, Claude, or Gemini API experiences outage, AI feature unavailable.

**Impact:**
- Feature unavailable (minutes to hours)
- User frustration
- Negative reviews

**Mitigation Strategy:**

**Preventive:**
- ✅ Multi-provider support (3 providers)
- ✅ Automatic failover (if OpenAI down → try Claude)
- ✅ Status page monitoring (OpenAI Status)

**Detective:**
- ✅ Monitor API response codes (track 5xx errors)

**Corrective:**
- 🟡 Failover to backup provider
- 🟢 Show user-friendly error message

**Contingency Plan:**
- If all 3 providers down (unlikely):
  - Show cached responses (if available)
  - Display status message: "AI temporarily unavailable"

**Status:** Design failover in Phase 1

---

### 🟡 R12: User Adoption Low
**Risk Score:** 6 (Probability: 2 | Impact: 3)

**Description:**  
Users don't discover or try AI feature, adoption <30% after 30 days.

**Impact:**
- Low ROI on development investment
- Feature perceived as failure
- Wasted resources

**Probability Drivers:**
- Poor discoverability (hidden in settings)
- Lack of marketing
- Feature not compelling

**Mitigation Strategy:**

**Preventive:**
- ✅ Prominent in-app placement (bottom tab bar)
- ✅ Onboarding tutorial (highlight AI)
- ✅ Push notification (invite to try AI)
- ✅ Inline "Ask AI" buttons everywhere
- ✅ Blog post, social media campaign

**Detective:**
- ✅ Track adoption rate (% users who send ≥1 message)
- ✅ Monitor daily active AI users

**Corrective:**
- 🟡 A/B test different UI placements
- 🟡 Incentivize trial (unlock achievement)
- 🟢 Improve marketing

**Adoption Targets:**
- Week 1: 20% try AI
- Week 2: 40% try AI
- Week 4: 60% try AI

**Contingency Plan:**
- If <30% adoption after 2 weeks:
  - Redesign UI (make more prominent)
  - Add gamification (badge for first AI chat)
  - Send targeted push notifications

**Status:** Plan for Phase 6 launch

---

## Risk Heatmap

```
IMPACT
  │
3 │  R1    R2                  R5  R11
  │  🔴    🟡                  🟢  🟢
  │
2 │         R3    R4    R6    R9  R10
  │         🟡    🟡    🟡    🟡  🟡
  │
1 │                      R7         R8
  │                      🟢         🟢
  │
  └─────────────────────────────────────
       1         2         3
              PROBABILITY
```

---

## Risk Review Schedule

**Weekly (Team):**
- Review active risks
- Update mitigation status
- Identify new risks

**Bi-weekly (Stakeholders):**
- Report on critical risks (🔴)
- Discuss mitigation progress

**Monthly (Executive):**
- Risk summary
- Budget impact
- Timeline impact

---

## Risk Escalation

**If Critical Risk (🔴) Triggered:**
1. Notify project manager immediately
2. Activate contingency plan
3. Daily status updates
4. Stakeholder briefing within 24 hours

**If High Risk (🟡) Triggered:**
1. Notify team lead
2. Implement corrective actions
3. Monitor closely
4. Update stakeholders in next sync

---

## Success Criteria

**Risk Management Success:**
- No critical risks (🔴) materialized
- High risks (🟡) mitigated before becoming critical
- Timeline stays within 17 weeks (+ 2-week buffer)
- Budget stays within $150k (+ 10% contingency)

---

**Last Updated:** 2026-02-14  
**Next Review:** Weekly during development  
**Document Owner:** Development Team
