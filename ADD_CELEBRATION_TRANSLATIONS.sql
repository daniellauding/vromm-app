-- Add celebration modal translations
-- This script adds motivational messages and UI text for the celebration modal

BEGIN;

-- First, delete any existing celebration translations to avoid conflicts
DELETE FROM public.translations WHERE key LIKE 'celebration.%';

-- Insert celebration translations for English Mobile
INSERT INTO public.translations (key, language, value, platform) VALUES
-- Path completion messages
('celebration.pathCompleted.title', 'en', 'Path Completed! 🎉', 'mobile'),
('celebration.pathCompleted.message', 'en', 'Amazing work! You''ve mastered this learning path.', 'mobile'),
('celebration.almostThere.title', 'en', 'Almost There! 🔥', 'mobile'),
('celebration.almostThere.message', 'en', 'You''re so close to completing this path!', 'mobile'),
('celebration.greatProgress.title', 'en', 'Great Progress! 💪', 'mobile'),
('celebration.greatProgress.message', 'en', 'You''re making excellent progress!', 'mobile'),
('celebration.keepGoing.title', 'en', 'Keep Going! 🚀', 'mobile'),
('celebration.keepGoing.message', 'en', 'Every step counts! You''re doing great!', 'mobile'),
-- UI elements
('celebration.progress', 'en', 'Progress', 'mobile'),
('celebration.exercisesCompleted', 'en', 'exercises completed', 'mobile'),
('celebration.minutes', 'en', 'min', 'mobile'),
('celebration.days', 'en', 'days', 'mobile'),
('celebration.continue', 'en', 'Continue', 'mobile'),
('celebration.nextPath', 'en', 'Next Path', 'mobile'),
-- Weekly goal celebrations
('celebration.perfectWeek.title', 'en', 'Perfect Week! 🏆', 'mobile'),
('celebration.perfectWeek.message', 'en', 'You completed all 7 days! Amazing dedication!', 'mobile'),
('celebration.weeklyGoal.title', 'en', 'Weekly Goal Achieved! 🎯', 'mobile'),
('celebration.weeklyGoal.message', 'en', 'Great job! You reached your weekly target!', 'mobile'),
('celebration.exerciseMilestone.title', 'en', 'Exercise Milestone! 💪', 'mobile'),
('celebration.exerciseMilestone.message', 'en', 'Amazing! You completed so many exercises!', 'mobile')
ON CONFLICT (key, language) DO UPDATE SET 
  value = EXCLUDED.value,
  platform = EXCLUDED.platform,
  updated_at = NOW();

-- Insert celebration translations for English Web
INSERT INTO public.translations (key, language, value, platform) VALUES
-- Path completion messages
('celebration.pathCompleted.title', 'en', 'Path Completed! 🎉', 'web'),
('celebration.pathCompleted.message', 'en', 'Amazing work! You''ve mastered this learning path.', 'web'),
('celebration.almostThere.title', 'en', 'Almost There! 🔥', 'web'),
('celebration.almostThere.message', 'en', 'You''re so close to completing this path!', 'web'),
('celebration.greatProgress.title', 'en', 'Great Progress! 💪', 'web'),
('celebration.greatProgress.message', 'en', 'You''re making excellent progress!', 'web'),
('celebration.keepGoing.title', 'en', 'Keep Going! 🚀', 'web'),
('celebration.keepGoing.message', 'en', 'Every step counts! You''re doing great!', 'web'),
-- UI elements
('celebration.progress', 'en', 'Progress', 'web'),
('celebration.exercisesCompleted', 'en', 'exercises completed', 'web'),
('celebration.minutes', 'en', 'min', 'web'),
('celebration.days', 'en', 'days', 'web'),
('celebration.continue', 'en', 'Continue', 'web'),
('celebration.nextPath', 'en', 'Next Path', 'web'),
-- Weekly goal celebrations
('celebration.perfectWeek.title', 'en', 'Perfect Week! 🏆', 'web'),
('celebration.perfectWeek.message', 'en', 'You completed all 7 days! Amazing dedication!', 'web'),
('celebration.weeklyGoal.title', 'en', 'Weekly Goal Achieved! 🎯', 'web'),
('celebration.weeklyGoal.message', 'en', 'Great job! You reached your weekly target!', 'web'),
('celebration.exerciseMilestone.title', 'en', 'Exercise Milestone! 💪', 'web'),
('celebration.exerciseMilestone.message', 'en', 'Amazing! You completed so many exercises!', 'web')
ON CONFLICT (key, language) DO UPDATE SET 
  value = EXCLUDED.value,
  platform = EXCLUDED.platform,
  updated_at = NOW();

-- Insert celebration translations for Swedish Mobile
INSERT INTO public.translations (key, language, value, platform) VALUES
-- Path completion messages
('celebration.pathCompleted.title', 'sv', 'Bana Klar! 🎉', 'mobile'),
('celebration.pathCompleted.message', 'sv', 'Fantastiskt jobb! Du har bemästrat denna lärbana.', 'mobile'),
('celebration.almostThere.title', 'sv', 'Nästan Klar! 🔥', 'mobile'),
('celebration.almostThere.message', 'sv', 'Du är så nära att slutföra denna bana!', 'mobile'),
('celebration.greatProgress.title', 'sv', 'Bra Framsteg! 💪', 'mobile'),
('celebration.greatProgress.message', 'sv', 'Du gör utmärkt framsteg!', 'mobile'),
('celebration.keepGoing.title', 'sv', 'Fortsätt! 🚀', 'mobile'),
('celebration.keepGoing.message', 'sv', 'Varje steg räknas! Du gör det bra!', 'mobile'),
-- UI elements
('celebration.progress', 'sv', 'Framsteg', 'mobile'),
('celebration.exercisesCompleted', 'sv', 'övningar slutförda', 'mobile'),
('celebration.minutes', 'sv', 'min', 'mobile'),
('celebration.days', 'sv', 'dagar', 'mobile'),
('celebration.continue', 'sv', 'Fortsätt', 'mobile'),
('celebration.nextPath', 'sv', 'Nästa Bana', 'mobile'),
-- Weekly goal celebrations
('celebration.perfectWeek.title', 'sv', 'Perfekt Vecka! 🏆', 'mobile'),
('celebration.perfectWeek.message', 'sv', 'Du slutförde alla 7 dagar! Fantastisk hängivenhet!', 'mobile'),
('celebration.weeklyGoal.title', 'sv', 'Veckomål Uppnått! 🎯', 'mobile'),
('celebration.weeklyGoal.message', 'sv', 'Bra jobbat! Du nådde ditt veckliga mål!', 'mobile'),
('celebration.exerciseMilestone.title', 'sv', 'Övningsmilestone! 💪', 'mobile'),
('celebration.exerciseMilestone.message', 'sv', 'Fantastiskt! Du slutförde så många övningar!', 'mobile')
ON CONFLICT (key, language) DO UPDATE SET 
  value = EXCLUDED.value,
  platform = EXCLUDED.platform,
  updated_at = NOW();

-- Insert celebration translations for Swedish Web
INSERT INTO public.translations (key, language, value, platform) VALUES
-- Path completion messages
('celebration.pathCompleted.title', 'sv', 'Bana Klar! 🎉', 'web'),
('celebration.pathCompleted.message', 'sv', 'Fantastiskt jobb! Du har bemästrat denna lärbana.', 'web'),
('celebration.almostThere.title', 'sv', 'Nästan Klar! 🔥', 'web'),
('celebration.almostThere.message', 'sv', 'Du är så nära att slutföra denna bana!', 'web'),
('celebration.greatProgress.title', 'sv', 'Bra Framsteg! 💪', 'web'),
('celebration.greatProgress.message', 'sv', 'Du gör utmärkt framsteg!', 'web'),
('celebration.keepGoing.title', 'sv', 'Fortsätt! 🚀', 'web'),
('celebration.keepGoing.message', 'sv', 'Varje steg räknas! Du gör det bra!', 'web'),
-- UI elements
('celebration.progress', 'sv', 'Framsteg', 'web'),
('celebration.exercisesCompleted', 'sv', 'övningar slutförda', 'web'),
('celebration.minutes', 'sv', 'min', 'web'),
('celebration.days', 'sv', 'dagar', 'web'),
('celebration.continue', 'sv', 'Fortsätt', 'web'),
('celebration.nextPath', 'sv', 'Nästa Bana', 'web'),
-- Weekly goal celebrations
('celebration.perfectWeek.title', 'sv', 'Perfekt Vecka! 🏆', 'web'),
('celebration.perfectWeek.message', 'sv', 'Du slutförde alla 7 dagar! Fantastisk hängivenhet!', 'web'),
('celebration.weeklyGoal.title', 'sv', 'Veckomål Uppnått! 🎯', 'web'),
('celebration.weeklyGoal.message', 'sv', 'Bra jobbat! Du nådde ditt veckliga mål!', 'web'),
('celebration.exerciseMilestone.title', 'sv', 'Övningsmilestone! 💪', 'web'),
('celebration.exerciseMilestone.message', 'sv', 'Fantastiskt! Du slutförde så många övningar!', 'web')
ON CONFLICT (key, language) DO UPDATE SET 
  value = EXCLUDED.value,
  platform = EXCLUDED.platform,
  updated_at = NOW();

COMMIT;
