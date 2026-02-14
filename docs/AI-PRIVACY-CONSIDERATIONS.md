# AI Privacy Considerations

**Version:** 1.0  
**Related:** AI-LEARNINGPATH-INTEGRATION.md  
**Purpose:** Privacy, security, and ethical guidelines for AI features

---

## 1. Overview

This document outlines privacy protections, data handling policies, and ethical considerations for Vromm's AI-powered learning assistant. The guiding principle is **privacy by design** — user privacy is a core feature, not an afterthought.

### 1.1 Core Privacy Principles

1. **Data Minimization**: AI accesses only data necessary for the specific task
2. **User Control**: Users can disable AI, delete history, and control data sharing
3. **Transparency**: Clear communication about what data AI uses and how
4. **Purpose Limitation**: Data collected for AI is not repurposed without consent
5. **Security**: AI context data is encrypted in transit and at rest
6. **Anonymization**: No PII sent to external AI providers
7. **Right to Deletion**: Users can delete all AI-related data anytime

---

## 2. What Data AI Accesses

### 2.1 Data AI CAN Access

✅ **User's Own Learning Data**
- Exercise completion history (when, which exercises, scores)
- Learning path progress (percentage complete, last activity)
- Quiz attempts and scores
- Practice patterns (time of day, session length, frequency)
- Detected learning patterns (strengths, weaknesses, plateaus)
- Previous AI conversations (conversation history)

✅ **Exercise Content Data** (Public)
- Exercise descriptions, titles, instructions
- Learning path content and structure
- Theory content (Swedish traffic laws)
- Media links (YouTube URLs, images)

✅ **Anonymous Aggregate Statistics**
- "You're in the top 15% of learners" (no individual user data)
- Average completion rates for exercises (anonymized)
- Typical learning timelines (anonymized)

✅ **User-Provided Context**
- Goals stated to AI ("I want to pass my test in 3 weeks")
- Questions asked in AI chat
- Feedback on AI responses

### 2.2 Data AI CANNOT Access

❌ **Personal Identifiable Information (PII)**
- Full name (only first name if needed for personalization)
- Email address
- Phone number
- Physical address
- Payment information
- IP address

❌ **Sensitive Personal Data**
- Medical information
- Ethnic origin
- Political opinions
- Religious beliefs

❌ **Other Users' Data**
- Other students' identifiable learning data
- Instructor notes about other students
- Private messages between other users

❌ **Unrelated Platform Data**
- Login credentials
- OAuth tokens
- Session IDs
- Device identifiers (unless for fraud prevention)

❌ **Location Data** (unless explicitly shared)
- GPS coordinates
- Route recordings (GPS tracks)
- Location history

### 2.3 Data Sent to External AI Providers

When using third-party AI services (e.g., Claude, GPT-4):

**What is sent:**
- User's question/message (text only)
- Context summary (anonymized):
  - Exercise title and description
  - Aggregated statistics (e.g., "attempted 3 times, completed 1")
  - Learning patterns (e.g., "low completion rate on roundabouts")
  - Previous AI conversation (sanitized)

**What is NOT sent:**
- User IDs (replaced with session hash)
- Email, name, or PII
- Raw database records
- Payment information
- Location data

**Example of sanitized context sent to AI:**
```json
{
  "user": {
    "session_hash": "a3f2b1c9", 
    "experience_level": "beginner",
    "days_since_signup": 23
  },
  "current_exercise": {
    "title": "Roundabout Practice",
    "user_attempts": 3,
    "user_completions": 1,
    "common_mistake": "signaling timing"
  }
}
```

---

## 3. User Privacy Controls

### 3.1 Privacy Settings

Users have granular control over AI features:

```typescript
interface AIPrivacySettings {
  // Master toggle
  ai_enabled: boolean; 
  // Default: true (opt-out model, with clear consent)
  
  // Feature-level controls
  allow_pattern_detection: boolean; 
  // Default: true
  // Enables background analysis of learning patterns
  
  allow_proactive_suggestions: boolean; 
  // Default: true
  // AI can send unsolicited helpful notifications
  
  allow_performance_comparison: boolean; 
  // Default: true
  // Show stats like "top 15% of learners"
  
  // Data sharing
  share_anonymous_data_for_improvements: boolean; 
  // Default: false (opt-in)
  // Help improve AI by sharing anonymized data
  
  allow_conversation_storage: boolean; 
  // Default: true
  // Store chat history for context in future conversations
  
  // Retention
  conversation_retention_days: number; 
  // Options: 0 (no storage), 30, 90
  // Default: 90
  
  pattern_retention_days: number; 
  // Options: 7, 30, 90, 365
  // Default: 90
  
  // Instructor sharing
  allow_instructor_access_to_ai_insights: boolean; 
  // Default: false (opt-in)
  // Let instructor see AI-generated insights about your learning
}
```

**UI Location**: Settings → AI & Privacy

**Default Behavior**: 
- AI enabled by default, but first-run consent screen explains data usage
- Most privacy-respecting options as defaults
- Data sharing is opt-in, not opt-out

### 3.2 Data Deletion

**"Clear AI History" Button**
- Location: Settings → AI & Privacy
- Action: Deletes all AI conversations, pattern data, and interventions
- Retention: Deleted data is purged from database within 24 hours
- Effect: AI will not remember past conversations or patterns

**"Disable AI Entirely" Toggle**
- Location: Settings → AI & Privacy
- Action: Disables all AI features, stops data collection
- Effect: 
  - Hides "Ask AI" buttons
  - Stops pattern detection
  - No AI notifications
  - Existing data not deleted (user must explicitly choose "Clear AI History")

**Account Deletion**
- When user deletes account, ALL AI-related data is deleted:
  - `ai_conversations` → CASCADE DELETE
  - `learning_patterns` → CASCADE DELETE
  - `ai_interventions` → CASCADE DELETE
  - `daily_practice_logs` → CASCADE DELETE

### 3.3 Data Export

**GDPR Compliance: Right to Data Portability**

Users can export all AI-related data:

**Export Includes:**
- All AI conversations (JSON format)
- Detected learning patterns
- AI interventions received
- Feedback provided on AI responses
- Context snapshots (what AI knew at each conversation)

**Export Format**: JSON file
**Delivery**: Download link or email
**Timeline**: Available within 48 hours of request

**Example Export Structure:**
```json
{
  "export_date": "2026-02-14T10:30:00Z",
  "user_id": "hashed-for-privacy",
  "data": {
    "conversations": [
      {
        "id": "conv-123",
        "date": "2026-02-10T14:20:00Z",
        "user_message": "How do I signal in roundabouts?",
        "ai_response": "In Swedish roundabouts...",
        "helpful_rating": 5,
        "context_at_time": { ... }
      }
    ],
    "learning_patterns": [
      {
        "pattern": "common_mistake",
        "category": "roundabouts",
        "description": "Signaling timing inconsistent",
        "detected": "2026-02-09",
        "confidence": 85
      }
    ],
    "interventions": [
      {
        "type": "exercise_switch",
        "suggested": "Try focused signaling exercise",
        "user_action": "accepted",
        "outcome": "improved_performance"
      }
    ]
  }
}
```

---

## 4. GDPR & Legal Compliance

### 4.1 GDPR Rights

| Right | How Vromm Implements |
|-------|---------------------|
| **Right to be Informed** | Clear privacy policy, first-run consent screen explaining AI data usage |
| **Right of Access** | Users can view all AI conversations in-app, export full data |
| **Right to Rectification** | Users can edit/delete individual AI conversations |
| **Right to Erasure** | "Clear AI History" and "Delete Account" features |
| **Right to Restrict Processing** | "Disable AI" toggle stops all AI processing |
| **Right to Data Portability** | JSON export of all AI data |
| **Right to Object** | Users can object to AI features, turn off completely |
| **Rights re Automated Decision-Making** | AI suggestions are advisory, not mandatory; human always in control |

### 4.2 Legal Basis for Processing

**Contractual Necessity:**
- Processing necessary to provide AI-powered learning features as part of Vromm service

**Legitimate Interest:**
- Pattern detection to improve user experience
- Performance analysis to personalize learning

**Consent:**
- Required for:
  - Sharing anonymous data with third parties
  - Allowing instructor access to AI insights
  - Proactive notifications

### 4.3 Data Retention Policies

| Data Type | Retention Period | Rationale |
|-----------|------------------|-----------|
| **AI Conversations** | 90 days (user configurable: 0, 30, 90) | Provide context continuity |
| **Learning Patterns** | 90 days (user configurable) | Enable long-term progress tracking |
| **AI Interventions** | 180 days | Measure effectiveness of suggestions |
| **Context Snapshots** | Not stored (ephemeral) | Only needed during active conversation |
| **Anonymous Analytics** | Indefinitely | Improve AI for all users |

**Automatic Purging:**
- Daily cron job deletes expired data based on user's retention settings
- Soft delete → 30-day grace period → Hard delete (unrecoverable)

### 4.4 Data Processing Agreements (DPAs)

**With AI Providers (Claude/OpenAI):**
- DPA in place confirming:
  - No training on user data
  - No retention of prompts/responses beyond API call
  - Data encrypted in transit
  - No human review of content without explicit consent
  - Compliance with GDPR

**With Hosting Providers (Supabase/Vercel):**
- Data processing addendum confirming GDPR compliance
- Data stored in EU region (for EU users)
- Encryption at rest and in transit

---

## 5. Security Measures

### 5.1 Data Encryption

**In Transit:**
- TLS 1.3 for all API calls
- HTTPS enforced for all web traffic
- Certificate pinning for mobile apps

**At Rest:**
- Database-level encryption (Supabase encryption)
- Encrypted backups
- Encrypted environment variables

**In Memory:**
- AI context data cleared after use
- No sensitive data logged
- Secure memory handling for context objects

### 5.2 Access Controls

**Database-Level:**
- Row-level security (RLS) on all AI tables
- Users can only access their own AI data
- Service role access audited and logged

**API-Level:**
- Authentication required for all AI endpoints
- Rate limiting to prevent abuse
- User-scoped tokens (can't access other users' data)

**Admin Access:**
- Admin can view AI effectiveness metrics (aggregated)
- Admin cannot view individual user conversations without explicit permission
- All admin access logged

### 5.3 Audit Logging

```sql
-- Every AI interaction is logged
CREATE TABLE ai_audit_log (
  id UUID PRIMARY KEY,
  user_id UUID,
  event_type TEXT, -- 'context_built', 'ai_query', 'response_delivered'
  data_accessed JSONB, -- Which tables/fields were queried
  pii_detected BOOLEAN,
  pii_sanitized BOOLEAN,
  created_at TIMESTAMPTZ
);
```

**Logged Events:**
- AI context built (what data accessed)
- AI query sent to provider
- Response received and delivered
- PII detection and sanitization
- User privacy settings changed
- Data export requests
- Data deletion requests

**Retention**: Audit logs kept for 1 year, then archived

---

## 6. PII Detection & Sanitization

### 6.1 Automatic PII Removal

Before sending any user-generated content to external AI:

```typescript
function sanitizeForAI(userMessage: string): string {
  let sanitized = userMessage;
  
  // Remove email addresses
  sanitized = sanitized.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    '[EMAIL_REMOVED]'
  );
  
  // Remove phone numbers (Swedish format)
  sanitized = sanitized.replace(
    /(\+46|0)[\s-]?\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g,
    '[PHONE_REMOVED]'
  );
  
  // Remove personal numbers (personnummer)
  sanitized = sanitized.replace(
    /\d{6}[-\s]?\d{4}/g,
    '[ID_REMOVED]'
  );
  
  // Remove credit card numbers
  sanitized = sanitized.replace(
    /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/g,
    '[CARD_REMOVED]'
  );
  
  return sanitized;
}
```

**If PII is detected:**
1. Log the detection in audit log
2. Sanitize the content
3. Notify user: "We removed personal information for your privacy"
4. Flag for admin review if needed

### 6.2 Context Anonymization

User IDs and identifiers are hashed before sending to AI:

```typescript
function hashUserId(userId: string): string {
  // One-way hash - cannot reverse to get real user ID
  return crypto
    .createHash('sha256')
    .update(userId + process.env.SALT)
    .digest('hex')
    .substring(0, 8); // Use first 8 chars as session ID
}
```

**Result**: AI sees "user a3f2b1c9" instead of actual UUID

---

## 7. Transparency & User Communication

### 7.1 First-Run Consent

When user first encounters AI features:

**Modal/Screen Content:**
```
🤖 Meet Your AI Driving Assistant

I'm here to help you learn faster by:
• Answering questions about exercises
• Suggesting what to practice next
• Tracking your progress patterns

What I know about you:
✓ Your exercise progress and scores
✓ When and how you practice
✓ Your goals (if you share them)

What I don't know:
✗ Your personal info (name, email, phone)
✗ Your location or GPS data
✗ Other users' data

Your privacy:
• Your data is encrypted and secure
• You can turn off AI anytime
• Delete all AI history with one click

[Learn More] [Privacy Settings] [Let's Go!]
```

**Consent Required Before:**
- Enabling AI features
- Sending data to external AI providers
- Storing conversation history

### 7.2 In-App Privacy Indicators

**Visible Indicators:**
- 🔒 Lock icon on "Ask AI" button = encrypted conversation
- Privacy badge in AI chat: "Your data is private and secure"
- Footer in AI responses: "Learn what data I use"

**AI Response Transparency:**
Every AI response includes metadata user can expand:
```
[Your response from AI]

ℹ️ How I came up with this:
• Analyzed your 3 attempts on this exercise
• Noticed you improved by 20% last week
• Compared to typical learning patterns
• Referenced Swedish traffic law §3.61

[View Full Context] [Privacy Info]
```

### 7.3 Privacy Policy

**AI-Specific Section in Privacy Policy:**

```markdown
## AI Learning Assistant

### What data we collect
When you use AI features, we collect:
- Your questions and AI's responses
- Your exercise progress (completions, scores, timing)
- Detected learning patterns (strengths, weaknesses)
- Your feedback on AI responses

### How we use it
- To answer your questions accurately
- To personalize learning recommendations
- To improve AI effectiveness for all users (anonymized)
- To detect if you need extra help

### Who we share it with
- AI provider (Claude/OpenAI) receives anonymized context only
- No PII is shared with third parties
- Your instructor does NOT see AI conversations unless you enable sharing

### Your rights
- Turn off AI completely
- Delete all AI history
- Export your AI data
- Control retention periods
- Object to automated suggestions

[Full Privacy Policy] [Contact DPO]
```

---

## 8. Instructor Privacy

### 8.1 What Instructors Can See (Default)

By default, instructors see:
- Student's overall progress (existing feature)
- Exercise completion rates
- Quiz scores
- Learning path progress

Instructors **cannot** see:
- AI conversation content
- AI-detected patterns
- AI intervention suggestions
- Questions student asked AI

### 8.2 Opt-In Sharing

Students can choose to share AI insights with instructor:

**Setting**: "Allow instructor to see AI insights"

**When enabled, instructor can see:**
- Summary of AI conversations (not full text)
- Detected learning patterns
  - "Student struggles with roundabout signaling timing"
  - "Student avoids highway exercises"
- AI-suggested interventions
  - "AI recommended switching to basic signaling exercise"

**Instructor view is anonymized from student names:**
- "Student A struggles with..." (if class has multiple students)
- Full name only shown if 1:1 instructor-student relationship

**Use case**: Helps instructor tailor in-person lessons based on AI insights

### 8.3 Instructor DPA

Instructors who see student data sign DPA confirming:
- Data used only for teaching purposes
- No sharing with third parties
- Deletion upon student request
- GDPR compliance

---

## 9. Children's Privacy (COPPA/GDPR-K)

**Age Restriction**: Vromm requires users to be 16+ (or legal driving age in jurisdiction)

**If user is 16-18 (minor in some jurisdictions):**
- Parental consent may be required (jurisdiction-dependent)
- Enhanced privacy protections:
  - AI features opt-in (not default)
  - Shorter retention periods (30 days max)
  - No performance comparisons ("top 15%" disabled)
  - No proactive notifications

**Data minimization for minors:**
- Only essential learning data collected
- No behavioral profiling beyond learning patterns
- Extra scrutiny on AI responses for appropriateness

---

## 10. Ethics & Bias Prevention

### 10.1 Bias Auditing

**Regular audits to detect:**
- Gender bias in recommendations
- Language preference bias (English vs Swedish speakers)
- Age-related bias
- Socioeconomic bias (e.g., assuming access to resources)

**Audit Process:**
- Quarterly review of AI effectiveness by demographic groups
- A/B testing to ensure equal performance
- User feedback analysis for bias indicators
- External ethics board review (annually)

### 10.2 Fairness Guidelines

AI must:
- Provide equal quality assistance regardless of user demographics
- Not favor fast learners over slow learners
- Not penalize users for taking breaks
- Not make assumptions about user's resources (e.g., car access, instructor)

**Red Flags:**
- If AI performs 20%+ worse for any demographic group → investigation
- If certain groups opt out of AI at higher rates → UX review
- If AI suggestions correlate with protected characteristics → immediate audit

### 10.3 Harmful Content Prevention

AI responses are screened for:
- Discriminatory language
- Dangerous driving advice
- Overly critical or discouraging tone
- Promotion of unsafe practices

**Safety Filters:**
- All AI responses pass through content filter before delivery
- Flagged responses sent to human review queue
- User can report inappropriate AI responses
- Regular review of flagged content

---

## 11. Incident Response

### 11.1 Data Breach Protocol

**If user data is compromised:**

1. **Immediate Actions** (within 1 hour):
   - Contain breach (disable affected systems)
   - Assess scope (how many users, what data)
   - Notify security team

2. **Short-term** (within 24 hours):
   - Notify affected users via email
   - Provide guidance (e.g., "change password")
   - Offer credit monitoring if PII exposed
   - Notify Data Protection Authority (if GDPR applies)

3. **Long-term** (within 72 hours):
   - Full incident report
   - Remediation plan
   - Public transparency report
   - Offer to delete all AI data for affected users

### 11.2 AI Misbehavior Protocol

**If AI provides harmful advice:**

1. **Immediate**: Disable AI feature temporarily
2. **Investigation**: Review what went wrong
3. **Notification**: Contact affected users
4. **Remediation**: Update prompts/filters
5. **Re-enable**: Only after thorough testing

**Examples of harmful advice:**
- "It's okay to roll through stop signs sometimes"
- Discriminatory language
- Encouragement of unsafe practices

---

## 12. Third-Party AI Provider Compliance

### 12.1 Selection Criteria

AI providers (Claude, OpenAI, etc.) must:
- ✅ GDPR compliant
- ✅ No training on user data
- ✅ Data residency in EU (for EU users)
- ✅ Encryption in transit and at rest
- ✅ No data retention beyond API call
- ✅ DPA in place
- ✅ Regular security audits
- ✅ Incident notification SLA

### 12.2 Monitoring

**Monthly review:**
- Any provider policy changes?
- Any security incidents?
- Compliance with DPA?
- User complaints about AI?

**Annual audit:**
- Full privacy review
- Security assessment
- Bias testing
- Cost-benefit analysis (privacy vs features)

### 12.3 Provider Switching

**If provider violates privacy:**
- Immediate switch to backup provider
- Notify users of change
- Re-consent if data handling differs

**Migration plan:**
- Always have 2+ AI providers configured
- Ability to switch within 24 hours
- No user data lost in transition

---

## 13. Ongoing Privacy Improvements

### 13.1 Future Enhancements

**Planned Features:**
- **Differential Privacy**: Add noise to aggregate statistics
- **On-Device AI**: Local model for basic help (no data sent to cloud)
- **Federated Learning**: Improve AI without centralizing user data
- **Zero-Knowledge Proofs**: Prove proficiency without revealing data

### 13.2 Privacy-First Development

**Development Guidelines:**
1. Every new AI feature must include Privacy Impact Assessment (PIA)
2. Default to most privacy-preserving option
3. User control over all data collection
4. Transparency before collection
5. Minimize data retention
6. Encrypt everything
7. Audit everything
8. Make privacy easy, not buried in settings

---

## 14. User Trust Metrics

### 14.1 Trust Indicators

Track user sentiment about privacy:
- % of users who enable AI features
- % who disable AI after trying
- % who use "Clear AI History"
- Privacy-related support tickets
- User feedback mentions of privacy concerns
- Trust score in user surveys

**Target Metrics:**
- 80%+ users enable AI
- <5% disable due to privacy concerns
- <2% clear AI history monthly
- 4.5+/5.0 trust score

### 14.2 Transparency Reports

**Quarterly public report:**
- Number of data access requests
- Number of data deletion requests
- Number of privacy incidents (if any)
- Changes to privacy policy
- New privacy features added

**Example:**
```markdown
Q1 2026 AI Privacy Report

Users with AI enabled: 12,543 (87% of active users)
Data export requests: 34
Data deletion requests: 12
Privacy incidents: 0
New features: "On-device basic help" (beta)

Average conversation retention: 67 days (user choice)
PII detections: 89 instances, all sanitized automatically
```

---

## 15. Summary: Privacy Checklist

**Before Launch:**
- [ ] Privacy Impact Assessment completed
- [ ] DPA signed with AI providers
- [ ] First-run consent flow tested
- [ ] PII detection and sanitization working
- [ ] Data encryption verified (in transit & at rest)
- [ ] RLS policies tested
- [ ] Audit logging implemented
- [ ] GDPR rights (access, deletion, export) functional
- [ ] Privacy policy updated
- [ ] Legal review completed
- [ ] Security audit passed
- [ ] Bias testing completed
- [ ] User testing with privacy-conscious users
- [ ] Incident response plan documented
- [ ] Privacy settings UI intuitive and clear

**Ongoing:**
- [ ] Quarterly privacy audits
- [ ] Monthly provider compliance review
- [ ] Continuous monitoring of PII detection
- [ ] User trust metrics tracked
- [ ] Regular bias testing
- [ ] Annual external privacy audit
- [ ] Transparency reports published
- [ ] Privacy policy updates as needed

---

**Document Owner**: Legal & Privacy Team  
**Review Frequency**: Quarterly  
**Last Updated**: 2026-02-14  
**Next Review**: 2026-05-14
