# Learning Content Generator Agent

## Purpose
Generate comprehensive learning path exercises and content for the Vromm driving education platform.

## Agent Configuration

```yaml
name: learning-content-generator
description: Generates driving education exercises with descriptions, repeat counts, and YouTube suggestions
tools:
  - database_query
  - content_generation
  - translation
```

## Usage

### 1. Generate Missing Content
```bash
claude-code --agent learning-content-generator generate-missing-content
```

### 2. Enhance Existing Exercises
```bash
claude-code --agent learning-content-generator enhance-exercises --path-id="6b4856cf-77fc-4e62-a7bd-224221dcf4ce"
```

### 3. Create New Exercises for Category
```bash
claude-code --agent learning-content-generator create-exercises --category="night-driving" --count=5
```

## Agent Prompts

### Exercise Enhancement Prompt
```
You are a driving instructor creating educational content. For each exercise:

1. Write comprehensive descriptions in both English and Swedish
2. Assign appropriate repeat counts (1-10 based on skill complexity)
3. Suggest YouTube search terms or video concepts
4. Ensure content matches the target audience (beginner/intermediate/advanced)

Input: Exercise data with learning path context
Output: Enhanced exercise with rich content

Categories to consider:
- Vehicle type: Car, Motorcycle, Truck
- Experience level: Beginner, Intermediate, Advanced
- Transmission: Manual, Automatic
- Purpose: Test prep, Defensive driving, Eco-driving
```

### Random Content Generation Prompt
```
Generate new driving exercises for underrepresented categories:

1. Identify gaps in current content
2. Create seasonally relevant exercises
3. Focus on practical skills missing from curriculum
4. Include both basic and advanced variations

Target: 5-10 new exercises per run
Focus: Safety, practical skills, test preparation
```

## Database Integration

### Queries Needed
```sql
-- Find exercises with minimal descriptions
SELECT * FROM learning_path_exercises 
WHERE length(description->>'en') < 50 OR description->>'en' IS NULL;

-- Get learning path context
SELECT lp.title, lp.description, lp.vehicle_type, lp.experience_level
FROM learning_paths lp
JOIN learning_path_exercises lpe ON lp.id = lpe.learning_path_id
WHERE lpe.id = ?;

-- Insert generated content
UPDATE learning_path_exercises 
SET description = ?, repeat_count = ?, youtube_url = ?
WHERE id = ?;
```

### Content Structure
```json
{
  "title": {
    "en": "Enhanced Exercise Title",
    "sv": "Förbättrad Övningstitel"
  },
  "description": {
    "en": "Detailed description of what student will learn and practice...",
    "sv": "Detaljerad beskrivning av vad eleven ska lära sig och öva..."
  },
  "repeat_count": 5,
  "youtube_search_terms": "parallel parking tutorial manual transmission",
  "difficulty_indicators": ["clutch control", "spatial awareness"],
  "safety_focus": ["mirror checks", "blind spot awareness"]
}
```

## Automation Setup

### N8N Workflow
```yaml
trigger: webhook or schedule
steps:
  1. Query database for content gaps
  2. Call Claude Code agent
  3. Process generated content
  4. Update database
  5. Notify admin of changes
```

### Admin Panel Integration
```javascript
// Add button to learning path admin
<button onclick="generateContent(learningPathId)">
  Generate Missing Content
</button>

// API endpoint
POST /api/admin/generate-content
{
  "learning_path_id": "uuid",
  "exercise_count": 5,
  "focus_areas": ["descriptions", "youtube_urls", "repeat_counts"]
}
```

## Content Quality Guidelines

### Descriptions
- 50-150 words per description
- Focus on learning objectives
- Include safety aspects
- Mention specific techniques
- Use encouraging, instructional tone

### Repeat Counts
- Basic skills (seat adjustment): 2-3 repeats
- Motor skills (clutch control): 5-8 repeats  
- Complex maneuvers (parallel parking): 3-5 repeats
- Safety checks: 2-4 repeats

### YouTube Integration
- Generate specific search terms
- Suggest video duration preferences
- Include equipment/setup requirements
- Match content to vehicle type and transmission

## Implementation Steps

1. **Phase 1**: Create agent and test with sample data
2. **Phase 2**: Integrate with existing database
3. **Phase 3**: Add admin panel controls
4. **Phase 4**: Implement automated content generation
5. **Phase 5**: Add content quality monitoring

## Content Categories to Generate

### High Priority
- Night driving exercises
- Weather condition adaptations
- Advanced maneuvering techniques
- Emergency response procedures

### Medium Priority  
- Eco-driving techniques
- Vehicle maintenance awareness
- Route planning skills
- Passenger management

### Low Priority
- Entertainment system operation
- Advanced comfort settings
- Vehicle personalization
- Technology integration

## Monitoring and Quality Control

### Metrics to Track
- Content generation success rate
- Exercise completion rates
- Student feedback on descriptions
- Instructor adoption of generated content

### Quality Checks
- Translation accuracy (EN/SV)
- Technical correctness
- Age-appropriate language
- Safety compliance