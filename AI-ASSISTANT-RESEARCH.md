# AI Assistant Research for Vromm Driving School Platform

**Research Date:** February 14, 2026  
**Author:** AI Research Agent  
**Branch:** feature/ai-driving-assistant  
**Status:** Research Only - No Implementation

---

## Executive Summary

This document provides comprehensive research on building an AI assistant for Vromm's driving school platform. The research covers competitor analysis, technical approaches, cost estimates, and use case recommendations for students, instructors, and schools.

**Key Findings:**
- AI-powered driving school assistants are emerging but still nascent (2025-2026 trend)
- **Recommended Model:** Claude Sonnet 4 for Swedish language support and safety
- **Estimated Cost:** $0.02-0.05 per conversation (10-15 exchanges)
- **Core Architecture:** RAG + Conversation Memory + Multi-role Context
- **Primary Use Cases:** Theory test preparation, rule explanations, personalized learning paths

---

## 1. Market Analysis & Competitor Research

### 1.1 Existing AI-Powered Driving School Apps

#### **Driving Theory 4 in 1 Kit** (UK, 2025)
- **AI Features:**
  - **Smart AI**: Tracks incorrect answers, reintroduces failed questions until mastery
  - **AI Question Variations**: Rewording DVSA-approved questions for deeper understanding
  - All variations marked as "AI generated" for transparency
  
- **Technical Approach:**
  - Adaptive learning based on user performance
  - Question variation generation (similar to Vromm's need for Swedish theory)
  - Focus on comprehension vs. memorization

- **Key Insight:** Users value AI that prevents memorization and forces true understanding

---

#### **Crowdy.ai for Driving Schools** (2025-2026)
- **AI Features:**
  - 24/7 automated enrollment and scheduling
  - Multilingual support for international students
  - Personalized theory/practical exam guidance
  - Automated reminders (classes, exams, deadlines)
  - Marketing automation (promotions, discounts)

- **Business Model:**
  - Focus on operational automation (reduces admin workload)
  - CRM integration for lead management
  - Data-driven insights for schools

- **Key Insight:** Speed of response is critical - students often contact multiple schools, and fastest reply wins enrollment

---

#### **WeGen-AI for Driving Schools**
- **AI Capabilities:**
  - WhatsApp/Instagram/Email/SMS integration
  - Pricing, class availability, document requirements
  - Online registration links
  - Payment reminders, exam date notifications

- **Value Proposition:**
  - "Stop losing students to slow replies"
  - Instant responses 24/7
  - Multi-platform presence

- **Key Insight:** Students prioritize response speed over price

---

#### **Driving Test Now - AI Chatbot** (App Store, 2025)
- **Features:**
  - ChatGPT-powered assistant for theory test prep
  - Personalized AI guidance and topic suggestions
  - Conversational Q&A format

- **User Experience:**
  - Natural language questions about driving rules
  - Tailored study recommendations

---

### 1.2 Broader Chatbot Platforms for Education

- **Chatfuel, Botpress, Landbot:** No-code chatbot builders with NLP
- **AI Course Builders:** Generate quizzes, explanations from curriculum data
- **Custom Knowledge Base Chatbots:** Upload driving rules → AI answers questions

---

## 2. AI Capabilities for Driving Training

### 2.1 Theory Test Preparation

**Core Capabilities:**
1. **Question & Answer**
   - Natural language questions: "What does this road sign mean?"
   - Explain correct/incorrect answers with reasoning
   - Multi-turn conversations (follow-up questions)

2. **Adaptive Learning**
   - Track student weaknesses (e.g., right-of-way rules, speed limits)
   - Generate personalized practice questions
   - Spaced repetition for difficult topics

3. **Rule Explanations**
   - Explain Swedish traffic rules in plain language
   - Context-aware: "Why is this rule important in winter driving?"
   - Visual aids: Describe scenarios with road signs, intersections

4. **Progress Tracking**
   - Session summaries: "Today you improved on parking rules"
   - Weak areas identification
   - Readiness assessment for theory test

---

### 2.2 Practical Driving Support

**Capabilities:**
1. **Route Planning & Advice**
   - Suggest practice routes based on skill level
   - Explain route challenges: "This route has a roundabout and merging lane"
   - Pre-drive briefings for students

2. **Scenario-Based Learning**
   - "What would you do if...?" hypothetical scenarios
   - Voice-based Q&A (hands-free during driving)
   - Post-lesson review: "During today's lesson, you struggled with X"

3. **Instructor Assistance**
   - Pre-lesson student context: "Student has trouble with parallel parking"
   - Suggested focus areas based on progress data
   - Lesson plan generation

---

### 2.3 Personalized Feedback & Memory

**Requirements:**
1. **Conversation Memory**
   - Short-term: Current session context (last 10-15 exchanges)
   - Long-term: Student preferences, weak areas, goals
   - Multi-session continuity: "Last week you asked about highway merging..."

2. **User Profiles**
   - Student: Learning path, test readiness, preferences (visual vs. text)
   - Instructor: Teaching style, student roster
   - School: Curriculum, local regulations, vehicle types

3. **Contextual Personalization**
   - Adapt tone: Encouraging for struggling students, concise for advanced
   - Language level: Simplified Swedish for non-native speakers
   - Time-aware: "Your theory test is in 3 days - focus on weak areas"

---

## 3. Technical Approaches & Recommendations

### 3.1 LLM Comparison

| Model | Input Cost ($/1M tokens) | Output Cost ($/1M tokens) | Best For | Swedish Support |
|-------|-------------------------|---------------------------|----------|----------------|
| **Grok 4.1 Fast** | $0.20 | $0.50 | Ultra-low cost, high volume | Limited |
| **Gemini 2.5 Pro** | $1.25 | $10.00 | Balanced cost/performance | Good |
| **GPT-4o** | $5.00 | $15.00 | General purpose, reliable | Excellent |
| **Claude Sonnet 4** | $3.00 | $15.00 | Safety, nuance, education | **Excellent** ✅ |
| **Claude Opus 4** | $15.00 | $75.00 | Maximum capability (overkill) | Excellent |

**Recommendation: Claude Sonnet 4**
- **Strengths:**
  - Excellent Swedish language understanding
  - Safety-conscious (critical for driving education)
  - Nuanced explanations (better for educational content)
  - 200K token context window (handles long conversations + knowledge base)
  - Competitive pricing vs. GPT-4o ($3 input vs. $5)

- **Alternative:** Gemini 2.5 Pro for cost optimization ($1.25 input)

---

### 3.2 RAG (Retrieval-Augmented Generation) for Swedish Driving Rules

**Why RAG?**
- Swedish traffic rules are authoritative and must be accurate
- Reduce hallucination by grounding answers in official documents
- Update knowledge base without retraining models

**Architecture:**
```
User Question
    ↓
Embedding Model (text-embedding-ada-002 or similar)
    ↓
Vector Search (Pinecone, Milvus, Chroma)
    ↓
Retrieve Relevant Rules/Sections
    ↓
LLM Prompt: [Retrieved Context] + [User Question]
    ↓
AI Answer (grounded in official rules)
```

**Data Sources:**
- **Trafikverket** (Swedish Transport Agency): Official rules, signs, regulations
- **Körkortsportalen** (Driving License Portal): Theory test questions, explanations
- Internal Vromm curriculum: School-specific guidelines

**Implementation:**
1. **Document Ingestion:**
   - Parse PDFs from Trafikverket (road signs, traffic rules)
   - Chunk documents into semantic sections (300-500 tokens each)
   - Generate embeddings using OpenAI `text-embedding-ada-002` ($0.10 per 1M tokens)

2. **Vector Database:**
   - **Pinecone** (managed, scalable, $70/month starter)
   - **Chroma** (open-source, self-hosted, free)
   - **Milvus** (production-grade, self-hosted or cloud)

3. **Retrieval Strategy:**
   - Top-k retrieval (k=3-5 most relevant chunks)
   - Threshold filtering (similarity score > 0.7)
   - Metadata filtering (e.g., only retrieve "parking rules" if question is about parking)

4. **Prompt Engineering:**
   ```
   You are a Swedish driving instructor assistant. Answer based on official rules.
   
   Context from Swedish Traffic Regulations:
   {retrieved_chunks}
   
   Student Question: {user_question}
   
   Provide a clear, accurate answer. If uncertain, say so.
   ```

**Cost Estimate (RAG):**
- Embeddings: $0.10 per 1M tokens (one-time for knowledge base)
- Vector DB: $70/month (Pinecone) or $0 (self-hosted Chroma)
- Retrieval latency: 50-200ms

---

### 3.3 Conversation Memory Management

**Memory Layers (Hybrid Architecture):**

1. **Working Memory (Context Window)**
   - Current conversation (last 10-15 exchanges)
   - System instructions + retrieved knowledge
   - Fast, in-prompt, limited by model context window

2. **Session Memory (Redis/In-Memory)**
   - Recent conversation history within current session
   - Quick retrieval without database queries
   - Expires after session ends (hours/days)

3. **Episodic Memory (Vector Database)**
   - Long-term conversation history across sessions
   - Semantic search: "Remember when we discussed roundabouts?"
   - User-specific knowledge graph

4. **Semantic Memory (Structured Database - PostgreSQL)**
   - Extracted facts: Student preferences, weak areas, goals
   - Structured data: `{ "student_id": 123, "weak_areas": ["parking", "highway_merging"], "test_date": "2026-03-15" }`
   - Fast lookups, precise filtering

**Implementation:**
- **LangChain** (Python framework for LLM + memory + RAG)
- **Vector Store:** Milvus or Pinecone for episodic memory
- **Relational DB:** PostgreSQL for user profiles, progress tracking
- **Caching:** Redis for session-level context

**Cost Optimization:**
- **Lazy Loading:** Only load deep memory when conversation requires it
- **Summarization:** Compress old conversations (GPT-3.5-turbo for summaries, $0.003/1k tokens)
- **Cache Embeddings:** Don't regenerate for identical text (80% cost reduction)

**Example Memory Retrieval:**
```python
# User asks: "What did we cover last week?"
# 1. Query episodic memory (vector DB) for past week's conversations
# 2. Retrieve top 3 relevant exchanges
# 3. Summarize: "Last week you practiced highway merging and asked about speed limits"
# 4. Add to current prompt context
```

---

### 3.4 Real-Time vs. Async Chat

**Real-Time (WebSocket/Streaming):**
- **Use Cases:** Live theory study sessions, interactive Q&A
- **Pros:** Instant responses, natural conversation flow
- **Cons:** Higher server costs (persistent connections)
- **Tech:** WebSocket (Socket.io) + streaming LLM responses

**Async (REST API):**
- **Use Cases:** Progress reports, lesson summaries, batch question answering
- **Pros:** Lower server overhead, easier scaling
- **Cons:** Less interactive
- **Tech:** Standard REST API with polling

**Recommendation:**
- **Real-time** for student chat interface (primary use case)
- **Async** for instructor reports, analytics, batch processing

---

### 3.5 Voice Assistant for Driving

**Hands-Free Interaction:**
- **Use Case:** Students ask questions while driving (practice mode)
- **Tech Stack:**
  - **Speech-to-Text:** Whisper API (OpenAI, $0.006/minute) or KB-Whisper (Swedish, self-hosted)
  - **Text-to-Speech:** ElevenLabs (high quality, $5-30/month) or OpenAI TTS ($15/1M chars)
  - **LLM:** Claude Sonnet 4 (text processing)

**Flow:**
```
Student (voice): "What should I do at this roundabout?"
    ↓
Speech-to-Text (Whisper)
    ↓
LLM (Claude Sonnet 4 + RAG)
    ↓
Text-to-Speech (ElevenLabs/OpenAI)
    ↓
Audio Response: "At a roundabout, always yield to traffic from the left..."
```

**Cost Estimate (Voice):**
- STT: $0.006/minute (Whisper) → ~$0.01 per question
- TTS: $0.015 per response (OpenAI TTS, ~1000 chars)
- **Total:** ~$0.025 per voice interaction

**Challenges:**
- Noisy car environment (Whisper is robust but not perfect)
- Low latency required (aim for <2s response time)
- Safety: Minimize driver distraction (short, clear answers)

---

## 4. Cost Analysis

### 4.1 Per-Conversation Cost Breakdown

**Assumptions:**
- 10-15 message exchanges per conversation
- Average message: 50 tokens input, 200 tokens output
- RAG retrieval: 3 chunks × 500 tokens = 1500 tokens added to context

**Model: Claude Sonnet 4 ($3 input, $15 output per 1M tokens)**

| Component | Tokens | Cost |
|-----------|--------|------|
| User messages (15 × 50) | 750 | $0.0023 |
| AI responses (15 × 200) | 3,000 | $0.045 |
| RAG context (15 × 1,500) | 22,500 | $0.0675 |
| **Total per conversation** | **26,250** | **~$0.115** |

**Optimized (with summarization/caching):**
- Compress RAG context to 500 tokens per retrieval
- Cache common questions
- **Optimized cost:** ~$0.02-0.05 per conversation

---

### 4.2 Monthly Cost Estimates (Vromm Scale)

**Scenario 1: Small Pilot (100 active students)**
- 5 conversations/student/week × 4 weeks = 2,000 conversations/month
- **Cost:** 2,000 × $0.05 = **$100/month** (LLM + RAG)
- **Infrastructure:** $70 Pinecone + $20 server = **$90/month**
- **Total:** **~$190/month**

**Scenario 2: Medium Scale (1,000 active students)**
- 5 conversations/student/week × 4 weeks = 20,000 conversations/month
- **Cost:** 20,000 × $0.05 = **$1,000/month** (LLM + RAG)
- **Infrastructure:** $280 Pinecone (scale tier) + $100 server = **$380/month**
- **Total:** **~$1,380/month** (~$1.38 per student/month)

**Scenario 3: Large Scale (10,000 active students)**
- 200,000 conversations/month
- **Cost:** 200,000 × $0.05 = **$10,000/month** (LLM + RAG)
- **Infrastructure:** $500 Pinecone (enterprise) + $300 server = **$800/month**
- **Total:** **~$10,800/month** (~$1.08 per student/month)

**Revenue Perspective:**
- If Vromm charges students ~500 SEK (~$50) for course, $1-2/month for AI assistant is <4% of revenue
- Schools may pay premium for instructor tools (analytics, lesson planning)

---

### 4.3 Cost Comparison by Model

| Model | 10K conversations/month | 100K conversations/month | 1M conversations/month |
|-------|------------------------|--------------------------|------------------------|
| **Grok 4.1** | $50 | $500 | $5,000 |
| **Gemini 2.5 Pro** | $150 | $1,500 | $15,000 |
| **GPT-4o** | $300 | $3,000 | $30,000 |
| **Claude Sonnet 4** | $500 | $5,000 | $50,000 |
| **Claude Opus 4** | $1,500 | $15,000 | $150,000 |

*Note: Estimates assume optimized usage (caching, summarization, 0.05/conversation baseline)*

**Key Insight:** At Vromm's expected scale (1,000-10,000 students), cost is manageable (<$1.50/student/month)

---

## 5. Use Cases by User Role

### 5.1 Students

#### **Theory Test Preparation**
- **Q&A Chat:**
  - "What does this road sign mean?" → Image upload + AI explanation
  - "Explain right-of-way rules at intersections" → RAG retrieves Swedish rules + plain explanation
  - "Quiz me on parking rules" → Generate adaptive practice questions

- **Progress Tracking:**
  - Daily summaries: "Today you improved on speed limits (+15%)"
  - Weak area identification: "You struggle with roundabout rules - here's a practice plan"
  - Test readiness: "Based on your progress, you're 75% ready for the theory test"

- **Personalized Study Plans:**
  - "I have 2 weeks until my test - what should I focus on?"
  - AI generates daily study schedule based on weak areas

#### **Route Practice Suggestions**
- **Pre-Drive Briefing:**
  - "Your next lesson includes highway merging - here's what to expect"
  - Visual route map with challenge annotations

- **Post-Drive Review:**
  - "How did I do today?" → AI summarizes instructor notes + areas to improve

#### **Voice Assistant (In-Car)**
- **Hands-Free Q&A:**
  - "What's the speed limit in residential areas?" (voice)
  - "Remind me about stopping at pedestrian crossings" (voice)
  - Safety-focused: Short, clear answers to avoid distraction

---

### 5.2 Instructors

#### **Student Insights**
- **Pre-Lesson Context:**
  - "Student Johan has trouble with parallel parking - focus today's lesson here"
  - AI analyzes past lesson notes + chat history

- **Progress Reports:**
  - Auto-generated summaries: "Johan improved braking smoothness (+20%)"
  - Trend analysis: "This student learns faster with visual aids"

#### **Lesson Planning**
- **AI-Generated Lesson Plans:**
  - "Create a 1-hour lesson for highway driving (beginner level)"
  - Customized to student skill level + school curriculum

- **Scenario Suggestions:**
  - "Suggest practice scenarios for students weak in roundabouts"
  - AI retrieves common mistakes + targeted exercises

#### **Communication Automation**
- **Student Reminders:**
  - Auto-send: "Your next lesson is tomorrow at 10 AM - review parking rules"
  - Personalized: "Hi Johan, focus on parallel parking tonight"

---

### 5.3 Schools

#### **Analytics & Reporting**
- **Aggregate Student Performance:**
  - "What topics do students struggle with most?" → Heatmap of weak areas
  - "How effective is our theory curriculum?" → Pass rate analysis

- **Instructor Effectiveness:**
  - "Which instructors have highest student satisfaction?"
  - Sentiment analysis from student chat feedback

#### **Curriculum Help**
- **Content Gap Analysis:**
  - "Students frequently ask about X but our materials don't cover it"
  - AI suggests curriculum updates

- **Automated Study Materials:**
  - Generate practice quizzes from Trafikverket updates
  - Create explainer videos (scripts) for new traffic rules

#### **Marketing & Enrollment**
- **24/7 Enrollment Assistant:**
  - "Hi! I'm interested in driving lessons" → AI handles FAQs, pricing, scheduling
  - Integration with Vromm's booking system

- **Lead Qualification:**
  - AI identifies serious prospects: "User asked detailed questions → high intent"
  - CRM integration for follow-up

---

## 6. Implementation Roadmap (High-Level)

### Phase 1: MVP - Theory Test Assistant (3-4 months)
**Features:**
- Text-based chat (web + mobile)
- RAG for Swedish traffic rules (Trafikverket data)
- Short-term memory (session-based)
- Basic progress tracking (weak areas, quiz scores)

**Tech Stack:**
- LLM: Claude Sonnet 4
- RAG: Chroma (self-hosted) or Pinecone (managed)
- Backend: Node.js/Python (FastAPI)
- Frontend: React Native (existing Vromm app)

**Goal:** Validate student engagement + cost model

---

### Phase 2: Personalization & Memory (2-3 months)
**Features:**
- Long-term memory (user profiles, cross-session context)
- Adaptive learning (personalized study plans)
- Image recognition (upload road signs for explanation)

**Tech Stack:**
- Add PostgreSQL for user profiles
- Milvus for episodic memory
- LangChain for memory management

**Goal:** Increase retention via personalized experience

---

### Phase 3: Instructor Tools (2-3 months)
**Features:**
- Student insights dashboard
- AI-generated lesson plans
- Automated progress reports

**Tech Stack:**
- Integrate with Vromm's existing instructor portal
- Analytics backend (BigQuery or PostgreSQL + Metabase)

**Goal:** Expand value proposition to schools/instructors

---

### Phase 4: Voice Assistant (2-3 months)
**Features:**
- Hands-free Q&A for in-car practice
- Speech-to-text (Swedish)
- Text-to-speech (natural voice)

**Tech Stack:**
- Whisper API or KB-Whisper (Swedish STT)
- ElevenLabs or OpenAI TTS
- Low-latency streaming

**Goal:** Differentiate with unique in-car learning feature

---

## 7. Risks & Challenges

### 7.1 Accuracy & Safety
- **Risk:** AI provides incorrect traffic rules → student fails test or drives unsafely
- **Mitigation:**
  - RAG with official Trafikverket sources (minimize hallucination)
  - Disclaimer: "This is educational assistance - always verify critical info"
  - Human review of high-stakes answers (e.g., "Can I turn right on red?")

### 7.2 Data Privacy
- **Risk:** Storing sensitive student data (conversations, progress) → GDPR compliance
- **Mitigation:**
  - Anonymize data where possible
  - Explicit user consent for data storage
  - Retention policies (auto-delete after X months)
  - Encrypted storage (PostgreSQL + at-rest encryption)

### 7.3 Cost Overruns
- **Risk:** Viral adoption → 10x higher usage than expected → budget blown
- **Mitigation:**
  - Rate limiting (e.g., 10 conversations/day per free user)
  - Tiered pricing (premium users get unlimited)
  - Cost alerts (auto-scale down if spending exceeds threshold)

### 7.4 Model Dependency
- **Risk:** Claude API downtime or pricing changes
- **Mitigation:**
  - Multi-provider fallback (e.g., Claude → Gemini → GPT-4)
  - Cache common answers (reduce API calls)
  - Self-hosted LLM option (Llama 3 for non-critical queries)

### 7.5 User Adoption
- **Risk:** Students don't use AI assistant (prefer human instructors)
- **Mitigation:**
  - Onboarding flow: "Ask me anything about your theory test!"
  - In-app prompts: "Struggling with parking? Ask the AI assistant"
  - Social proof: "1,000 students passed their test with AI help"

---

## 8. Recommendations

### 8.1 Start Small
- **MVP Focus:** Theory test Q&A only (highest student pain point)
- **User Base:** Pilot with 100-200 students (measure engagement before scaling)
- **Feedback Loop:** Weekly surveys to refine AI responses

### 8.2 Prioritize Swedish Language Quality
- **Model Choice:** Claude Sonnet 4 > GPT-4o > Gemini (Swedish nuance matters)
- **Data Source:** Trafikverket official docs (trust is critical)
- **Human Review:** Native Swedish speaker reviews AI answers weekly

### 8.3 Balance Cost vs. Features
- **Phase 1:** Claude Sonnet 4 (quality over cost)
- **Phase 2+:** Optimize with Gemini for low-stakes queries (e.g., "What's your favorite driving tip?")
- **Caching:** Aggressive caching of common questions (80% hit rate possible)

### 8.4 Measure ROI
- **Student Metrics:**
  - Theory test pass rate (AI users vs. non-users)
  - Engagement (conversations/week, session duration)
  - Retention (return rate after first use)
  
- **School Metrics:**
  - Instructor time saved (hours/week)
  - Enrollment conversion (AI chatbot vs. manual)
  - Revenue per student (premium AI features)

### 8.5 Compliance First
- **GDPR:** Privacy policy, data retention, right to deletion
- **Accuracy:** Disclaimers on AI-generated content
- **Accessibility:** Voice + text interfaces, multilingual support (English, Arabic, etc.)

---

## 9. Competitive Advantages

### What Makes Vromm's AI Unique?

1. **Swedish-First:**
   - Deep integration with Trafikverket data
   - Optimized for Swedish driving rules, signs, culture
   - Competitors are mostly UK/US-focused

2. **Multi-Role Platform:**
   - Students, instructors, schools all benefit
   - Competitors focus on students only
   - Network effects: Better data → better AI for all users

3. **In-Car Voice Assistant:**
   - Unique feature (no competitor offers this yet)
   - Hands-free learning during practice drives
   - Safety-focused design (short answers, no distraction)

4. **Full Platform Integration:**
   - Seamless with Vromm's existing booking, scheduling, payments
   - AI knows student's upcoming lessons, instructor preferences
   - Competitors are standalone chatbots

---

## 10. Next Steps

1. **Validate Research:**
   - Share this document with Vromm team
   - Prioritize use cases (student Q&A vs. instructor tools)
   - Align on budget ($200-2,000/month initial)

2. **Data Acquisition:**
   - Download Trafikverket PDFs (traffic rules, signs)
   - Structure curriculum into RAG-friendly chunks
   - Identify gaps in official materials (Vromm-specific content)

3. **Technical Proof-of-Concept:**
   - Build simple RAG prototype (Chroma + Claude Sonnet 4)
   - Test 10-20 common student questions
   - Measure accuracy, latency, cost per query

4. **User Research:**
   - Interview 10 students: "What questions do you wish you could ask?"
   - Survey instructors: "What student insights would help your lessons?"
   - Schools: "What enrollment friction can AI solve?"

5. **Go/No-Go Decision:**
   - Evaluate PoC results (accuracy >90%, cost <$0.10/query)
   - Define success metrics (50% of students use AI weekly)
   - Commit to Phase 1 MVP or iterate research

---

## 11. Conclusion

AI assistants for driving education are an emerging opportunity (2025-2026 trend). Vromm has a chance to lead in the Swedish market by building a **multi-role, RAG-powered, voice-enabled assistant** that serves students, instructors, and schools.

**Key Takeaways:**
- **Feasible:** Technology is mature (RAG, LLMs, voice)
- **Affordable:** $0.02-0.05 per conversation at scale
- **Differentiated:** Swedish-first, multi-role, in-car voice
- **Validated:** Competitors (Crowdy, Driving Theory 4-in-1) show demand

**Recommendation:** Proceed with MVP (Phase 1) focusing on theory test Q&A. Measure student engagement and pass rates. Scale to instructor tools and voice assistant if successful.

---

## Appendix A: Technical References

### LLM Providers
- **Anthropic Claude:** https://www.anthropic.com/
- **OpenAI GPT:** https://platform.openai.com/
- **Google Gemini:** https://ai.google.dev/

### RAG Frameworks
- **LangChain:** https://python.langchain.com/
- **LlamaIndex:** https://www.llamaindex.ai/

### Vector Databases
- **Pinecone:** https://www.pinecone.io/
- **Chroma:** https://www.trychroma.com/
- **Milvus:** https://milvus.io/

### Speech Processing
- **OpenAI Whisper:** https://openai.com/research/whisper
- **KB-Whisper (Swedish):** https://github.com/kb-labb/kb-whisper
- **ElevenLabs TTS:** https://elevenlabs.io/

### Swedish Data Sources
- **Trafikverket:** https://www.trafikverket.se/
- **Körkortsportalen:** https://www.korkortsportalen.se/

---

## Appendix B: Sample Prompts

### Student Q&A Prompt
```
You are a Swedish driving instructor assistant. Your role is to help students prepare for their theory test and understand Swedish traffic rules.

Context from Official Swedish Traffic Regulations:
{retrieved_rag_context}

Student Profile:
- Name: {student_name}
- Weak Areas: {weak_areas}
- Upcoming Test Date: {test_date}

Conversation History:
{conversation_memory}

Student Question: {user_question}

Instructions:
1. Provide accurate answers based on official Swedish rules
2. Use simple, clear Swedish language
3. If uncertain, say "I'm not 100% sure - please verify with your instructor"
4. Be encouraging and supportive
5. Suggest related topics to study

Answer:
```

### Instructor Insights Prompt
```
You are an AI assistant for driving instructors. Analyze student data and provide actionable insights.

Student: {student_name}
Last 5 Lessons:
{lesson_summaries}

Student Chat History (last 7 days):
{chat_summaries}

Task: Generate a pre-lesson briefing for the instructor. Include:
1. Key areas student is struggling with
2. Topics student asked about recently (from chat)
3. Suggested focus for today's lesson
4. Motivational note (student progress or achievements)

Format: Concise bullet points (max 200 words)

Briefing:
```

---

**End of Research Document**

*This is research only - no implementation has been started. Next step: Validate with Vromm team and prioritize use cases.*
