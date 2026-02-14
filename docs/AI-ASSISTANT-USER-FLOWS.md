# AI Assistant User Flows
> **Vromm Driving Education Platform**  
> Version: 1.0  
> Date: 2026-02-14

## Table of Contents
1. [Student Flows](#student-flows)
2. [Instructor Flows](#instructor-flows)
3. [School/Admin Flows](#schooladmin-flows)
4. [Error & Edge Cases](#error--edge-cases)

---

## Student Flows

### Flow 1: Exercise Help - "I Don't Understand This Exercise"

**Scenario**: Emma is a beginner student struggling with parallel parking exercise

```
┌─────────────────────────────────────────────────────────────┐
│                    INITIAL STATE                            │
└─────────────────────────────────────────────────────────────┘
Emma opens ExerciseDetailScreen: "Parallellparkering"
- She sees: Title, description, video link, difficulty: Medium
- Her progress: 0/5 attempts completed
- She feels confused about how to start

┌─────────────────────────────────────────────────────────────┐
│                    USER ACTION                              │
└─────────────────────────────────────────────────────────────┘
Emma taps: "Förklara denna övning" button (below exercise title)

┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM RESPONSE                          │
└─────────────────────────────────────────────────────────────┘
1. AIChatModal slides up from bottom (70% screen height)
2. Context automatically gathered:
   - Exercise: Parallellparkering
   - User level: Beginner
   - Progress: 0 attempts
   - Related completed exercises: "Basic reversing" ✓
3. AI generates personalized response (2-3 seconds)

┌─────────────────────────────────────────────────────────────┐
│                    AI RESPONSE                              │
└─────────────────────────────────────────────────────────────┘
Chat shows:

[AI Avatar] "Hej Emma! Parallellparkering kan kännas svårt 
i början, men du har redan övat backspeglar så det blir 
lättare! 

Här är steg-för-steg:

1. **Hitta parkeringen** - Kör förbi den tomma platsen, 
   stoppa när din bakspegel är i linje med första bilen

2. **Backa på vinkel** - Vrid ratten helt åt höger, backa 
   tills bilen är i 45° vinkel

3. **Räta upp** - Vrid ratten åt vänster, backa tills du 
   är parallell

4. **Justera** - Små justeringar framåt/bakåt för att 
   centrera

🎥 Vill du se en video först? Jag har en bra på 8 minuter.

Eller ska jag hitta en lätt rutt där du kan öva detta?"

┌─────────────────────────────────────────────────────────────┐
│              QUICK ACTION BUTTONS                           │
└─────────────────────────────────────────────────────────────┘
[🎥 Visa video] [🗺️ Hitta övningsrutt] [❓ Fråga mer]

┌─────────────────────────────────────────────────────────────┐
│                    USER CHOICE 1: Video                     │
└─────────────────────────────────────────────────────────────┘
Emma taps: "Visa video"

→ Chat shows embedded YouTube video card:
  ┌─────────────────────────────────────┐
  │ 🎬 Parallel Parking Tutorial        │
  │ Manual Transmission | Swedish       │
  │ Duration: 8:23                      │
  │ [▶ Spela video]                     │
  └─────────────────────────────────────┘

→ Emma watches video in-app
→ Returns to chat

AI: "Såg du videon? Känner du dig redo att öva på riktigt? 
     Jag kan hitta en rutt med enkla parkeringar! 🚗"

┌─────────────────────────────────────────────────────────────┐
│                    USER CHOICE 2: Find Route                │
└─────────────────────────────────────────────────────────────┘
Emma taps: "Hitta övningsrutt"

→ AI searches routes database:
  - Query: "parking practice" + location: Lund + difficulty: easy
  - Returns 3 best matches

→ Chat displays route cards:
  ┌─────────────────────────────────────────┐
  │ 📍 Lund Parking Basics                  │
  │ 3 easy parking spots • 2.1 km bort      │
  │ Svårighet: Lätt • ⭐ 4.6 (89 körningar) │
  │ [Visa karta] [Spara]                    │
  └─────────────────────────────────────────┘
  
  ┌─────────────────────────────────────────┐
  │ 📍 Stadsparken Practice                 │
  │ 5 parking spots • 3.4 km bort           │
  │ Svårighet: Lätt-Medel • ⭐ 4.3          │
  │ [Visa karta] [Spara]                    │
  └─────────────────────────────────────────┘

AI: "Rekommenderar 'Lund Parking Basics' - den har 3 stora 
     platser perfekt för att börja! Många elever börjar där. 
     Vill du köra dit nu eller spara för senare?"

┌─────────────────────────────────────────────────────────────┐
│                    USER CHOICE 3: Ask More                  │
└─────────────────────────────────────────────────────────────┘
Emma types: "Vad om jag krockar?"

AI: "Bra fråga! När du övar parallellparkering:

✓ **Kör långsamt** - Max 5 km/h när du backar
✓ **Kolla speglarna** - Hela tiden!
✓ **Stopp om osäker** - Backa inte om du inte ser klart
✓ **Öva med handledare först** - Aldrig ensam första gången

Det är okej att göra flera försök! De flesta behöver 10-20 
försök innan det känns naturligt. Din handledare är där för 
att hjälpa till.

Safety first! 🛡️ Börja alltid med stora, tomma platser."

┌─────────────────────────────────────────────────────────────┐
│                    OUTCOME                                  │
└─────────────────────────────────────────────────────────────┘
✓ Emma understands the exercise steps
✓ She has watched a helpful video
✓ She has found a practice route nearby
✓ She feels confident and safe to try
✓ Conversation saved in history for future reference

**Success Metrics**:
- Time to understanding: < 5 minutes
- Exercise attempt after chat: 78% (vs 45% without chat)
- Confidence rating (post-chat): 4.2/5
```

---

### Flow 2: Route Discovery - "Find Routes for Practicing X"

**Scenario**: Johan wants to practice roundabouts before his test

```
┌─────────────────────────────────────────────────────────────┐
│                    INITIAL STATE                            │
└─────────────────────────────────────────────────────────────┘
Johan is on HomeScreen → Explore Tab
- He's 2 weeks from his driving test
- He's completed most exercises except "Rondellkörning" (3/5)
- He's in Malmö

┌─────────────────────────────────────────────────────────────┐
│                    USER ACTION                              │
└─────────────────────────────────────────────────────────────┘
Option A: Johan taps floating AI chat button
Option B: Johan opens Map search → types "rondeller" → 0 results
          → Sees AI suggestion: "Jag kan hjälpa dig hitta!"

(Either path leads to AIChatModal)

┌─────────────────────────────────────────────────────────────┐
│                    USER INPUT                               │
└─────────────────────────────────────────────────────────────┘
Johan types: "Hitta rutter nära mig för att öva rondeller"

OR uses voice input: 🎤 "Jag behöver öva rondeller inför provet"

┌─────────────────────────────────────────────────────────────┐
│                    AI PROCESSING                            │
└─────────────────────────────────────────────────────────────┘
1. Parse query:
   - Intent: route_search
   - Practice type: roundabouts
   - Location: Malmö (from user profile)
   - Urgency: high (upcoming test)

2. Search algorithm:
   - Filter routes with "roundabout" tags within 15km
   - Rank by: difficulty match + rating + proximity
   - Prioritize recent/popular routes

3. Context consideration:
   - User skill: Intermediate (70% exercises complete)
   - Weak area: Roundabouts (60% complete)
   - Suggest medium difficulty routes

┌─────────────────────────────────────────────────────────────┐
│                    AI RESPONSE                              │
└─────────────────────────────────────────────────────────────┘
AI: "Jag hittade 6 rutter med rondeller i Malmö-området! 
     Eftersom du har prov snart, här är de 3 bästa:

┌─────────────────────────────────────────────────────┐
│ ⭐ REKOMMENDERAD                                    │
│ Malmö Rondell-Tour                                  │
│ 8 rondeller (4 små, 3 medel, 1 stor)               │
│ 📍 6.2 km • ~22 min • Svårighet: Medel             │
│ ⭐ 4.7 (234 körningar)                              │
│ Skapad av: Anna Svensson (Instructor)              │
│                                                     │
│ 💬 "Perfekt mix för provträning! Börja med små    │
│     rondeller, sedan större. Exakt som på provet." │
│                                                     │
│ [📍 Visa karta] [💾 Spara] [▶ Starta]             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Limhamn Roundabout Circuit                          │
│ 5 rondeller (alla medel storlek)                    │
│ 📍 4.8 km • ~18 min • Svårighet: Lätt-Medel        │
│ ⭐ 4.5 (156 körningar)                              │
│ [📍 Visa karta] [💾 Spara]                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Västra Hamnen Multi-Lane Roundabouts                │
│ 3 stora rondeller (2-filig)                         │
│ 📍 7.3 km • ~25 min • Svårighet: Medel-Svår        │
│ ⭐ 4.3 (98 körningar)                               │
│ ⚠️ Avancerad - öva enklare rutter först             │
│ [📍 Visa karta] [💾 Spara]                          │
└─────────────────────────────────────────────────────┘

📊 **Tips för provträning:**
- Kör rutt #1 minst 3 gånger
- Öva olika tider på dygnet (trafik varierar)
- Fokusera på: Blinkersanvändning + Filval + Utkik

Vill du jag förklarar hur man kör 2-filiga rondeller?"

┌─────────────────────────────────────────────────────────────┐
│                    USER INTERACTION                         │
└─────────────────────────────────────────────────────────────┘
Johan taps: "Visa karta" on first route

→ Chat minimizes to bottom bar
→ MapScreen opens with route highlighted
→ Shows: Start point (📍), route path, all 8 roundabouts marked
→ Bottom sheet: Route details + "Starta navigation" button

Johan taps: "Spara" on route
→ ✅ "Rutt sparad till dina favoriter!"
→ Added to HomeScreen → Saved Routes section

Johan returns to chat (chat icon shows "1" badge)
→ Chat reopens at same position

┌─────────────────────────────────────────────────────────────┐
│                    FOLLOW-UP QUESTION                       │
└─────────────────────────────────────────────────────────────┘
Johan types: "Ja, förklara 2-filiga rondeller"

AI: "Bra fråga! 2-filiga rondeller är vanliga på provet.

**Regler:**
1. **Höger fil** → Om du ska ta första/andra avfarten
2. **Vänster fil** → Om du ska längre än halva rondellen

**Viktigt:**
✓ Välj fil INNAN du kör in
✓ Blinka höger när du byter till yttre fil
✓ Ge alltid företräde till trafik från vänster
✓ Håll koll på blinda vinkeln när du byter fil

**Vanligt fel:** Byta fil INNE i rondellen utan att kolla 
spegeln. På provet = UNDERKÄNT! 

Vill du se en video? Eller öva med enklare 1-filig först?"

┌─────────────────────────────────────────────────────────────┐
│                    OUTCOME                                  │
└─────────────────────────────────────────────────────────────┘
✓ Johan found 3 relevant practice routes
✓ He saved 1 route to favorites
✓ He learned how to handle multi-lane roundabouts
✓ He has a clear practice plan for his test prep
✓ AI provided test-specific tips

**Success Metrics**:
- Routes found: 6 (filtered to top 3)
- Route saved: Yes
- Route driven within 7 days: 85% likelihood
- Test pass rate (AI users): 12% higher
```

---

### Flow 3: Daily Status Integration - Encouragement After Skipping Days

**Scenario**: Sara hasn't driven in 4 days, opens app to log status

```
┌─────────────────────────────────────────────────────────────┐
│                    INITIAL STATE                            │
└─────────────────────────────────────────────────────────────┘
Sara opens Vromm app
- Last drive: 4 days ago
- Reason: Bad weather (logged in previous daily status)
- Current streak: 0 days
- Weekly goal: 3 drives (0/3 this week)

┌─────────────────────────────────────────────────────────────┐
│                    USER ACTION                              │
└─────────────────────────────────────────────────────────────┘
Sara goes to: HomeScreen → Taps "Daglig Status" card

→ DailyStatusModal opens
→ Shows date picker: "14 Feb 2026"
→ Question: "Körde du idag?"

Sara selects: ❌ "Nej, körde inte"

→ Field appears: "Varför inte? (frivillig)"

Sara types: "Fortfarande regn, orkar inte"

┌─────────────────────────────────────────────────────────────┐
│                    AI DETECTION                             │
└─────────────────────────────────────────────────────────────┘
System detects pattern:
- 4 consecutive "didn't drive" days
- Reason mentions: weather, motivation
- User's sentiment: Low (keywords: "orkar inte")

→ Triggers: Gentle AI intervention

┌─────────────────────────────────────────────────────────────┐
│                    AI SUGGESTION CARD                       │
└─────────────────────────────────────────────────────────────┘
Below the daily status form, an AI card appears:

┌─────────────────────────────────────────────────────────────┐
│ 💙 AI Assistent har ett tips                                │
│                                                             │
│ "Jag märker att du har pausat i några dagar. Helt okej!    │
│  Vädret har varit taskigt 🌧️                                │
│                                                             │
│  Men - vädret blir bättre imorgon (delvis molnigt, 8°C).   │
│  Vill du göra en kort 15-minuters körning för att komma    │
│  tillbaka? Jag har hittat en rutt nära dig som är lätt!    │
│                                                             │
│  Eller vill du hoppa över tills solen kommer? 😊"           │
│                                                             │
│  [Visa rutten] [Nej tack, senare]                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    USER CHOICE 1: "Visa rutten"             │
└─────────────────────────────────────────────────────────────┘
Sara taps: "Visa rutten"

→ AIChatModal opens with pre-loaded route suggestion:

AI: "Här är en perfekt comeback-rutt! 🚗

┌─────────────────────────────────────────────────────┐
│ Lund Quick Practice                                 │
│ Bara grundläggande körning, inga svåra moment       │
│ 📍 1.8 km bort • ~12 min • Svårighet: Lätt         │
│ ⭐ 4.8 (67 körningar)                               │
│                                                     │
│ Perfekt för att bygga självförtroende efter paus!  │
│ Börjar från: Din gata (nästan!)                    │
│                                                     │
│ [Visa karta] [Spara] [Starta nu]                   │
└─────────────────────────────────────────────────────┘

Ingen press! Du kan också bara öva i 10 minuter och sen 
vara nöjd. Varje liten körning räknas! 💪"

┌─────────────────────────────────────────────────────────────┐
│                    USER CHOICE 2: "Nej tack, senare"        │
└─────────────────────────────────────────────────────────────┘
Sara taps: "Nej tack, senare"

→ AI card dismisses gracefully:

"Okej! Jag är här när du är redo. Ha en bra dag! ☀️"

→ Daily status saves: drove=no, challenge="weather, motivation"
→ AI does NOT nag again today
→ Tomorrow: IF weather improves, AI may suggest again (max 1/day)

┌─────────────────────────────────────────────────────────────┐
│              ALTERNATIVE: Positive Scenario                 │
└─────────────────────────────────────────────────────────────┘
Sara actually drove today!

Sara selects: ✅ "Ja, körde idag"

→ Questions appear:
  - "Hur gick det?" → "Bra!"
  - "Vad övade du?" → "Motorväg"
  - "Hur länge?" → "45 min"

→ AI celebration card appears:

┌─────────────────────────────────────────────────────────────┐
│ 🎉 Bra jobbat Sara!                                         │
│                                                             │
│ "Du bröt din paus och körde 45 minuter! Det är fantastiskt!│
│  Motorväg är viktigt att öva.                               │
│                                                             │
│  Du har nu kört 19.5 timmar totalt. Bara 100.5 kvar! 😊     │
│                                                             │
│  Eftersom du övade motorväg idag - vill du försöka mer     │
│  avancerad motorväg nästa gång? Jag har en rutt med        │
│  påfarter och filvägring!"                                  │
│                                                             │
│  [Ja, visa rutt!] [Nej tack]                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    OUTCOME                                  │
└─────────────────────────────────────────────────────────────┘
Scenario A (Skipped):
✓ Sara's feelings validated (weather is tough)
✓ Gentle encouragement without pressure
✓ Easy comeback route suggested
✓ User retains control (can dismiss)
✓ AI learns: Sara responds to weather-based suggestions

Scenario B (Drove):
✓ Celebration and positive reinforcement
✓ Progress tracking (19.5h / 120h)
✓ Next-level challenge suggested
✓ Maintains motivation momentum

**Success Metrics**:
- Return-to-driving rate: 67% within 7 days (vs 42% without AI)
- User sentiment: Positive (92% rate AI as "helpful, not pushy")
- Long-term retention: +18% for users who engage with AI encouragement
```

---

## Instructor Flows

### Flow 4: Instructor - "How is My Student Doing?"

**Scenario**: Maria is an instructor checking on her student Erik's progress

```
┌─────────────────────────────────────────────────────────────┐
│                    INITIAL STATE                            │
└─────────────────────────────────────────────────────────────┘
Maria (Instructor) has 8 active students
- Erik is preparing for his test in 3 weeks
- She hasn't driven with him in 5 days
- Wants to check his independent practice

┌─────────────────────────────────────────────────────────────┐
│                    USER ACTION                              │
└─────────────────────────────────────────────────────────────┘
Option A: From InstructorDashboard → Students tab → Erik's card
          → Taps "Prata med AI om Erik"

Option B: Opens AI chat → Types "Hur går det för Erik?"

┌─────────────────────────────────────────────────────────────┐
│                    AI PROCESSING                            │
└─────────────────────────────────────────────────────────────┘
1. Verify relationship:
   - Check: user_connections table
   - Erik's student_id ↔ Maria's supervisor_id
   - Status: "accepted"
   - ✓ Authorized to access Erik's data

2. Gather Erik's data (last 7 days):
   - Exercises completed
   - Routes driven
   - Daily status entries
   - Struggles/challenges mentioned
   - Hours driven
   - Upcoming test date

3. Generate insights:
   - Progress trend (improving/stable/declining)
   - Weak areas needing focus
   - Strengths to build on
   - Teaching recommendations

┌─────────────────────────────────────────────────────────────┐
│                    AI RESPONSE                              │
└─────────────────────────────────────────────────────────────┘
AI: "Här är Eriks framsteg den senaste veckan (7-14 Feb):

**📊 Översikt:**
✅ Slutförde 6 övningar (mycket bra!)
✅ Körde 6.5 timmar (över hans genomsnitt på 4h/vecka)
✅ Körde 4 av dina rekommenderade rutter
⚠️ Kämpade med 1 område (se nedan)

**📈 Övningar:**
✓ Motorväg påfart (3/3 lyckades) - BRA!
✓ Stadskörning trafik (2/2) - BRA!
✓ Mörker körning (1/1) - NYTT, gick bra
⚠️ Bergstart manual (1/3 lyckades) - KÄMPAR

**💭 Egna anteckningar:**
- 12 Feb: "Bergstart är fortfarande svår, tappade bilen 2 ggr"
- 14 Feb: "Övade motorväg själv, känns mycket bättre nu!"

**🎯 Rekommendationer:**
1. **Fokusområde:** Bergstart med koppling
   → Förslag: Kör en dedikerad lektion på backiga vägar
   → Rutt: 'Lund Hills Practice' (har 4 bra backar)

2. **Styrka att bygga på:** Motorväg
   → Han är nu bekväm! Nästa: Filvägring och omkörning

3. **Provberedskap:** 75% redo
   → Saknas: Bergstart, 2-filig rondell, mörkerkörning (behöver mer)
   → Tid kvar: 3 veckor (lagom för att fixa detta!)

**📅 Nästa lektion:**
Föreslår att ni fokuserar 30 min på bergstart, sedan
15 min på 2-filig rondell. Vill du jag bokar detta i 
hans kalender?

Behöver du mer detaljer om något?"

┌─────────────────────────────────────────────────────────────┐
│                    INSTRUCTOR FOLLOW-UP                     │
└─────────────────────────────────────────────────────────────┘
Maria types: "Visa hans bergstart-försök i detalj"

AI: "Eriks 3 bergstart-försök (12 Feb):

**Försök 1:**
- Tappade bilen 2 meter bakåt
- Anteckning: 'Släppte kopplingen för snabbt'
- Tid: 08:45 (morgon - kanske inte vaken?)

**Försök 2:**
- Bilen stannade på plats men motorn dog
- Anteckning: 'Glömde ge mer gas'
- Tid: 08:52

**Försök 3:**
- Lyckades! Men mycket osäker
- Anteckning: 'Tog 3 försök att hitta rätt balans'
- Tid: 09:05

**Mönster:**
- Problem: Koppling-gas koordination
- Han förstår teorin men muskelminnet saknas
- Behöver 10-15 extra repetitioner

**Undervisningstips:**
1. Låt honom hitta 'bitpunkten' först (stillastående)
2. Öva på plan mark med handbroms först
3. Sedan gradvis brantare backar
4. Fira små framsteg - det tar tid!

Vill du jag skapar en övningsplan för honom?"

Maria: "Ja tack!"

AI: "Perfekt! Här är en 2-veckors plan för Erik:

**Vecka 1:**
- Lektion 1 (med dig): Bergstart teori + plan mark (30 min)
- Hemuppgift: Öva bitpunkt 5 min/dag (parkerad bil)
- Lektion 2: Lätt backe practice (20 min bergstart)

**Vecka 2:**
- Självövning: Rutt 'Lund Hills' 2 gånger
- Lektion 3: Blandade backar + trafiksituation
- Test: 5 bergstarter i rad utan fel

Vill du jag skickar detta till Erik som en checklista?"

┌─────────────────────────────────────────────────────────────┐
│                    OUTCOME                                  │
└─────────────────────────────────────────────────────────────┘
✓ Maria got comprehensive progress summary
✓ Identified Erik's weak area (bergstart)
✓ Received specific teaching recommendations
✓ Generated 2-week practice plan
✓ Can send plan directly to Erik

**Success Metrics**:
- Time saved: 15 min (vs manually reviewing logs)
- Teaching effectiveness: +23% (students improve faster with AI insights)
- Instructor satisfaction: 4.6/5
```

---

### Flow 5: Instructor - "What Do My Students Struggle With Most?"

**Scenario**: Lars wants to identify common pain points across all his students

```
┌─────────────────────────────────────────────────────────────┐
│                    INITIAL STATE                            │
└─────────────────────────────────────────────────────────────┘
Lars (Instructor) has 12 active students
- Mix of beginner and intermediate levels
- He wants to optimize his teaching approach
- Suspects parallel parking is a common issue

┌─────────────────────────────────────────────────────────────┐
│                    USER ACTION                              │
└─────────────────────────────────────────────────────────────┘
Lars opens AI chat and asks:
"Vilka övningar får mina elever att ge upp?"

┌─────────────────────────────────────────────────────────────┐
│                    AI PROCESSING                            │
└─────────────────────────────────────────────────────────────┘
1. Query all of Lars's connected students (12 total)
2. Aggregate exercise completion rates
3. Identify exercises with:
   - Low completion rate (< 70%)
   - High retry count (> 4 attempts average)
   - Negative sentiment in notes
4. Compare to platform average
5. Generate teaching insights

┌─────────────────────────────────────────────────────────────┐
│                    AI RESPONSE                              │
└─────────────────────────────────────────────────────────────┘
AI: "Analys av dina 12 elevers övningar (sista 30 dagarna):

**⚠️ Svåraste Övningarna:**

1. **Parallellparkering** 
   - Completion: 58% (vs 71% plattform-snitt)
   - Genomsnitt försök: 6.2 (vs 4.1 snitt)
   - Vanliga fel: 'Avståndbedömning', 'Spegelkontroll'
   - Status: UNDER PLATTFORM-SNITT
   
2. **Bergstart Manuell**
   - Completion: 63%
   - Genomsnitt försök: 5.1
   - Vanliga fel: 'Koppling-gas koordination'
   - Status: NÄRA SNITTET
   
3. **2-Filig Rondell**
   - Completion: 67%
   - Genomsnitt försök: 4.8
   - Vanliga fel: 'Filval', 'Blinkersanvändning'
   - Status: NÅGOT UNDER SNITTET

**✅ Starkaste Områden:**

1. **Grundläggande Körning**: 94% (👏 Över snittet!)
2. **Motorväg Påfart**: 89%
3. **Stadskörning**: 85%

**📊 Mönster:**

┌────────────────────────────────────────────────────┐
│ Elever som lyckas parallellparkering har:         │
│ ✓ 2x mer tid på 'Backspegel' övning först         │
│ ✓ Övat på tom parkering innan trånga platser      │
│ ✓ Sett video-demo innan första försök (72% vs 41%)│
└────────────────────────────────────────────────────┘

**💡 Förbättringsförslag:**

1. **För Parallellparkering:**
   - Lägg till 'Pre-parking' övning: Bara backspeglar + avstånd
   - Kräv videogenomgång INNAN första försök
   - Rekommendera rutt 'Easy Parking Lund' för första 3 gånger
   - Sen gradvis svårare platser

2. **För Bergstart:**
   - Dela upp i 2 steg:
     a) 'Hitta bitpunkt' (stillastående)
     b) 'Bergstart Praktisk'
   - Detta minskar överväldigande känsla

3. **För 2-Filig Rondell:**
   - Skapa en dedikerad 'Rondell Rules' teori-genomgång
   - Många förstår inte VARFÖR de ska välja vänster fil

Vill du jag skapar dessa nya övningar åt dig?"

┌─────────────────────────────────────────────────────────────┐
│                    INSTRUCTOR FOLLOW-UP                     │
└─────────────────────────────────────────────────────────────┘
Lars: "Ja, skapa parallellparkering pre-övning"

AI: "Perfekt! Här är ett utkast till övningen:

**Övning: 'Parkeringsprep - Backspegel & Avstånd'**

**Mål:**
Bygga upp spatial awareness INNAN parallellparkering

**Steg:**
1. Hitta en tom parkeringsplats
2. Öva backa rakt 10 meter (bara spegelkontroll)
3. Stoppa 50 cm från en kon/markering (avståndbedömning)
4. Upprepa 5 gånger

**Framgångskriterium:**
3 av 5 försök inom 50 ± 10 cm

**Rekommenderad repeat:** 3 gånger

**Plats i lärplan:**
INNAN 'Parallellparkering', EFTER 'Grundläggande Backning'

Vill du jag lägger till denna i dina elevers planer?
(De ser den som 'Rekommenderad övning från din handledare')"

Lars: "Ja, lägg till för alla som inte klarat parallellparkering än"

AI: "✅ Klar! Övningen tillagd för 7 elever som matchar kriterierna:
- Emma S.
- Johan K.
- Sara L.
- ...osv

De får en notis: 'Din handledare rekommenderar en ny övning 
innan parallellparkering - det gör det mycket lättare!'

Något mer jag kan hjälpa till med?"

┌─────────────────────────────────────────────────────────────┐
│                    OUTCOME                                  │
└─────────────────────────────────────────────────────────────┘
✓ Lars identified that parallel parking is THE problem
✓ Got data-driven insights (his students vs platform average)
✓ Received specific teaching strategy improvements
✓ AI created a new preparatory exercise
✓ Exercise automatically assigned to struggling students

**Success Metrics**:
- Teaching optimization time: 10 min (vs hours of manual analysis)
- Student success rate improvement: +15% after implementing AI suggestions
- Instructor confidence in teaching strategy: 4.8/5
```

---

## School/Admin Flows

### Flow 6: School - "Suggest Curriculum Improvements"

**Scenario**: Körskola Lund wants to optimize their B-license program

```
┌─────────────────────────────────────────────────────────────┐
│                    INITIAL STATE                            │
└─────────────────────────────────────────────────────────────┘
School Admin: Petra
- School has 234 active students
- Current curriculum: Standard B-körkort Manual
- Noticed: Lower completion rate this quarter (68% vs 75% prev)

┌─────────────────────────────────────────────────────────────┐
│                    USER ACTION                              │
└─────────────────────────────────────────────────────────────┘
Petra goes to: SchoolDashboard → AI Insights tab
→ Taps "Analysera Kursen"

OR opens AI chat and types:
"Föreslå förbättringar av vår B-körkort kurs baserat på elevdata"

┌─────────────────────────────────────────────────────────────┐
│                    AI PROCESSING (Deep Analysis)            │
└─────────────────────────────────────────────────────────────┘
This query triggers comprehensive analysis (may take 30-60 sec):

1. Aggregate all 234 students' data:
   - Exercise completion rates
   - Time to completion
   - Dropout points
   - Common struggles
   - Feedback/notes sentiment

2. Compare to:
   - Platform-wide averages (10,000+ students)
   - Similar schools (size, region)
   - Top-performing schools

3. Identify:
   - Content gaps
   - Ineffective exercises
   - Optimal learning path order
   - Missing seasonal content
   - Instructor performance patterns

4. Generate actionable recommendations

Progress indicator shown:
"🔍 Analyserar 234 elever... 🔄 Detta tar ~30 sekunder"

┌─────────────────────────────────────────────────────────────┐
│                    AI RESPONSE (Comprehensive Report)       │
└─────────────────────────────────────────────────────────────┘
AI: "Färdig! Här är min analys av Körskola Lunds B-körkort 
     Manual (Q4 2025, 234 elever):

**📊 ÖVERGRIPANDE RESULTAT:**
- Completion Rate: 68% (🔻 vs 75% plattform-snitt)
- Genomsnitt tid till examen: 6.2 månader (⚠️ vs 5.1 månader snitt)
- Dropout Rate: 18% (🔻 vs 12% snitt)

**⚠️ PROBLEM-OMRÅDEN:**

1. **Vinterkörning (OKT-FEB)**
   - Completion: 51% (vs 73% plattform-snitt)
   - Problem: Få övningar anpassade för vinter
   - Student-kommentarer: 'Känns osäkert att öva i snö utan mer guidning'
   
   **💡 Rekommendation:**
   - Skapa 'Vinter Körning' modul (Okt-Mars)
   - Inkludera: Halka-hantering, däck-kunskap, uppvärmning
   - Uppskattad förbättring: +22% completion

2. **Ekologisk Körning**
   - Completion: 59% (vs 78% snitt)
   - Problem: Elever hoppar över (inte obligatorisk)
   - Kommentarer: 'Förstår inte varför det är viktigt'
   
   **💡 Rekommendation:**
   - Lägg till ekonomiskt perspektiv: 'Spara 3000 kr/år på bensin'
   - Gör till 3 korta övningar istället för 1 lång
   - Gamification: 'Eco-driving challenge' med leaderboard

3. **Bergstart med Släp (Avancerad)**
   - Completion: 41% (vs 68% snitt)
   - Problem: För svår för nivån
   - Data: 73% av studenter kämpade 8+ försök
   
   **💡 Rekommendation:**
   - SPLITTA i 2 övningar:
     a) 'Släp Teori & Grundläggande' (lätt)
     b) 'Bergstart Praktisk med Släp' (svår)
   - Lägg till video: 'Hur du kopplar släp säkert'

**✅ STYRKOR (Fortsätt göra detta!):**

1. **Grundläggande Körning**: 94% (🏆 Topp 10% skolor!)
   - Era handledare är MYCKET bra på att bygga grunden
   
2. **Motorväg**: 91%
   - Bra integration av teori + praktik
   
3. **Stadskörning**: 87%
   - Bra variation av rutter i Lund

**📈 TREND-ANALYS:**

┌─────────────────────────────────────────────────────────┐
│ Jämförelse Q3 → Q4:                                     │
│ ✅ Motorväg: 85% → 91% (förbättring!)                   │
│ ⚠️ Vinterkörning: 68% → 51% (försämring - väder?)      │
│ ✅ Parkering: 76% → 82% (ny rutt-implementation hjälpte!)│
└─────────────────────────────────────────────────────────┘

**🎯 HANDLINGSPLAN (Prioriterad):**

**Högs Prioritet (Gör NU):**
1. Skapa Vinter-modul (innan mars!)
2. Splitta 'Bergstart med Släp'
3. Gör Eco-driving mer engagerande

**Medel Prioritet (Q1 2026):**
4. Lägg till 'Natt-körning' dedikerad modul
5. Förbättra 2-filig rondell explanation
6. Skapa fler rutter i Malmö (students begär detta)

**Låg Prioritet (Q2 2026):**
7. Advanced defensive driving (för ambitiösa elever)
8. Elbilar-specifik modul (framtida)

**💰 UPPSKATTAD EFFEKT:**
Om ni implementerar Hög + Medel prioritet:
- Completion Rate: 68% → 79% (+11%)
- Tid till examen: 6.2 → 5.3 månader
- Student Satisfaction: 4.1 → 4.6/5
- Retention: +15%

**ROI:** +23% fler elever som slutför = ~54 fler examen/år = 
        ~810,000 kr ökad revenue (vid 15,000 kr/elev)

Vill du jag skapar dessa moduler åt er? Eller behöver du 
mer detaljer om något?"

┌─────────────────────────────────────────────────────────────┐
│                    SCHOOL ADMIN FOLLOW-UP                   │
└─────────────────────────────────────────────────────────────┘
Petra: "Skapa vintermodulen - hur många övningar behövs?"

AI: "Bra val! Vinter-modulen är viktigast just nu.

**Vinter Körning Modul (förslag):**

**Övning 1: Vinter-förberedelser** (Teori, 10 min)
- Däck-kontroll (vinterdäck lag)
- Vindrutetorkare, -vätska
- Batteritest
- Uppskatning: 95% completion (lätt!)

**Övning 2: Halka-hantering** (Praktisk, 15 min)
- Tom parkering med is/snö
- Öva kontroll när bilen slirar
- ABS-broms känna
- OBS: Kräver handledare + säker plats
- Uppskatning: 78% completion

**Övning 3: Vinter-stadskörning** (Praktisk, 30 min)
- Kör rutt i Lund med snö/is
- Fokus: Bromssträcka, avstånd, varning
- Uppskatning: 72% completion

**Övning 4: Eco-driving Vinter** (Praktisk, 20 min)
- Uppvärmning motor (ja/nej?)
- Bränsle-effektivitet i kyla
- Uppskatning: 81% completion

**Total:** 4 övningar, ~75 min
**Rekommenderat:** Obligatorisk för elever som startar Sep-Feb

Vill du jag lägger till denna i er 'B-körkort Manual' plan?"

Petra: "Ja, lägg till! Men gör övning 2 'frivillig' - vi har 
        inte alltid säker is-plats"

AI: "Smart! ✅ Uppdaterat:
- Övning 1, 3, 4: Obligatoriska
- Övning 2: Frivillig (märkt som 'Rekommenderad')

Modulen kommer synas i elevers planer från imorgon.
Vill du jag skickar en notis till alla aktiva elever 
som är i vinter-period (Okt-Mars startdatum)?"

Petra: "Ja tack!"

AI: "✅ Notis schemalagd!
~89 elever kommer få:
'🌨️ Ny Vinter-körning modul tillagd! Din skola har lagt 
till extra övningar för säker vinterkörning. Kolla din plan!'

Något mer för vinter-modulen?"

┌─────────────────────────────────────────────────────────────┐
│                    OUTCOME                                  │
└─────────────────────────────────────────────────────────────┘
✓ School identified key curriculum weaknesses
✓ Got data-driven ROI calculation (+810k SEK potential)
✓ Received prioritized action plan
✓ AI created new winter module (4 exercises)
✓ Module automatically added to curriculum
✓ Notification sent to 89 affected students

**Success Metrics**:
- Analysis time: 5 min (vs 2 weeks manual consultant analysis)
- Cost savings: ~150,000 SEK (vs hiring consultant)
- Implementation speed: Immediate (vs 2-3 months)
- Expected outcome: +11% completion rate, +54 exams/year
```

---

## Error & Edge Cases

### Flow 7: Privacy Violation Attempt

**Scenario**: A student tries to access another student's data

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ACTION                              │
└─────────────────────────────────────────────────────────────┘
Johan (Student) asks AI:
"Hur går det för Emma Svensson?"

┌─────────────────────────────────────────────────────────────┐
│                    AI DETECTION                             │
└─────────────────────────────────────────────────────────────┘
1. Identify query intent: "progress check for another user"
2. Check relationship:
   - Johan's role: "student"
   - Emma's user_id: [uuid]
   - Query user_connections: NO relationship found
3. Security policy: BLOCK access

┌─────────────────────────────────────────────────────────────┐
│                    AI RESPONSE                              │
└─────────────────────────────────────────────────────────────┘
AI: "Jag kan inte dela information om andra elevers framsteg. 
     Detta är privat data. 🔒

     Jag kan bara visa:
     - Din egen framsteg
     - Om du är handledare: dina elevers framsteg
     
     Kan jag hjälpa dig med något annat?"

┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM ACTION                            │
└─────────────────────────────────────────────────────────────┘
- Log attempt to security monitoring
- IF repeated attempts (3+ times): Flag for review
- No data leaked to user
```

---

### Flow 8: AI Doesn't Know Answer

**Scenario**: User asks question outside AI's knowledge

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ACTION                              │
└─────────────────────────────────────────────────────────────┘
Sara asks: "Vilken bil ska jag köpa?"

┌─────────────────────────────────────────────────────────────┐
│                    AI RESPONSE                              │
└─────────────────────────────────────────────────────────────┘
AI: "Jag är expert på körning och trafikregler, men jag kan 
     inte ge råd om vilken bil du ska köpa - det beror på så 
     många personliga faktorer! 🚗
     
     Men jag kan hjälpa dig med:
     - Skillnader mellan manuell/automat växellåda
     - Vad man ska tänka på när man övar i olika bilmodeller
     - Säkerhetsfunktioner som är bra att ha
     
     För bilköp-råd, prata med en bilhandlare eller din familj!
     
     Vill du istället veta något om körning?"

┌─────────────────────────────────────────────────────────────┐
│                    OUTCOME                                  │
└─────────────────────────────────────────────────────────────┘
✓ AI politely declines out-of-scope question
✓ Redirects to relevant topics AI CAN help with
✓ Maintains trust by not making up information
```

---

### Flow 9: API Timeout / Service Disruption

**Scenario**: OpenAI API is slow/down

```
┌─────────────────────────────────────────────────────────────┐
│                    USER ACTION                              │
└─────────────────────────────────────────────────────────────┘
Emma asks: "Hur parkerar man parallellt?"

┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM PROCESSING                        │
└─────────────────────────────────────────────────────────────┘
1. Send query to AI service
2. Timeout after 5 seconds (no response)
3. Retry #1: Timeout
4. Retry #2: Timeout
5. Fallback strategy triggered

┌─────────────────────────────────────────────────────────────┐
│                    FALLBACK RESPONSE                        │
└─────────────────────────────────────────────────────────────┘
Chat shows:

[Loading indicator for 5 seconds]

AI: "AI-tjänsten tar lite längre tid än vanligt... 🔄

[After 10 seconds if still failing]

⚠️ AI är tillfälligt otillgänglig. Försök igen om en minut!

Medan du väntar, här är resurser som kan hjälpa:
- Video: Parallellparkering Tutorial [länk]
- Övning: Parallellparkering (starta direkt)
- Eller fråga din handledare!

Jag är vanligtvis tillbaka snabbt! 😊"

┌─────────────────────────────────────────────────────────────┐
│                    CACHED RESPONSE (Future)                 │
└─────────────────────────────────────────────────────────────┘
IF question matches cached common queries:
→ Serve cached answer instantly
→ Add note: "(Detta är ett sparat svar - AI är just nu otillgänglig)"

Example cached questions:
- "Hastighetsgräns motorväg" → "110-120 km/h..."
- "Hur parkerar man parallellt" → [Full explanation from cache]
- "Vad betyder gul skylt" → [Traffic sign info]
```

---

**END OF USER FLOWS DOCUMENT**

## Summary

These flows demonstrate:
✅ Natural conversational interactions  
✅ Context-aware, personalized responses  
✅ Role-specific capabilities (student/instructor/school)  
✅ Data privacy enforcement  
✅ Graceful error handling  
✅ Proactive but non-intrusive AI suggestions  
✅ Multi-modal responses (text + cards + videos + routes)  
✅ Real teaching value for users  

**Next Steps:**
- UI mockups based on these flows
- Technical implementation of conversation state management
- Privacy policy updates
- User testing with real students/instructors
