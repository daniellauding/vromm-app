# Repeat Progress Implementation for Web Project

## Overview
Add visual progress indicators for exercises with repeats to improve UX and gamification.

## 1. Add Progress Calculation Function

```javascript
const getRepeatProgress = (exercise) => {
  // Skip if no repeats
  if (!exercise.repeat_count || exercise.repeat_count <= 1) {
    return { completed: 0, total: 0, percent: 0 };
  }

  const total = exercise.repeat_count;
  let completed = 0;

  // Check main exercise (repeat 1)
  if (completedExercises.includes(exercise.id)) {
    completed++;
  }

  // Check virtual repeats (repeat 2+)
  for (let i = 2; i <= total; i++) {
    const virtualId = `${exercise.id}-virtual-${i}`;
    if (virtualRepeatCompletions.includes(virtualId)) {
      completed++;
    }
  }

  const percent = total > 0 ? completed / total : 0;
  return { completed, total, percent };
};
```

## 2. Create Progress Bar Component

```javascript
const RepeatProgressBar = ({ exercise }) => {
  const { completed, total, percent } = getRepeatProgress(exercise);
  
  if (total <= 1) return null;

  return (
    <div className="repeat-progress">
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${percent * 100}%` }}
        />
      </div>
      <span className="progress-text">{completed}/{total}</span>
    </div>
  );
};
```

## 3. Add CSS Styles

```css
.repeat-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.progress-bar {
  width: 60px;
  height: 4px;
  background-color: #333;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #00e6c3;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 10px;
  color: #888;
}
```

## 4. Usage in Components

### Exercise List Items
```javascript
// In your exercise list rendering
<div className="exercise-card">
  <h3>{exercise.title}</h3>
  <p>{exercise.description}</p>
  <RepeatProgressBar exercise={exercise} />
</div>
```

### Exercise Detail View
```javascript
// In exercise detail page, after "All Repetitions" header
<div className="all-repetitions">
  <h3>All Repetitions</h3>
  <RepeatProgressBar exercise={selectedExercise} />
  {/* Rest of repetition list */}
</div>
```

## 5. State Management

Ensure your state includes:
- `completedExercises`: Array of completed exercise IDs
- `virtualRepeatCompletions`: Array of virtual repeat IDs (format: "exerciseId-virtual-2")

## 6. Database Integration

No changes needed to existing Supabase setup:
- Main exercises use `learning_path_exercise_completions`
- Virtual repeats use `virtual_repeat_completions`

## Result
✅ Visual progress bars on exercise cards  
✅ Progress display in exercise detail view  
✅ Real-time updates when marking complete  
✅ Simple gamification with minimal UI 