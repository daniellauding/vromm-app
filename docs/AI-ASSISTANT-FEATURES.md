# AI Assistant Features Specification
> **Vromm Driving Education Platform**  
> Version: 1.0  
> Date: 2026-02-14  
> Branch: `feature/ai-driving-assistant`

## 📋 Table of Contents
1. [Overview](#overview)
2. [Core Features](#core-features)
3. [User Roles & Capabilities](#user-roles--capabilities)
4. [AI Assistant Components](#ai-assistant-components)
5. [Context & Intelligence](#context--intelligence)
6. [Integration Points](#integration-points)
7. [Data Privacy & Security](#data-privacy--security)
8. [Technical Architecture](#technical-architecture)
9. [Future Enhancements](#future-enhancements)

---

## Overview

### Vision
The Vromm AI Assistant is an intelligent, context-aware companion that helps students learn driving faster, instructors teach more effectively, and schools optimize their curriculum. It provides personalized guidance, route discovery, and progress insights through natural conversational interactions.

### Key Principles
- **Context-Aware**: Knows where the user is in their learning journey
- **Role-Specific**: Adapts responses based on user role (student/instructor/school)
- **Conversational**: Natural language Q&A in Swedish and English
- **Proactive**: Suggests relevant content and routes without being intrusive
- **Privacy-First**: All conversations are private and deletable

### Success Metrics
- **Engagement**: 60%+ of users interact with AI within first week
- **Utility**: Average 3+ questions per active user per week
- **Retention**: Users who use AI have 25%+ higher retention
- **Learning**: 15% faster exercise completion for AI users

---

## Core Features

### 1. Context-Aware Chat
Intelligent conversations tied to the user's current context in the app.

#### 1.1 Exercise-Specific Help
**Trigger**: User is viewing a specific exercise  
**Context Available**:
- Current exercise details (title, description, difficulty)
- User's progress on this exercise (attempts, completions)
- Learning path the exercise belongs to
- User's past mistakes/struggles on similar exercises
- Related exercises in the learning path

**Example Interactions**:
```
Student in "Parallel Parking" exercise:
→ "Förklara denna övning" (button)
← "Parallellparkering handlar om att backa in bilen mellan två andra bilar. 
   Du behöver öva på 3 saker: spegelkontroll, ratthantering, och avstånds-
   bedömning. Eftersom du har övat backspeglar 5 gånger förut kommer det 
   här bli lättare! Vill du se ett videoexempel?"
```

**Capabilities**:
- Break down complex exercises into steps
- Explain Swedish traffic rules related to the exercise
- Suggest prerequisite exercises if user is struggling
- Recommend YouTube videos from exercise metadata
- Compare automatic vs manual transmission techniques
- Provide safety reminders specific to the exercise

#### 1.2 Learning Path Guidance
**Trigger**: User is viewing their learning path overview  
**Context Available**:
- Current learning path (title, vehicle type, experience level)
- Completed vs remaining exercises
- User's weak areas (low completion exercises)
- Estimated time to completion
- Recommended next exercise

**Example Interactions**:
```
Student viewing "B-körkort Manual" path (40% complete):
→ "Vad ska jag fokusera på härnäst?"
← "Bra jobbat med motorvägsövningarna! Nu rekommenderar jag att du 
   fokuserar på stadskörning. Du har 3 övningar kvar där:
   1. Rondellkörning (medel svårighet)
   2. Korsningar med trafikljus (lätt)
   3. Parkering i centrum (svår)
   
   Börja med trafikljus-korsningar eftersom du redan är bekväm med att 
   stanna och starta på släta vägar. Vill du hitta en rutt för det?"
```

**Capabilities**:
- Suggest optimal exercise order based on difficulty
- Identify knowledge gaps
- Estimate time to completion
- Compare progress with typical learners
- Celebrate milestones

#### 1.3 Route Context
**Trigger**: User is viewing a specific route  
**Context Available**:
- Route details (title, difficulty, tags, creator)
- Route exercises/objectives
- User's location (if permission granted)
- Distance from user to route start
- Weather conditions (future)
- User's completed routes

**Example Interactions**:
```
Student viewing "Lund City Center Practice":
→ "Är denna rutt bra för mig?"
← "Ja! Denna rutt passar dig perfekt eftersom:
   ✓ Du har slutfört grundläggande stadskörning
   ✓ Den har 4 rondeller (du behöver öva det mer)
   ✓ Svårighetsgrad: Medel (matchar din nivå)
   ✓ Endast 2.3 km från dig
   
   Tips: Kör denna på eftermiddag (kl 14-16) för måttlig trafik. 
   Undvik rusningstid de första gångerna!"
```

**Capabilities**:
- Match route difficulty to user skill level
- Suggest best time of day to drive the route
- Warn about challenging sections
- Compare similar routes nearby
- Estimate drive time
- Suggest what to practice on this route

#### 1.4 Daily Status Integration
**Trigger**: User is filling out daily driving status  
**Context Available**:
- Today's driving sessions (if any)
- Recent daily statuses
- User's mood/challenge patterns
- Current streak
- Weekly goal progress

**Example Interactions**:
```
Student logging "didn't drive today" for 3rd day:
← "Jag märker att du inte har kört på 3 dagar. Allt okej? 
   Ibland behöver man en paus! Men om du vill komma tillbaka:
   - Din favorit-rutt 'Dalby vägar' är fortfarande där 😊
   - Du är 2 övningar från att klara 'Landsväg' kapitlet
   - Vill du att jag hittar en kort 20-min rutt nära dig?"
```

**Capabilities**:
- Gentle encouragement without nagging
- Identify patterns (skipping weekends, weather-related)
- Suggest micro-goals to rebuild momentum
- Celebrate comeback drives

---

### 2. Free-Form Chat
General conversational Q&A about driving, theory, and the app.

#### 2.1 Theory Questions
**Context**: User's learning path, location (Sweden), vehicle type

**Example Interactions**:
```
→ "Vad är hastighetsgränsen på motorväg?"
← "På motorväg i Sverige är hastighetsgränsen normalt 110 km/h, 
   men kan vara 120 km/h på vissa sträckor. Viktigt att alltid 
   kolla skyltarna! 
   
   Tips: När du kör på motorväg, öva 'säkerhetsavstånd' - 
   du har en övning för det i din B-körkort väg."

→ "Vad betyder en gul skylt med älg?"
← "Det är en varningsskylt för vilt! Den betyder att det finns 
   risk för älgar eller andra djur på vägen. Vanliga i skogs-
   områden. När du ser den: sänk farten och var extra uppmärksam, 
   särskilt i skymning och gryning."
```

**Knowledge Base**:
- Swedish traffic rules (Trafikverket)
- Common driving theory exam questions
- Vehicle maintenance basics
- Eco-driving tips
- Defensive driving techniques
- Weather-specific advice (snow, rain, darkness)

#### 2.2 Route Discovery & Recommendations
**Context**: User location, learning path, completed exercises, preferences

**Example Interactions**:
```
→ "Hitta rutter nära mig för att öva rondeller"
← "Jag hittade 5 rutter inom 10 km från Lund:

   1. **Lund Rondell Circuit** ⭐ Rekommenderad
      - 6 rondeller, varierande storlek
      - Svårighet: Lätt-Medel
      - 4.2 km, ~15 min
      - Skapad av: Maria (Instructor)
   
   2. **Malmö Mini Roundabouts**
      - 8 små rondeller
      - Svårighet: Lätt
      - 6.8 km, ~20 min
      
   Vill du se rutt #1 på kartan?"

→ "Föreslå en rutt för kvällskörning, max 30 min"
← "Perfekt timing! Eftersom du nyligen slutförde 'Grundläggande 
   stadskörning', här är en bra kvällsrutt:
   
   **Lund Evening Practice**
   - Fokus: Belysning, mötande trafik, parkering i mörker
   - 8.5 km, ~25 min
   - Startar från: Lund C (upplyst område)
   - Inkluderar: 2 parkering övningar, landsväg section
   - Trafik just nu: Låg (bra för första kvällskörning!)
   
   Vill du spara denna och få vägbeskrivning?"
```

**Capabilities**:
- Semantic search: "rondeller" → routes tagged with roundabouts
- Location-based filtering (radius, city, region)
- Difficulty matching
- Time-of-day appropriateness
- Weather-appropriate suggestions
- Create new route suggestions based on map data (future)

#### 2.3 App Navigation Help
**Example Interactions**:
```
→ "Hur lägger jag till min handledare?"
← "Gå till din Profil → Relationer-fliken → 'Lägg till Handledare'. 
   Du kan bjuda in dem via email eller dela din kod. 
   Vill jag öppna Profil-skärmen åt dig?"

→ "Var ser jag mina körda timmar?"
← "Dina timmar finns på två ställen:
   1. Hemskärmen → Daglig Status → 'Körjournal' (öppna loggboken)
   2. Profil → Statistik-fliken
   
   Du har kört 18.5 timmar av 120! Fortsätt så 🎉"
```

#### 2.4 Conversation Memory
**Scope**: Per-user conversation history (last 90 days)  
**Storage**: Supabase table `ai_conversations`

**Capabilities**:
- Remember previous questions in same session
- Reference past conversations: "Som jag sa förra veckan..."
- Track user's evolving interests/struggles
- Build long-term learning profile

**Example**:
```
Session 1 (Week 1):
→ "Hur parkerar man parallellt?"
← [explains parallel parking]

Session 2 (Week 3):
→ "Jag klarade parallellparkeringen!"
← "Grattis! Jag minns att du frågade om det för 2 veckor sen. 
   Bra jobbat att öva! Hur många försök behövde du?"
```

---

### 3. Route Discovery (AI-Powered Search)

#### 3.1 Natural Language Search
**Input**: Free-text query in Swedish or English  
**Output**: Ranked list of existing routes + AI-generated suggestions

**Search Algorithm**:
1. **Query Understanding**
   - Extract: location, practice type, difficulty, constraints
   - Example: "nybörjarvänliga rutter med parkering i Lund"
     → location=Lund, difficulty=beginner, features=[parking]

2. **Vector Search** (future - semantic similarity)
   - Embed query and route descriptions
   - Find semantically similar routes
   - Weight by: relevance, distance, user level

3. **Filtering & Ranking**
   - Apply hard filters (distance, difficulty)
   - Rank by:
     * User skill match (40%)
     * Proximity (30%)
     * Rating/popularity (20%)
     * Recency (10%)

4. **Gap Detection**
   - If < 3 good matches found, AI suggests creating new route
   - "I didn't find many parking routes in Lund. Would you like me to suggest one based on map data?"

#### 3.2 Smart Suggestions
**Triggers**:
- After completing an exercise
- When starting a new learning path chapter
- After 3+ days without driving
- When user opens Map/Explore tab

**Example**:
```
User completes "Highway Merging" exercise:
← "Bra jobbat med påfart-övningen! Vill du öva på riktiga motorvägar? 
   Här är 3 rutter nära dig med påfarter:
   - E22 Practice (Medel, 12 km)
   - Lund-Staffanstorp Motorway (Lätt, 8 km)
   - Malmö Highway Loop (Svår, 18 km)"
```

#### 3.3 Route Creation Assistant (Future)
**Input**: User need ("I need a route with 5 left turns and parking")  
**Output**: AI-generated route using Google Maps API + Overpass

**Flow**:
1. AI identifies key requirements
2. Searches OpenStreetMap for relevant road features
3. Generates 2-3 route options
4. User previews on map
5. User saves with custom name/description
6. Route added to database with `created_by=ai_assistant`

---

## User Roles & Capabilities

### Student Role
**Primary Use Cases**:
- Get help understanding exercises
- Find practice routes near them
- Ask theory questions for exam prep
- Get motivation and progress insights
- Learn from mistakes

**Unique Features**:
- Progress-aware responses (knows weak areas)
- Beginner-friendly language
- Safety-first reminders
- Encouraging tone
- Swedish theory exam focus

**Restricted**:
- Cannot access other students' data
- Cannot modify curriculum

---

### Instructor Role
**Primary Use Cases**:
- Track multiple students' progress
- Get teaching suggestions for struggling students
- Identify common mistakes across students
- Assign routes/exercises to students
- Bulk progress analysis

**Unique Features**:
- Multi-student dashboard queries
- Teaching tip generation
- Curriculum gap analysis
- Student comparison (anonymized aggregates)

**Example Interactions**:
```
→ "Hur går det för Emma den här veckan?"
← "Emma's Progress (Feb 7-14):
   ✓ Slutförde 4 övningar (Highway, City Parking)
   ✓ Körde 5.5 timmar (topp 3 denna vecka!)
   ⚠ Kämpar med: Rondeller (2 av 3 försök misslyckades)
   
   Förslag: Tilldela en enkel rondell-rutt som hemläxa. 
   Hon är bra på backspeglar, så fokusera på inträde/utträde."

→ "Vilka övningar får mina elever att ge upp?"
← "Baserat på dina 12 elever:
   1. Backa med släp - 67% completion rate
   2. Mörker körning - 71% completion rate
   3. Bergstart manuell - 75% completion rate
   
   Rekommendation: Dela upp 'Backa med släp' i mindre steg."
```

**Restricted**:
- Cannot see other instructors' students
- Cannot modify school-level curriculum

---

### School/Admin Role
**Primary Use Cases**:
- Analyze curriculum effectiveness
- Identify trending struggles across all students
- Optimize learning path content
- Generate reports for Trafikverket
- Compare school performance with national data

**Unique Features**:
- School-wide analytics
- Curriculum optimization suggestions
- Content gap detection
- Instructor performance insights (aggregated)

**Example Interactions**:
```
→ "Föreslå förbättringar av vår B-körkort kurs"
← "Analys av 234 elever i 'B-körkort Manual' (Q4 2025):
   
   Styrkor:
   ✓ Grundläggande körning: 92% completion (över snitt)
   ✓ Parkering: 88% completion
   
   Förbättringsområden:
   ⚠ Ekologisk körning: 61% completion (under snitt)
     → Förslag: Lägg till 2 extra övningar med bränsleförbrukning fokus
   
   ⚠ Mörkerkörning: 68% completion
     → Förslag: Skapa vinter-specifik modul (okt-feb)
   
   ⚠ Övning 'Bergstart med släp': 45% completion
     → Förslag: Splitta i 2 övningar: (1) Släp teori, (2) Praktisk bergstart"

→ "Hur presterar våra handledare?"
← "Instructor Performance (anonymized):
   - Topp 25%: Students complete paths 23% faster
   - Botten 25%: Students have 2.1x higher dropout rate
   
   Skillnaden: Topp-handledare tilldelar +40% fler praktiska 
   rutter och ger +3.2x mer feedback i appen.
   
   Rekommendation: Utbilda alla handledare i 'aktiv rutt-tilldelning'."
```

**Restricted**:
- Cannot see individual student PII without permission
- Aggregated data only for analysis

---

## AI Assistant Components

### 1. Chat Interface (Primary UI)

#### 1.1 Floating Chat Button
**Location**: Fixed bottom-right corner of all main screens  
**Design**:
- Circular FAB (56x56 dp)
- Icon: Friendly AI avatar or chat bubble
- Color: Primary brand color with subtle gradient
- Badge: Red dot if AI has proactive suggestion
- Animation: Gentle pulse when new suggestion available

**Visibility**:
- Always visible except during: onboarding, login, full-screen video
- Collapses to mini version on scroll (32x32 dp)
- Expands on hover/long-press

#### 1.2 Chat Sheet / Modal
**Trigger**: Tap floating chat button  
**Behavior**: Bottom sheet (mobile) or modal (tablet/web)

**Layout**:
```
┌─────────────────────────────────────────────┐
│  AI Körassistent              [—] [×]       │  ← Header
├─────────────────────────────────────────────┤
│                                             │
│  [AI Avatar] Hej! Hur kan jag hjälpa dig?  │  ← Messages
│               Jag har en fråga →  [User]    │     (scrollable)
│  [AI Avatar] Självklart! Fråga på.         │
│                                             │
├─────────────────────────────────────────────┤
│  💡 Föreslå en rutt                         │  ← Quick actions
│  📚 Förklara denna övning                   │     (contextual)
│  📈 Visa min framsteg                       │
├─────────────────────────────────────────────┤
│  [Text input: Skriv din fråga här...]  [→] │  ← Input
└─────────────────────────────────────────────┘
```

**Features**:
- **Message History**: Last 50 messages in current session
- **Quick Actions**: Context-dependent buttons (1-4 shown)
- **Voice Input**: Microphone button (Swedish STT)
- **Attachments**: Image upload for "What sign is this?" type questions
- **Markdown Support**: Bold, links, lists in AI responses
- **Interactive Elements**: 
  - Route cards (tap to open route detail)
  - Exercise cards (tap to start exercise)
  - "Show on map" buttons
- **Language Toggle**: Swedish ⇄ English (top-right)

#### 1.3 Contextual "Ask AI" Buttons
**Locations**:
1. **Exercise Detail Screen**
   - Button: "Förklara denna övning" (below title)
   - Opens chat with pre-filled context

2. **Learning Path Screen**
   - Button: "Få hjälp med min plan" (in header)
   - Opens chat with path-specific suggestions

3. **Route Detail Screen**
   - Button: "Är detta bra för mig?" (next to difficulty badge)
   - AI analyzes route fit

4. **Daily Status Modal**
   - Button: "Prata med AI" (if user logs struggle/challenge)
   - Opens chat with empathetic response

5. **Profile → Stats Tab**
   - Button: "Analysera min framsteg"
   - Opens chat with progress breakdown

**Design**:
- Secondary button style (outline, not filled)
- Icon: Small AI avatar + text
- Tooltip on hover: "Få hjälp från AI"

---

### 2. Proactive Suggestions

#### 2.1 Notification-Style Suggestions
**Trigger Logic**:
- User completes exercise → Suggest next exercise or route (30% of time)
- User opens app after 3+ days → "Welcome back! Here's what's new"
- User struggles with exercise (3+ failed attempts) → Offer help
- New routes added near user's location → "New routes in your area!"

**Display**:
- Toast notification (dismissible)
- Appears above chat button
- Max 1 per app session to avoid annoyance

**Example**:
```
┌──────────────────────────────────────────┐
│  💡 AI Förslag                      [×]  │
│  Du klarade 'Motorväg'! Vill du öva      │
│  påfart i verkligheten? Jag hittade      │
│  3 rutter nära dig.        [Visa mig →] │
└──────────────────────────────────────────┘
```

#### 2.2 In-Context Suggestions
**Example 1 - Empty Route Search**:
```
User searches "winter driving" but 0 results found:

┌──────────────────────────────────────────┐
│  Inga rutter hittades för "winter        │
│  driving"                                │
│                                          │
│  💡 AI Assistent säger:                  │
│  "Jag kan hjälpa dig hitta vinter-       │
│  övningar eller föreslå en rutt baserat  │
│  på vad du vill öva!"                    │
│                                          │
│  [Prata med AI →]                        │
└──────────────────────────────────────────┘
```

**Example 2 - Low Completion Exercise**:
```
User views exercise with 3 failed attempts:

[Exercise: Parallellparkering - 3 försök ⚠]

💡 AI Tip: "Kämpar du med denna? Jag kan förklara 
steg-för-steg eller hitta en enklare parkering 
övning först. Vill du ha hjälp?"

[Ja, förklara] [Hitta enklare övning]
```

---

### 3. Chat History & Management

#### 3.1 Conversation Threading
**Structure**:
- Each chat session = 1 conversation
- Session ends after 30 min inactivity or user closes chat
- New session starts fresh but AI has access to conversation history

**Database Schema** (`ai_conversations` table):
```sql
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMP,
  last_message_at TIMESTAMP,
  message_count INT,
  context_snapshot JSONB,  -- What user was viewing when chat started
  deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE ai_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES ai_conversations(id),
  role TEXT,  -- 'user' or 'assistant'
  content TEXT,
  metadata JSONB,  -- attachments, quick actions taken, etc.
  created_at TIMESTAMP
);
```

#### 3.2 History View
**Location**: Chat modal → Header → "Historik" icon  
**Display**: List of past conversations

```
┌─────────────────────────────────────────┐
│  Konversationshistorik         [×]      │
├─────────────────────────────────────────┤
│  🕐 Idag, 14:32                         │
│  "Hur parkerar man parallellt?"         │
│  12 meddelanden                         │
│                                         │
│  🕐 Igår, 09:15                         │
│  "Hitta rondell-rutter i Lund"          │
│  8 meddelanden                          │
│                                         │
│  🕐 5 Feb, 16:45                        │
│  "Vad betyder denna skylt?"             │
│  4 meddelanden                          │
│                                         │
│  [Radera all historik]                  │
└─────────────────────────────────────────┘
```

**Features**:
- Tap conversation to reopen
- Swipe to delete individual conversation
- "Delete all history" button (with confirmation)
- Search conversations (future)

#### 3.3 Privacy Controls
**Settings** (Profile → Settings → AI Assistent):
- ☑ Spara konversationshistorik (default: ON)
- ☑ Tillåt proaktiva förslag (default: ON)
- ☑ Använd min plats för rutt-rekommendationer (default: ON)
- [Radera all AI-data] button

**Data Retention**:
- Conversations older than 90 days auto-deleted
- User can delete anytime
- Deleted conversations purged immediately (hard delete)

---

## Context & Intelligence

### 1. Context Sources

The AI has access to the following context depending on what screen the user is on:

#### Global Context (Always Available)
```json
{
  "user": {
    "id": "uuid",
    "role": "student|instructor|school|admin",
    "name": "Emma Svensson",
    "learning_paths": ["B-körkort Manual"],
    "current_path_id": "uuid",
    "total_hours_driven": 18.5,
    "completed_exercises": 42,
    "language_preference": "sv",
    "location": {
      "city": "Lund",
      "lat": 55.7047,
      "lng": 13.1910
    }
  },
  "session": {
    "current_screen": "ExerciseDetailScreen",
    "screen_data": { ... },  // See below
    "timestamp": "2026-02-14T15:30:00Z"
  }
}
```

#### Screen-Specific Context

**ExerciseDetailScreen**:
```json
{
  "exercise": {
    "id": "uuid",
    "title": "Parallellparkering",
    "description": "...",
    "difficulty": "medium",
    "repeat_count": 5,
    "learning_path_id": "uuid",
    "tags": ["parking", "spatial-awareness"],
    "youtube_url": "https://..."
  },
  "user_progress": {
    "attempts": 3,
    "completions": 1,
    "last_attempt": "2026-02-12T10:00:00Z",
    "average_time": "15 minutes",
    "struggle_areas": ["mirror-checks", "distance-judgment"]
  }
}
```

**LearningPathScreen**:
```json
{
  "learning_path": {
    "id": "uuid",
    "title": "B-körkort Manual",
    "description": "...",
    "vehicle_type": "car",
    "transmission": "manual",
    "experience_level": "beginner",
    "total_exercises": 67,
    "estimated_hours": 120
  },
  "user_progress": {
    "completed_exercises": 28,
    "completion_percentage": 42,
    "weak_categories": ["night-driving", "eco-driving"],
    "strong_categories": ["basic-controls", "parking"],
    "estimated_completion_date": "2026-04-15"
  }
}
```

**RouteDetailScreen**:
```json
{
  "route": {
    "id": "uuid",
    "title": "Lund City Center Practice",
    "description": "...",
    "difficulty": "medium",
    "distance_km": 4.2,
    "estimated_duration_min": 15,
    "tags": ["roundabouts", "traffic-lights", "city"],
    "start_location": {"lat": ..., "lng": ...},
    "exercises": ["roundabout-entry", "traffic-light-stop"],
    "creator_role": "instructor",
    "rating": 4.5,
    "completed_by": 156
  },
  "user_context": {
    "distance_from_user_km": 2.3,
    "has_driven": false,
    "related_completed_exercises": ["basic-city-driving"],
    "skill_match": "good"  // AI calculated
  }
}
```

**DailyStatusModal**:
```json
{
  "daily_status": {
    "date": "2026-02-14",
    "drove_today": false,
    "how_it_went": null,
    "challenges": "Felt tired, didn't have time",
    "notes": "",
    "media": []
  },
  "recent_pattern": {
    "days_since_last_drive": 3,
    "weekly_streak": 0,
    "avg_drives_per_week": 2.5,
    "common_challenges": ["time", "weather"]
  }
}
```

---

### 2. AI Capabilities & Intelligence

#### 2.1 Natural Language Understanding (NLU)
**Provider**: OpenAI GPT-4 or Anthropic Claude  
**Features**:
- Intent classification (question, route-search, help-request, feedback)
- Entity extraction (location, difficulty, practice-type, time-of-day)
- Language detection (Swedish ↔ English)
- Sentiment analysis (frustrated, confident, confused)

**Example**:
```
User: "Jag behöver öva parkering i Malmö, men inte för svårt"
→ Extracted:
   - Intent: route_search
   - Practice type: parking
   - Location: Malmö
   - Difficulty preference: easy-to-medium
   - Language: Swedish
```

#### 2.2 Knowledge Base
**Swedish Traffic Rules**:
- Source: Trafikverket official documentation
- Coverage: Speed limits, signs, right-of-way, safety rules
- Updates: Quarterly sync with Trafikverket API (future)

**Driving Theory Exam**:
- Common exam questions (1000+ Q&A pairs)
- Explanation of correct answers
- Common mistakes to avoid

**Vehicle Types & Transmissions**:
- Manual vs automatic differences
- Motorcycle-specific techniques
- Truck/bus regulations

**Swedish Geography**:
- Cities, regions, common routes
- Weather patterns (winter driving in North vs South)

#### 2.3 Personalization Engine
**Learning Profile**:
- Tracks user's strong/weak areas over time
- Adapts explanation complexity to user level
- Remembers user preferences (e.g., prefers video over text)

**Recommendation Algorithm**:
```python
def recommend_route(user, query):
    # Factors:
    # 1. Skill match (40%): route difficulty vs user level
    skill_match = calculate_skill_match(user.completed_exercises, route.difficulty)
    
    # 2. Relevance (30%): query match + user's weak areas
    relevance = semantic_similarity(query, route.description) + \
                overlap(user.weak_areas, route.exercises)
    
    # 3. Proximity (20%): distance from user
    proximity_score = 1 / (1 + distance_km)
    
    # 4. Popularity (10%): rating + completions
    popularity = (route.rating / 5) * log(1 + route.completed_by)
    
    return 0.4*skill_match + 0.3*relevance + 0.2*proximity + 0.1*popularity
```

#### 2.4 Conversation Memory
**Short-term** (current session):
- Last 20 messages in context window
- Allows follow-up questions ("Vad menade du med det?")

**Long-term** (across sessions):
- Stored in database (ai_messages table)
- AI can reference: "Som jag förklarade förra veckan..."
- Builds user's learning narrative

---

### 3. Response Generation

#### 3.1 Tone & Style Guidelines
**For Students**:
- Encouraging and supportive ("Bra jobbat!", "Det kommer gå bra!")
- Safety-first mindset
- Break down complex topics into simple steps
- Use analogies and examples
- Swedish: Informal "du" form, friendly but professional

**For Instructors**:
- Professional and efficient
- Data-driven insights
- Teaching suggestions, not prescriptions
- Respectful of their expertise

**For Schools/Admins**:
- Formal and analytical
- Focus on metrics and ROI
- Actionable recommendations
- Respect data privacy

#### 3.2 Response Formatting
**Structure** (for explanations):
1. **Direct Answer** (1-2 sentences)
2. **Context/Details** (2-4 sentences)
3. **Actionable Next Step** (1 sentence)
4. **Optional**: Related question/suggestion

**Example**:
```
Q: "Hur kör man i rondell?"

A: "I en rondell kör du moturs och ger företräde till trafik 
   från vänster. [1. Direct answer]
   
   Steg-för-steg:
   1. Sänk farten när du närmar dig
   2. Titta åt vänster - finns det trafik?
   3. Blinka höger när du ska ut
   4. Håll låg fart inne i rondellen
   [2. Details]
   
   Du har övningen 'Rondellkörning' i din plan - vill du 
   starta den nu? [3. Next step]
   
   Tips: Öva först på små rondeller med lite trafik! [4. Suggestion]"
```

#### 3.3 Multi-Modal Responses
**Text + Cards**:
```
[Text] "Här är 3 bra rutter för parkering i Lund:"

[RouteCard]  Lund Parking Circuit
             📍 2.3 km bort · ⭐ 4.5 · Medel
             [Visa] [Spara]

[RouteCard]  City Center Parking
             📍 3.1 km bort · ⭐ 4.2 · Lätt
             [Visa] [Spara]

[Text] "Vill du ha mer information om någon av dessa?"
```

**Text + Map**:
```
[Text] "Här är rutten på kartan:"

[EmbeddedMap showing route with start/end markers]

[Text] "Startar från Lund C, totalt 4.2 km. Bäst tid: 14-16."
```

**Text + Video Suggestion**:
```
[Text] "Jag hittade en bra video om parallellparkering:"

[VideoCard] "Parallel Parking - Manual Transmission"
            📺 YouTube · 8:23 · Svenska
            [Öppna video]

[Text] "Titta på videon först, sedan öva i verklig!"
```

---

## Integration Points

### 1. Navigation Integration

#### App-Wide Chat Access
**Implementation**:
- Floating Action Button (FAB) component
- Rendered in `TabNavigator.tsx` at root level
- Persists across all tab navigations
- Z-index ensures always on top

**Code Structure** (pseudo):
```tsx
// TabNavigator.tsx
<NavigationContainer>
  <TabNavigator>
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Progress" component={ProgressScreen} />
    {/* ... other tabs */}
  </TabNavigator>
  
  <AIChatFAB />  {/* Always visible */}
</NavigationContainer>
```

#### Screen-Specific Entry Points
**Files to Modify**:
```
src/screens/
├── ExerciseDetailScreen.tsx       → Add "Förklara övning" button
├── ProgressScreen.tsx              → Add "Analysera framsteg" button
├── RouteDetailScreen.tsx           → Add "Är detta bra för mig?" button
├── HomeScreen/
│   ├── DailyStatus.tsx             → Add "Prata med AI" in challenge section
│   └── LearningPathCard.tsx        → Add "Få hjälp" icon
└── explore/MapScreen.tsx           → Add "Föreslå rutt" in search empty state
```

**Integration Pattern**:
```tsx
// ExerciseDetailScreen.tsx
import { AIChatButton } from '@/components/ai/AIChatButton';

export function ExerciseDetailScreen({ route }) {
  const { exercise } = route.params;
  
  return (
    <View>
      <Text>{exercise.title}</Text>
      <Text>{exercise.description}</Text>
      
      <AIChatButton
        context={{
          type: 'exercise',
          data: exercise,
          userProgress: { /* ... */ }
        }}
        label="Förklara denna övning"
        icon="help-circle"
      />
      
      {/* Rest of screen */}
    </View>
  );
}
```

---

### 2. Data Integration

#### Read Access (AI needs these):
```
Supabase Tables:
├── profiles               → User info, role, preferences
├── learning_paths         → Available courses
├── learning_path_exercises → All exercises with descriptions
├── user_exercise_progress → Completion status, attempts
├── routes                 → Community routes
├── daily_driving_status   → User's driving log
├── user_connections       → Student-instructor relationships (for instructor queries)
└── translations           → For bilingual responses
```

#### Write Access (AI creates these):
```
New Tables:
├── ai_conversations       → Chat sessions
├── ai_messages            → Individual messages
├── ai_suggestions         → Proactive suggestions shown to user
└── ai_generated_routes    → Routes created by AI (future)
```

**Row Level Security (RLS)**:
- Users can only read their own `ai_conversations`
- Instructors can only query progress for their connected students
- Schools can only access aggregated data for their students
- All PII redacted in instructor/school queries

---

### 3. Component Architecture

```
src/components/ai/
├── AIChatFAB.tsx                 → Floating action button (main entry)
├── AIChatModal.tsx               → Full chat interface
├── AIChatButton.tsx              → Contextual "Ask AI" buttons
├── AIMessageBubble.tsx           → Single message component
├── AIQuickActions.tsx            → Context-based quick action chips
├── AIRouteCard.tsx               → Route suggestion card in chat
├── AIExerciseCard.tsx            → Exercise suggestion card
├── AITypingIndicator.tsx         → "AI is typing..." animation
├── AIVoiceInput.tsx              → Voice-to-text button
└── AIHistoryView.tsx             → Conversation history list
```

**Shared Utilities**:
```
src/utils/ai/
├── aiContext.ts                  → Gather context from current screen
├── aiClient.ts                   → API calls to AI backend
├── aiCache.ts                    → Cache common queries (theory Q&A)
└── aiAnalytics.ts                → Track AI usage metrics
```

---

### 4. Backend Integration

#### API Endpoints
**Base URL**: `https://api.vromm.se/v1/ai/`

```
POST /chat
  Body: {
    message: string,
    context: ScreenContext,
    conversation_id?: string,
    language: 'sv' | 'en'
  }
  Response: {
    reply: string,
    quick_actions?: QuickAction[],
    suggestions?: (Route | Exercise)[],
    conversation_id: string
  }

GET /conversations
  Query: { user_id, limit, offset }
  Response: { conversations: Conversation[] }

DELETE /conversations/:id
  Response: { success: boolean }

POST /suggest-route
  Body: { query: string, location: LatLng, user_id: string }
  Response: { routes: Route[], ai_commentary: string }

GET /theory/:topic
  Query: { topic: string, language: 'sv' | 'en' }
  Response: { content: string, sources: string[] }
```

#### AI Service Architecture
```
Backend Services:
├── API Gateway (Express/Fastify)
│   └── /v1/ai/* endpoints
│
├── AI Service (Node.js/Python)
│   ├── OpenAI GPT-4 API integration
│   ├── Context builder (merges user data + screen context)
│   ├── Response formatter (text → cards/actions)
│   └── Conversation manager (stores in Supabase)
│
├── Search Service
│   ├── Vector database (Pinecone/Weaviate) for semantic route search
│   ├── Elasticsearch for full-text exercise search
│   └── Route recommender (scoring algorithm)
│
└── Knowledge Base
    ├── Trafikverket rules (JSON)
    ├── Theory exam Q&A (JSON)
    └── Common phrases (Swedish/English)
```

---

## Data Privacy & Security

### 1. Privacy Principles
- **Minimal Collection**: Only collect necessary conversation data
- **User Control**: Users can delete all AI data anytime
- **Transparency**: Clear explanation of what AI knows and why
- **Anonymization**: Aggregate data for schools/admins never includes PII

### 2. Data Storage & Retention
**What We Store**:
- Conversation messages (text only, no audio recordings)
- Context snapshots (what screen user was on)
- AI usage metrics (aggregated, no message content)

**What We DON'T Store**:
- Voice recordings (converted to text, then audio deleted)
- Image uploads (processed, then deleted unless user saves)
- Location history (only current location when needed, not tracked)

**Retention Policy**:
- Active conversations: Kept indefinitely
- Auto-delete after 90 days if user inactive
- User-deleted: Hard delete immediately (no backups)

### 3. Data Access Control
**Row Level Security (RLS) Policies**:
```sql
-- Students can only see their own conversations
CREATE POLICY student_own_conversations ON ai_conversations
  FOR SELECT USING (auth.uid() = user_id);

-- Instructors can query student progress IF connected
CREATE POLICY instructor_student_access ON user_exercise_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_connections
      WHERE supervisor_id = auth.uid()
      AND student_id = user_id
      AND status = 'accepted'
    )
  );

-- Schools can only access aggregated data (enforced in API layer)
```

### 4. GDPR Compliance
**Right to Access**:
- User can export all AI conversations as JSON
- Available in: Profile → Settings → Privacy → Export AI Data

**Right to Deletion**:
- "Delete all AI data" button in settings
- Cascades to: conversations, messages, suggestions
- Confirmed with password re-entry

**Right to Rectification**:
- User can edit/delete individual messages in chat history
- Corrected data used for future AI responses

**Data Portability**:
- Export format: JSON with message timestamps, content, context
- Includes metadata but no other users' data

---

## Technical Architecture

### 1. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Vromm Mobile App                         │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │ HomeScreen    │  │ ExerciseScreen│  │ RouteScreen    │  │
│  │ [AI Button]   │  │ [AI Button]   │  │ [AI Button]    │  │
│  └───────┬───────┘  └───────┬───────┘  └────────┬───────┘  │
│          └──────────────────┴──────────────────┬─┘          │
│                              │                              │
│                      ┌───────▼────────┐                     │
│                      │  AIChatModal   │                     │
│                      │  - Messages    │                     │
│                      │  - Quick       │                     │
│                      │    Actions     │                     │
│                      └───────┬────────┘                     │
└──────────────────────────────┼──────────────────────────────┘
                               │
                               │ HTTPS
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Vromm Backend API                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              AI Service (Node.js/Python)               │ │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────────────┐   │ │
│  │  │ Context  │→ │  GPT-4   │→ │ Response Formatter │   │ │
│  │  │ Builder  │  │   API    │  │  (Cards, Actions)  │   │ │
│  │  └──────────┘  └──────────┘  └────────────────────┘   │ │
│  └───────────────────────┬────────────────────────────────┘ │
│                          │                                   │
│  ┌───────────────────────▼────────────────────────────────┐ │
│  │           Supabase (Database + Auth)                   │ │
│  │  • ai_conversations                                    │ │
│  │  • ai_messages                                         │ │
│  │  • profiles, learning_paths, routes, etc.             │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    External Services                         │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  OpenAI     │  │  Pinecone    │  │  Google Maps     │   │
│  │  GPT-4 API  │  │  (Vector DB) │  │  (Route Gen)     │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

### 2. AI Model Selection

**Primary**: OpenAI GPT-4 Turbo  
**Why**:
- Best Swedish language support
- Strong reasoning for complex queries
- Good at structured output (JSON responses)
- Function calling for route search, data retrieval

**Alternative**: Anthropic Claude 3  
**Use When**:
- Need longer context (100k tokens for analyzing full learning paths)
- More conservative safety filters
- Better refusal handling for out-of-scope queries

**Fallback**: GPT-3.5 Turbo  
**Use When**:
- Simple theory questions (cache hits)
- Cost optimization for high-volume queries
- OpenAI API outage

---

### 3. Prompt Engineering

#### System Prompt (Student Role)
```
You are Vromm's AI driving assistant, helping Swedish students learn to drive safely and confidently.

Context:
- Student: {user_name}, learning {learning_path_title}
- Progress: {completed_exercises}/{total_exercises} exercises done
- Current screen: {screen_name}
- Language: {language_preference}

Your role:
1. Answer questions about Swedish driving rules, theory, and techniques
2. Help students understand exercises and overcome challenges
3. Suggest relevant routes and practice opportunities
4. Provide encouragement and motivation
5. Always prioritize safety

Tone:
- Friendly and encouraging ("Bra jobbat!", "Det kommer gå bra!")
- Use "du" form in Swedish
- Keep answers concise (2-4 sentences) unless asked for detail
- Be supportive of mistakes - they're part of learning

Knowledge:
- Swedish traffic rules (Trafikverket)
- Driving techniques for car/motorcycle/truck
- Manual and automatic transmission differences
- Theory exam preparation

Limitations:
- Don't give medical or legal advice
- Don't make promises about exam results
- If unsure, say "Jag är inte säker, fråga din handledare"
- Don't access other users' private data

Current context: {context_json}
```

#### Example Prompts

**Route Search**:
```
User query: "Hitta rondell-rutter i Lund"

Extract and execute:
{
  "intent": "route_search",
  "practice_type": "roundabouts",
  "location": "Lund",
  "difficulty": null,  // not specified
  "max_distance_km": 10  // default
}

Then respond with:
1. List of matching routes (top 3-5)
2. Brief commentary on each
3. Ask if user wants to see on map
```

**Exercise Help**:
```
User: "Jag förstår inte parallellparkering"
Context: User has failed exercise 3 times, viewing ExerciseDetailScreen

Respond with:
1. Empathetic acknowledgment ("Parallellparkering är svårt! Många kämpar med det.")
2. Break down into 3-4 simple steps
3. Mention specific tips based on user's weak areas (from progress data)
4. Suggest prerequisite exercise if needed
5. Offer to show video or find practice route
```

---

### 4. Performance Optimization

#### Response Time Targets
- Simple questions (cached): < 500ms
- Route search: < 2 seconds
- Complex analysis: < 5 seconds

#### Caching Strategy
**Cache common theory questions**:
```
Redis cache:
Key: "theory:sv:hastighetsgräns_motorväg"
Value: { answer: "110-120 km/h...", timestamp: ... }
TTL: 7 days
```

**Cache route recommendations**:
```
Key: "routes:roundabouts:lund:beginner"
Value: [ route_ids ]
TTL: 1 hour (routes change frequently)
```

#### Rate Limiting
- Students: 30 messages per hour (prevent abuse)
- Instructors: 100 queries per hour
- Schools: 500 queries per hour (analytics)

---

### 5. Error Handling

**AI API Failures**:
```
IF OpenAI timeout:
  → Show: "AI tar lite längre tid än vanligt, vänligen vänta..."
  → Retry up to 3 times
  → IF still failing:
    → Fallback to GPT-3.5 or cached responses
    → Show: "AI är tillfälligt otillgänglig. Försök igen om en minut."
```

**Context Errors**:
```
IF context is incomplete (e.g., exercise ID invalid):
  → Log error to monitoring
  → Respond with: "Jag kan inte se övningen just nu. Kan du berätta vad du behöver hjälp med?"
  → Continue conversation in free-form mode
```

**Inappropriate Queries**:
```
IF query detected as:
  - Spam/abuse
  - Request for other users' data
  - Harmful content
  
  → Respond: "Jag kan bara hjälpa med körning och teorifrågor. Fråga något annat!"
  → Log to admin dashboard (potential abuse)
```

---

## Future Enhancements

### Phase 2 (Q2 2026)
- **Voice Chat**: Full voice interaction (Swedish STT/TTS)
- **Image Recognition**: "What sign is this?" with photo upload
- **Offline Mode**: Cached responses for common questions
- **Instructor Co-Pilot**: Real-time suggestions during live lessons

### Phase 3 (Q3 2026)
- **AI Route Generation**: Create custom routes from map data
- **Progress Predictions**: "You'll be test-ready in 6 weeks"
- **Smart Notifications**: "Good time to practice - weather is perfect!"
- **Multilingual**: English, Arabic, Somali support

### Phase 4 (Q4 2026)
- **AR Integration**: Point camera at road, AI explains what to do
- **Simulator Integration**: AI coach during VR driving practice
- **Exam Prep Mode**: Mock theory test with AI explanations
- **Peer Learning**: AI connects students with similar challenges

---

## Appendix

### A. Example User Flows
See: [AI-ASSISTANT-USER-FLOWS.md](./AI-ASSISTANT-USER-FLOWS.md)

### B. UI Mockups
See: [AI-ASSISTANT-UI-MOCKUPS.md](./AI-ASSISTANT-UI-MOCKUPS.md)

### C. Integration Map
See: [AI-ASSISTANT-INTEGRATION-MAP.md](./AI-ASSISTANT-INTEGRATION-MAP.md)

### D. Example Conversations
See: [AI-ASSISTANT-CONVERSATIONS.md](./AI-ASSISTANT-CONVERSATIONS.md)

### E. API Specification
See: [AI-ASSISTANT-API-SPEC.md](./AI-ASSISTANT-API-SPEC.md)

---

## Document Status
- **Status**: Draft for Review
- **Owner**: Product Team
- **Reviewers**: Engineering, UX, Legal
- **Next Steps**: 
  1. Review with stakeholders
  2. Finalize UI mockups
  3. Create technical implementation plan
  4. Privacy/GDPR legal review
  5. Estimate development timeline
