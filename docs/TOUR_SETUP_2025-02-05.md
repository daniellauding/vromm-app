# Tour Content Setup - 2025-02-05

## Overview

This document contains the SQL to set up tour content in the Supabase database. The tours use auto-press actions to simulate user interactions during the guided tour.

## Included Tours

| Tour | Steps | Description |
|------|-------|-------------|
| HomeScreen | 10 | Welcome, weekly goals, daily status, map preview, progress, routes, create |
| ProgressScreen | 10 | Learning paths, exercises, video, steps, checkbox, repeats, filters |
| MapScreen | 6 | Map markers, location, routes drawer, record button |
| RouteDetailSheet | 7 | Overview, map, exercises, mark driven, navigate, save, review |
| LearningPathsSheet | 5 | Browse paths, filter, progress, locked paths, select |
| ExerciseListSheet | 8 | Video, exercise cards, checkbox, open exercise, repeats, quiz |
| ExerciseDetail | 6 | Video, description, steps, complete, repeat, quiz |
| MenuTab | 3 | Profile, connections, settings |
| **CreateRouteSheet** | 9 | Route creation: name, location, waypoints, difficulty, exercises, media, save |
| **RecordDrivingSheet** | 8 | Recording: start, live stats, map preview, pause, minimize, stop, create |

## How to Run

### Option 1: Run Migration via Supabase CLI

```bash
cd /Users/daniellauding/Work/instinctly/internal/vromm/vromm-app
supabase db push
```

### Option 2: Copy/Paste to Supabase SQL Editor

Copy the SQL below and run it in your Supabase dashboard SQL editor.

---

## Complete SQL

```sql
-- ============================================================================
-- TOUR CONTENT SETUP
-- Date: 2025-02-05
-- Description: Sets up tour content in the database with auto-press actions
-- ============================================================================

-- ============================================================================
-- 1. Create user_tour_completions table (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_tour_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_tours TEXT[] DEFAULT '{}',
    last_tour_completed TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.user_tour_completions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own tour completions" ON public.user_tour_completions;
DROP POLICY IF EXISTS "Users can insert own tour completions" ON public.user_tour_completions;
DROP POLICY IF EXISTS "Users can update own tour completions" ON public.user_tour_completions;

-- RLS Policies
CREATE POLICY "Users can view own tour completions"
    ON public.user_tour_completions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tour completions"
    ON public.user_tour_completions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tour completions"
    ON public.user_tour_completions FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 2. Add tour fields to profiles table (if not exist)
-- ============================================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS tour_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tour_content_hash TEXT;

-- ============================================================================
-- 3. Delete existing tour content (clean slate)
-- ============================================================================
DELETE FROM public.content WHERE content_type = 'tour';

-- ============================================================================
-- 4. HOME SCREEN TOUR (10 steps)
-- ============================================================================
INSERT INTO public.content (key, content_type, platforms, title, body, order_index, active, metadata)
VALUES
('tour.screen.HomeScreen.home-welcome', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Welcome to Vromm!", "sv": "Välkommen till Vromm!"}'::jsonb,
 '{"en": "This is your home screen. Explore routes, track progress, and connect with instructors.", "sv": "Detta är din hemskärm. Utforska rutter, följ framsteg och koppla samman med handledare."}'::jsonb,
 1, true,
 '{"targetElement": null, "position": "center", "targetScreen": "HomeScreen"}'::jsonb),

('tour.screen.HomeScreen.home-weekly-goal', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Weekly Goals", "sv": "Veckomål"}'::jsonb,
 '{"en": "Set goals for the week and see your progress. Practice regularly for best results!", "sv": "Sätt mål för veckan och se hur du ligger till. Öva regelbundet för bästa resultat!"}'::jsonb,
 2, true,
 '{"targetElement": "HomeScreen.WeeklyGoal", "position": "bottom", "targetScreen": "HomeScreen", "scrollToElement": true}'::jsonb),

('tour.screen.HomeScreen.home-daily-status', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Daily Activity", "sv": "Daglig Aktivitet"}'::jsonb,
 '{"en": "See your activity day by day. Tap a day to see what you practiced!", "sv": "Se din aktivitet dag för dag. Tryck på en dag för att se vad du övade!"}'::jsonb,
 3, true,
 '{"targetElement": "HomeScreen.DailyStatus", "position": "bottom", "targetScreen": "HomeScreen"}'::jsonb),

('tour.screen.HomeScreen.home-map-preview', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Map & Routes", "sv": "Karta & Rutter"}'::jsonb,
 '{"en": "Quick look at the map with routes near you. Tap to explore more!", "sv": "Snabbtitt på kartan med rutter nära dig. Tryck för att utforska fler!"}'::jsonb,
 4, true,
 '{"targetElement": "HomeScreen.MapPreview", "position": "top", "targetScreen": "HomeScreen", "scrollToElement": true}'::jsonb),

('tour.screen.HomeScreen.home-progress', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Your Progress", "sv": "Din Framsteg"}'::jsonb,
 '{"en": "Track your total progress in the driving license plan here.", "sv": "Följ din totala framsteg i körkortsplanen här."}'::jsonb,
 5, true,
 '{"targetElement": "HomeScreen.ProgressSection", "position": "top", "targetScreen": "HomeScreen", "scrollToElement": true}'::jsonb),

('tour.screen.HomeScreen.home-saved-routes', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Saved Routes", "sv": "Sparade Rutter"}'::jsonb,
 '{"en": "Your favorites and saved practice routes collected in one place.", "sv": "Dina favoriter och sparade övningsrutter samlade på ett ställe."}'::jsonb,
 6, true,
 '{"targetElement": "HomeScreen.SavedRoutes", "position": "top", "targetScreen": "HomeScreen", "scrollToElement": true}'::jsonb),

('tour.screen.HomeScreen.home-driven-routes', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Driven Routes", "sv": "Körda Rutter"}'::jsonb,
 '{"en": "Routes you have marked as driven. Great for tracking your completed sessions!", "sv": "Rutter du markerat som körda. Bra för att följa dina genomförda pass!"}'::jsonb,
 7, true,
 '{"targetElement": "HomeScreen.DrivenRoutes", "position": "top", "targetScreen": "HomeScreen"}'::jsonb),

('tour.screen.HomeScreen.home-nearby-routes', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Discover Routes", "sv": "Upptäck Rutter"}'::jsonb,
 '{"en": "Find practice routes created by the community near your location.", "sv": "Hitta övningsrutter skapade av communityn nära din plats."}'::jsonb,
 8, true,
 '{"targetElement": "HomeScreen.NearbyRoutes", "position": "top", "targetScreen": "HomeScreen", "scrollToElement": true}'::jsonb),

('tour.screen.HomeScreen.home-create', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Create Routes", "sv": "Skapa Rutter"}'::jsonb,
 '{"en": "Tap the plus button to create your own practice routes and share with others.", "sv": "Tryck på plus-knappen för att skapa egna övningsrutter och dela med andra."}'::jsonb,
 9, true,
 '{"targetElement": "CreateRouteTab", "position": "top", "targetScreen": "HomeScreen"}'::jsonb),

('tour.screen.HomeScreen.home-go-progress', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Tap Progress! 👆", "sv": "Tryck på Framsteg! 👆"}'::jsonb,
 '{"en": "Tap the highlighted Progress tab below to continue!", "sv": "Tryck på den markerade fliken Framsteg i navigeringen nedanför för att fortsätta!"}'::jsonb,
 10, true,
 '{"targetElement": "ProgressTab", "position": "top", "targetScreen": "HomeScreen", "action": {"type": "navigate", "target": "ProgressTab"}}'::jsonb);

-- ============================================================================
-- 5. PROGRESS SCREEN TOUR (10 steps with auto-press)
-- ============================================================================
INSERT INTO public.content (key, content_type, platforms, title, body, order_index, active, metadata)
VALUES
('tour.screen.ProgressScreen.progress-welcome', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Welcome to Progress! 📚", "sv": "Välkommen till Framsteg! 📚"}'::jsonb,
 '{"en": "Here you follow your driving journey. Complete exercises and see how close you are to your goal!", "sv": "Här följer du din körkortsresa. Genomför övningar och se hur nära du är målet!"}'::jsonb,
 1, true,
 '{"targetElement": null, "position": "center", "targetScreen": "ProgressScreen"}'::jsonb),

('tour.screen.ProgressScreen.progress-learning-paths', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Opening Learning Path... 👆", "sv": "Öppnar Körkortsplan... 👆"}'::jsonb,
 '{"en": "We are automatically opening the first learning path to show you the exercises.", "sv": "Vi öppnar den första körkortsplanen automatiskt för att visa dig övningarna."}'::jsonb,
 2, true,
 '{"targetElement": "ProgressScreen.FirstPath", "position": "bottom", "targetScreen": "ProgressScreen", "action": {"type": "press", "target": "ProgressScreen.FirstPath", "delay": 500}}'::jsonb),

('tour.screen.ProgressScreen.progress-path-detail', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Learning Path Exercises", "sv": "Körkortsplanens Övningar"}'::jsonb,
 '{"en": "Here you can see all exercises in the plan. Press an exercise to see details!", "sv": "Här ser du alla övningar i planen. Tryck på en övning för att se detaljerna!"}'::jsonb,
 3, true,
 '{"targetElement": null, "position": "center", "targetScreen": "ProgressScreen", "preAction": {"type": "waitFor", "delay": 800}}'::jsonb),

('tour.screen.ProgressScreen.progress-first-exercise', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Opening Exercise... 📝", "sv": "Öppnar Övning... 📝"}'::jsonb,
 '{"en": "We show you an exercise with video, instructions, and the ability to check off!", "sv": "Vi visar dig en övning med video, instruktioner och möjlighet att bocka av!"}'::jsonb,
 4, true,
 '{"targetElement": "ProgressScreen.FirstExercise", "position": "bottom", "targetScreen": "ProgressScreen", "action": {"type": "press", "target": "ProgressScreen.FirstExercise", "delay": 500}}'::jsonb),

('tour.screen.ProgressScreen.progress-exercise-video', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Video Tutorial 🎬", "sv": "Videohandledning 🎬"}'::jsonb,
 '{"en": "Watch the video to see how the exercise should be performed. Pause and rewind!", "sv": "Titta på videon för att se hur övningen ska utföras. Pausa och spola tillbaka!"}'::jsonb,
 5, true,
 '{"targetElement": "ExerciseDetail.VideoPlayer", "position": "bottom", "targetScreen": "ProgressScreen", "preAction": {"type": "waitFor", "delay": 600}}'::jsonb),

('tour.screen.ProgressScreen.progress-exercise-steps', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Step by Step", "sv": "Steg för Steg"}'::jsonb,
 '{"en": "Follow the instructions step by step. Press each step for more info!", "sv": "Följ instruktionerna steg för steg. Tryck på varje steg för att se mer info!"}'::jsonb,
 6, true,
 '{"targetElement": "ExerciseDetail.StepsSection", "position": "top", "targetScreen": "ProgressScreen", "scrollToElement": true}'::jsonb),

('tour.screen.ProgressScreen.progress-exercise-checkbox', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Check Off! ✅", "sv": "Bocka Av! ✅"}'::jsonb,
 '{"en": "We check off the exercise automatically to show you how it works!", "sv": "Vi bockar av övningen automatiskt för att visa hur det fungerar!"}'::jsonb,
 7, true,
 '{"targetElement": "ExerciseDetail.Checkbox", "position": "top", "targetScreen": "ProgressScreen", "action": {"type": "press", "target": "ExerciseDetail.Checkbox", "delay": 500}}'::jsonb),

('tour.screen.ProgressScreen.progress-exercise-repeats', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Repetitions", "sv": "Repetitioner"}'::jsonb,
 '{"en": "Some exercises require multiple repetitions. Complete all for the best results!", "sv": "Vissa övningar kräver flera repetitioner. Gör alla för bästa resultat!"}'::jsonb,
 8, true,
 '{"targetElement": "ExerciseDetail.RepeatSection", "position": "top", "targetScreen": "ProgressScreen", "scrollToElement": true}'::jsonb),

('tour.screen.ProgressScreen.progress-filters', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Filter Options", "sv": "Filteralternativ"}'::jsonb,
 '{"en": "Use filters to find learning paths that match your car and experience level.", "sv": "Använd filter för att hitta körkortsplaner som matchar din bil och erfarenhetsnivå."}'::jsonb,
 9, true,
 '{"targetElement": "ProgressScreen.FilterButton", "position": "bottom", "targetScreen": "ProgressScreen"}'::jsonb),

('tour.screen.ProgressScreen.progress-go-map', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Tap Map! 🗺️", "sv": "Tryck på Karta! 🗺️"}'::jsonb,
 '{"en": "Tap the highlighted Map tab to find practice routes in your area!", "sv": "Tryck på den markerade fliken Karta för att hitta övningsrutter i ditt område!"}'::jsonb,
 10, true,
 '{"targetElement": "MapTab", "position": "top", "targetScreen": "ProgressScreen", "action": {"type": "navigate", "target": "MapTab"}}'::jsonb);

-- ============================================================================
-- 6. MAP SCREEN TOUR (6 steps)
-- ============================================================================
INSERT INTO public.content (key, content_type, platforms, title, body, order_index, active, metadata)
VALUES
('tour.screen.MapScreen.map-welcome', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Welcome to the Map! 🗺️", "sv": "Välkommen till Kartan! 🗺️"}'::jsonb,
 '{"en": "Find practice routes near you on the interactive map.", "sv": "Hitta övningsrutter nära dig på den interaktiva kartan."}'::jsonb,
 1, true,
 '{"targetElement": null, "position": "center", "targetScreen": "MapScreen"}'::jsonb),

('tour.screen.MapScreen.map-markers', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Route Markers", "sv": "Ruttmarkörer"}'::jsonb,
 '{"en": "Each marker on the map is a practice route. Tap one to see details!", "sv": "Varje markör på kartan är en övningsrutt. Tryck på en för att se detaljer!"}'::jsonb,
 2, true,
 '{"targetElement": null, "position": "center", "targetScreen": "MapScreen"}'::jsonb),

('tour.screen.MapScreen.map-locate', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Your Location", "sv": "Din Position"}'::jsonb,
 '{"en": "Tap here to center the map on your current location.", "sv": "Tryck här för att centrera kartan på din nuvarande plats."}'::jsonb,
 3, true,
 '{"targetElement": "MapScreen.LocateButton", "position": "top", "targetScreen": "MapScreen"}'::jsonb),

('tour.screen.MapScreen.map-routes-drawer', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Route List", "sv": "Ruttlista"}'::jsonb,
 '{"en": "Swipe up to see all available routes. Tap to open details!", "sv": "Svep uppåt för att se alla tillgängliga rutter. Tryck för att öppna detaljer!"}'::jsonb,
 4, true,
 '{"targetElement": "MapScreen.RoutesDrawer", "position": "top", "targetScreen": "MapScreen"}'::jsonb),

('tour.screen.MapScreen.map-record', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Record Driving", "sv": "Spela In Körning"}'::jsonb,
 '{"en": "Use the record button to record your driving sessions and save as a route.", "sv": "Använd inspelningsknappen för att spela in dina körpass och spara som rutt."}'::jsonb,
 5, true,
 '{"targetElement": "MapScreen.RecordButton", "position": "top", "targetScreen": "MapScreen"}'::jsonb),

('tour.screen.MapScreen.map-complete', 'tour', ARRAY['mobile', 'both'],
 '{"en": "You are ready! 🎉", "sv": "Du är redo! 🎉"}'::jsonb,
 '{"en": "Now you know the basics! Start exploring routes, practice, and track your progress. Good luck!", "sv": "Nu vet du grunderna! Börja utforska rutter, öva och följ dina framsteg. Lycka till!"}'::jsonb,
 6, true,
 '{"targetElement": null, "position": "center", "targetScreen": "MapScreen"}'::jsonb);

-- ============================================================================
-- 7. ROUTE DETAIL SHEET TOUR (7 steps)
-- ============================================================================
INSERT INTO public.content (key, content_type, platforms, title, body, order_index, active, metadata)
VALUES
('tour.screen.RouteDetailSheet.route-detail-overview', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Route Overview", "sv": "Ruttöversikt"}'::jsonb,
 '{"en": "See all details about the route: difficulty, distance, and estimated time.", "sv": "Se alla detaljer om rutten: svårighetsgrad, avstånd och beräknad tid."}'::jsonb,
 1, true,
 '{"targetElement": null, "position": "center", "targetScreen": "RouteDetailSheet"}'::jsonb),

('tour.screen.RouteDetailSheet.route-detail-map', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Route Map", "sv": "Ruttkarta"}'::jsonb,
 '{"en": "See the route on the map with start and end points marked.", "sv": "Se rutten på kartan med start- och slutpunkt markerade."}'::jsonb,
 2, true,
 '{"targetElement": "RouteDetailSheet.MapPreview", "position": "bottom", "targetScreen": "RouteDetailSheet"}'::jsonb),

('tour.screen.RouteDetailSheet.route-detail-exercises', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Route Exercises", "sv": "Ruttövningar"}'::jsonb,
 '{"en": "Some routes have linked exercises. Complete them to practice specific maneuvers!", "sv": "Vissa rutter har övningar kopplade. Genomför dem för att öva specifika moment!"}'::jsonb,
 3, true,
 '{"targetElement": "RouteDetailSheet.ExerciseSection", "position": "top", "targetScreen": "RouteDetailSheet", "scrollToElement": true}'::jsonb),

('tour.screen.RouteDetailSheet.route-detail-mark-driven', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Mark as Driven", "sv": "Markera som Körd"}'::jsonb,
 '{"en": "When you have driven the route, mark it as driven to track your progress!", "sv": "När du kört rutten, markera den som körd för att följa din framsteg!"}'::jsonb,
 4, true,
 '{"targetElement": "RouteDetailSheet.MarkDrivenButton", "position": "top", "targetScreen": "RouteDetailSheet"}'::jsonb),

('tour.screen.RouteDetailSheet.route-detail-navigate', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Start Navigation", "sv": "Starta Navigation"}'::jsonb,
 '{"en": "Tap Open in Maps to navigate to the route start point.", "sv": "Tryck Öppna i kartor för att navigera till ruttens startpunkt."}'::jsonb,
 5, true,
 '{"targetElement": "RouteDetailSheet.NavigateButton", "position": "top", "targetScreen": "RouteDetailSheet"}'::jsonb),

('tour.screen.RouteDetailSheet.route-detail-save', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Save Route", "sv": "Spara Rutt"}'::jsonb,
 '{"en": "Save the route to your collection to easily find it later.", "sv": "Spara rutten till din samling för att enkelt hitta den senare."}'::jsonb,
 6, true,
 '{"targetElement": "RouteDetailSheet.SaveButton", "position": "top", "targetScreen": "RouteDetailSheet"}'::jsonb),

('tour.screen.RouteDetailSheet.route-detail-review', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Leave Review", "sv": "Lämna Recension"}'::jsonb,
 '{"en": "Share how the route was! Your feedback helps other drivers.", "sv": "Berätta hur rutten var! Din feedback hjälper andra förare."}'::jsonb,
 7, true,
 '{"targetElement": "RouteDetailSheet.ReviewSection", "position": "top", "targetScreen": "RouteDetailSheet", "scrollToElement": true}'::jsonb);

-- ============================================================================
-- 8. LEARNING PATHS SHEET TOUR (5 steps)
-- ============================================================================
INSERT INTO public.content (key, content_type, platforms, title, body, order_index, active, metadata)
VALUES
('tour.screen.LearningPathsSheet.lps-welcome', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Learning Paths", "sv": "Körkortsplaner"}'::jsonb,
 '{"en": "Browse all available learning paths here. Each path contains exercises for different driving skills.", "sv": "Bläddra bland alla tillgängliga körkortsplaner här. Varje plan innehåller övningar för olika körmoment."}'::jsonb,
 1, true,
 '{"targetElement": null, "position": "center", "targetScreen": "LearningPathsSheet"}'::jsonb),

('tour.screen.LearningPathsSheet.lps-filter', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Filter Learning Paths", "sv": "Filtrera Körkortsplaner"}'::jsonb,
 '{"en": "Use the filter button to find paths that match your vehicle type and experience level.", "sv": "Använd filterknappen för att hitta planer som matchar din fordonstyp och erfarenhetsnivå."}'::jsonb,
 2, true,
 '{"targetElement": "LearningPathsSheet.FilterButton", "position": "bottom", "targetScreen": "LearningPathsSheet"}'::jsonb),

('tour.screen.LearningPathsSheet.lps-progress', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Progress Indicator", "sv": "Framstegsindikator"}'::jsonb,
 '{"en": "Each card shows your progress. Complete exercises to fill up the circle!", "sv": "Varje kort visar din framsteg. Genomför övningar för att fylla cirkeln!"}'::jsonb,
 3, true,
 '{"targetElement": "LearningPathsSheet.FirstPath", "position": "bottom", "targetScreen": "LearningPathsSheet"}'::jsonb),

('tour.screen.LearningPathsSheet.lps-locked', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Locked Paths", "sv": "Låsta Planer"}'::jsonb,
 '{"en": "Some paths require a password or payment. Look for the lock icon or price badge.", "sv": "Vissa planer kräver lösenord eller betalning. Leta efter låsikonen eller prisbadge."}'::jsonb,
 4, true,
 '{"targetElement": null, "position": "center", "targetScreen": "LearningPathsSheet"}'::jsonb),

('tour.screen.LearningPathsSheet.lps-select', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Select a Path", "sv": "Välj en Plan"}'::jsonb,
 '{"en": "Tap on a learning path to see its exercises and start learning!", "sv": "Tryck på en körkortsplan för att se övningarna och börja lära dig!"}'::jsonb,
 5, true,
 '{"targetElement": "LearningPathsSheet.FirstPath", "position": "bottom", "targetScreen": "LearningPathsSheet", "action": {"type": "press", "target": "LearningPathsSheet.FirstPath", "delay": 500}}'::jsonb);

-- ============================================================================
-- 9. EXERCISE LIST SHEET TOUR (8 steps)
-- ============================================================================
INSERT INTO public.content (key, content_type, platforms, title, body, order_index, active, metadata)
VALUES
('tour.screen.ExerciseListSheet.els-welcome', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Exercise List", "sv": "Övningslista"}'::jsonb,
 '{"en": "Here you see all exercises in the selected learning path.", "sv": "Här ser du alla övningar i den valda körkortsplanen."}'::jsonb,
 1, true,
 '{"targetElement": null, "position": "center", "targetScreen": "ExerciseListSheet"}'::jsonb),

('tour.screen.ExerciseListSheet.els-video', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Introduction Video 🎬", "sv": "Introduktionsvideo 🎬"}'::jsonb,
 '{"en": "Some learning paths have an introduction video. Watch it first to understand what you will learn!", "sv": "Vissa körkortsplaner har en introduktionsvideo. Titta på den först för att förstå vad du ska lära dig!"}'::jsonb,
 2, true,
 '{"targetElement": "ExerciseListSheet.PathVideo", "position": "bottom", "targetScreen": "ExerciseListSheet"}'::jsonb),

('tour.screen.ExerciseListSheet.els-exercise-card', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Exercise Cards", "sv": "Övningskort"}'::jsonb,
 '{"en": "Each card is an exercise. The checkbox shows if you have completed it.", "sv": "Varje kort är en övning. Kryssrutan visar om du har genomfört den."}'::jsonb,
 3, true,
 '{"targetElement": "ExerciseListSheet.FirstExercise", "position": "bottom", "targetScreen": "ExerciseListSheet"}'::jsonb),

('tour.screen.ExerciseListSheet.els-checkbox', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Quick Check Off ✅", "sv": "Snabb Avbockning ✅"}'::jsonb,
 '{"en": "Tap the checkbox directly to mark an exercise as done without opening it.", "sv": "Tryck på kryssrutan direkt för att markera en övning som klar utan att öppna den."}'::jsonb,
 4, true,
 '{"targetElement": "ExerciseListSheet.FirstCheckbox", "position": "bottom", "targetScreen": "ExerciseListSheet"}'::jsonb),

('tour.screen.ExerciseListSheet.els-open-exercise', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Open Exercise", "sv": "Öppna Övning"}'::jsonb,
 '{"en": "Tap anywhere else on the card to open the exercise and see video, steps, and more.", "sv": "Tryck var som helst på kortet för att öppna övningen och se video, steg och mer."}'::jsonb,
 5, true,
 '{"targetElement": "ExerciseListSheet.FirstExercise", "position": "bottom", "targetScreen": "ExerciseListSheet", "action": {"type": "press", "target": "ExerciseListSheet.FirstExercise", "delay": 500}}'::jsonb),

('tour.screen.ExerciseListSheet.els-repeats', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Repetitions", "sv": "Repetitioner"}'::jsonb,
 '{"en": "Some exercises require multiple repetitions. The progress bar shows how many you have completed.", "sv": "Vissa övningar kräver flera repetitioner. Framstegsfältet visar hur många du har genomfört."}'::jsonb,
 6, true,
 '{"targetElement": "ExerciseListSheet.RepeatSection", "position": "top", "targetScreen": "ExerciseListSheet", "preAction": {"type": "waitFor", "delay": 600}}'::jsonb),

('tour.screen.ExerciseListSheet.els-quiz', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Quiz Section", "sv": "Quizdel"}'::jsonb,
 '{"en": "Some exercises have a quiz to test your knowledge. Answer correctly to proceed!", "sv": "Vissa övningar har ett quiz för att testa din kunskap. Svara rätt för att gå vidare!"}'::jsonb,
 7, true,
 '{"targetElement": "ExerciseListSheet.QuizSection", "position": "top", "targetScreen": "ExerciseListSheet", "scrollToElement": true}'::jsonb),

('tour.screen.ExerciseListSheet.els-complete', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Complete All Exercises", "sv": "Genomför Alla Övningar"}'::jsonb,
 '{"en": "Complete all exercises to finish the learning path and earn your progress!", "sv": "Genomför alla övningar för att slutföra körkortsplanen och tjäna din framsteg!"}'::jsonb,
 8, true,
 '{"targetElement": null, "position": "center", "targetScreen": "ExerciseListSheet"}'::jsonb);

-- ============================================================================
-- 10. EXERCISE DETAIL TOUR (6 steps)
-- ============================================================================
INSERT INTO public.content (key, content_type, platforms, title, body, order_index, active, metadata)
VALUES
('tour.screen.ExerciseDetail.exercise-detail-video', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Watch Tutorial", "sv": "Se Tutorial"}'::jsonb,
 '{"en": "Watch the video to understand the exercise before practicing.", "sv": "Titta på videon för att förstå övningen innan du övar."}'::jsonb,
 1, true,
 '{"targetElement": "ExerciseDetail.VideoPlayer", "position": "bottom", "targetScreen": "ExerciseDetail"}'::jsonb),

('tour.screen.ExerciseDetail.exercise-detail-description', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Exercise Description", "sv": "Övningsbeskrivning"}'::jsonb,
 '{"en": "Read through the description to understand what the exercise is about.", "sv": "Läs igenom beskrivningen för att förstå vad övningen går ut på."}'::jsonb,
 2, true,
 '{"targetElement": null, "position": "center", "targetScreen": "ExerciseDetail"}'::jsonb),

('tour.screen.ExerciseDetail.exercise-detail-steps', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Follow the Steps", "sv": "Följ Stegen"}'::jsonb,
 '{"en": "Each exercise has steps to follow. Check them off as you complete them.", "sv": "Varje övning har steg att följa. Kryssa av dem när du gjort dem."}'::jsonb,
 3, true,
 '{"targetElement": "ExerciseDetail.StepsSection", "position": "top", "targetScreen": "ExerciseDetail", "scrollToElement": true}'::jsonb),

('tour.screen.ExerciseDetail.exercise-detail-complete', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Mark as Complete", "sv": "Markera som Klar"}'::jsonb,
 '{"en": "When you have practiced, tap the checkbox to mark the exercise as complete!", "sv": "När du övat, tryck på kryssrutan för att markera övningen som klar!"}'::jsonb,
 4, true,
 '{"targetElement": "ExerciseDetail.MarkCompleteButton", "position": "top", "targetScreen": "ExerciseDetail"}'::jsonb),

('tour.screen.ExerciseDetail.exercise-detail-repeat', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Repeat", "sv": "Repetera"}'::jsonb,
 '{"en": "Some exercises require multiple repetitions. Complete all to become really good!", "sv": "Vissa övningar kräver flera repetitioner. Gör alla för att bli riktigt duktig!"}'::jsonb,
 5, true,
 '{"targetElement": "ExerciseDetail.RepeatSection", "position": "top", "targetScreen": "ExerciseDetail", "scrollToElement": true}'::jsonb),

('tour.screen.ExerciseDetail.exercise-detail-quiz', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Knowledge Test", "sv": "Kunskapstest"}'::jsonb,
 '{"en": "Some exercises have a quiz to test your knowledge. Answer correctly to proceed!", "sv": "Vissa övningar har quiz för att testa din kunskap. Svara rätt för att gå vidare!"}'::jsonb,
 6, true,
 '{"targetElement": "ExerciseDetail.QuizSection", "position": "top", "targetScreen": "ExerciseDetail", "scrollToElement": true}'::jsonb);

-- ============================================================================
-- 11. MENU TAB TOUR (3 steps)
-- ============================================================================
INSERT INTO public.content (key, content_type, platforms, title, body, order_index, active, metadata)
VALUES
('tour.screen.MenuTab.menu-profile', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Your Profile", "sv": "Din Profil"}'::jsonb,
 '{"en": "View and edit your profile information, including name and picture.", "sv": "Se och redigera din profilinformation, inklusive namn och bild."}'::jsonb,
 1, true,
 '{"targetElement": "MenuTab.ProfileCard", "position": "bottom", "targetScreen": "MenuTab"}'::jsonb),

('tour.screen.MenuTab.menu-connections', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Connections", "sv": "Kopplingar"}'::jsonb,
 '{"en": "Connect with instructors or students to share progress and get guidance.", "sv": "Koppla samman med handledare eller elever för att dela framsteg och få vägledning."}'::jsonb,
 2, true,
 '{"targetElement": "MenuTab.ConnectionsSection", "position": "top", "targetScreen": "MenuTab", "scrollToElement": true}'::jsonb),

('tour.screen.MenuTab.menu-settings', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Settings", "sv": "Inställningar"}'::jsonb,
 '{"en": "Customize the app in the settings section.", "sv": "Anpassa appen i inställningssektionen."}'::jsonb,
 3, true,
 '{"targetElement": "MenuTab.SettingsButton", "position": "top", "targetScreen": "MenuTab"}'::jsonb);

-- ============================================================================
-- 12. CREATE ROUTE SHEET TOUR (9 steps)
-- Why: Teaches users how to create and share their own practice routes
-- ============================================================================
INSERT INTO public.content (key, content_type, platforms, title, body, order_index, active, metadata)
VALUES
('tour.screen.CreateRouteSheet.create-welcome', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Create a Practice Route! 🛣️", "sv": "Skapa en Övningsrutt! 🛣️"}'::jsonb,
 '{"en": "Share your favorite driving spots with other students! Creating routes helps the community and tracks your practice locations.", "sv": "Dela dina favoritplatser för körning med andra elever! Att skapa rutter hjälper communityn och sparar dina övningsplatser."}'::jsonb,
 1, true,
 '{"targetElement": null, "position": "center", "targetScreen": "CreateRouteSheet"}'::jsonb),

('tour.screen.CreateRouteSheet.create-name', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Give it a Name", "sv": "Ge den ett Namn"}'::jsonb,
 '{"en": "A good name helps others find your route! Be descriptive: \"Roundabout Practice - Malmö Central\" is better than \"Route 1\".", "sv": "Ett bra namn hjälper andra att hitta din rutt! Var beskrivande: \"Rondellövning - Malmö Central\" är bättre än \"Rutt 1\"."}'::jsonb,
 2, true,
 '{"targetElement": "CreateRouteSheet.NameInput", "position": "bottom", "targetScreen": "CreateRouteSheet"}'::jsonb),

('tour.screen.CreateRouteSheet.create-location', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Set the Location 📍", "sv": "Ange Plats 📍"}'::jsonb,
 '{"en": "Search for an address or tap the map to set waypoints. The route appears on the map so others can find and navigate to it.", "sv": "Sök efter en adress eller tryck på kartan för att sätta vägpunkter. Rutten visas på kartan så andra kan hitta och navigera till den."}'::jsonb,
 3, true,
 '{"targetElement": "CreateRouteSheet.LocationSearch", "position": "bottom", "targetScreen": "CreateRouteSheet"}'::jsonb),

('tour.screen.CreateRouteSheet.create-record-option', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Or Record While Driving! 🎥", "sv": "Eller Spela In Medan Du Kör! 🎥"}'::jsonb,
 '{"en": "Pro tip: Tap \"Record Route\" to automatically capture the route while you drive. The app tracks your GPS path - perfect for complex routes!", "sv": "Tips: Tryck \"Spela in rutt\" för att automatiskt fånga rutten medan du kör. Appen spårar din GPS-väg - perfekt för komplexa rutter!"}'::jsonb,
 4, true,
 '{"targetElement": "CreateRouteSheet.RecordButton", "position": "top", "targetScreen": "CreateRouteSheet"}'::jsonb),

('tour.screen.CreateRouteSheet.create-waypoints', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Add Waypoints", "sv": "Lägg till Vägpunkter"}'::jsonb,
 '{"en": "Waypoints mark important spots along the route - like where to practice parallel parking or where a tricky intersection is. Tap the map to add them!", "sv": "Vägpunkter markerar viktiga platser längs rutten - som var man övar parallellparkering eller var en knepig korsning är. Tryck på kartan för att lägga till dem!"}'::jsonb,
 5, true,
 '{"targetElement": "CreateRouteSheet.MapView", "position": "top", "targetScreen": "CreateRouteSheet", "scrollToElement": true}'::jsonb),

('tour.screen.CreateRouteSheet.create-difficulty', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Set Difficulty Level", "sv": "Ange Svårighetsgrad"}'::jsonb,
 '{"en": "Help others know what to expect! Beginner routes have simple traffic, while Advanced routes may include challenging intersections or highway entries.", "sv": "Hjälp andra att veta vad de kan förvänta sig! Nybörjarrutter har enkel trafik, medan Avancerade rutter kan ha utmanande korsningar eller motorvägspåfarter."}'::jsonb,
 6, true,
 '{"targetElement": "CreateRouteSheet.DifficultySelector", "position": "top", "targetScreen": "CreateRouteSheet", "scrollToElement": true}'::jsonb),

('tour.screen.CreateRouteSheet.create-exercises', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Link Exercises 📚", "sv": "Koppla Övningar 📚"}'::jsonb,
 '{"en": "Connect specific exercises to this route! If your route is great for practicing roundabouts, link the roundabout exercise so users can learn and practice together.", "sv": "Koppla specifika övningar till denna rutt! Om din rutt är bra för att öva rondeller, koppla rondellövningen så användare kan lära sig och öva tillsammans."}'::jsonb,
 7, true,
 '{"targetElement": "CreateRouteSheet.ExerciseSelector", "position": "top", "targetScreen": "CreateRouteSheet", "scrollToElement": true}'::jsonb),

('tour.screen.CreateRouteSheet.create-media', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Add Photos & Videos 📸", "sv": "Lägg till Foton & Videos 📸"}'::jsonb,
 '{"en": "A picture is worth a thousand words! Add photos of tricky spots or a video walkthrough. This helps others prepare before they drive your route.", "sv": "En bild säger mer än tusen ord! Lägg till foton av knepiga platser eller en videoguide. Detta hjälper andra att förbereda sig innan de kör din rutt."}'::jsonb,
 8, true,
 '{"targetElement": "CreateRouteSheet.MediaSection", "position": "top", "targetScreen": "CreateRouteSheet", "scrollToElement": true}'::jsonb),

('tour.screen.CreateRouteSheet.create-save', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Save & Share! 🚀", "sv": "Spara & Dela! 🚀"}'::jsonb,
 '{"en": "When you are happy, tap Save! Your route will appear on the map for others to discover. You can set it as private if you only want to keep it for yourself.", "sv": "När du är nöjd, tryck Spara! Din rutt visas på kartan så andra kan upptäcka den. Du kan sätta den som privat om du bara vill behålla den för dig själv."}'::jsonb,
 9, true,
 '{"targetElement": "CreateRouteSheet.SaveButton", "position": "top", "targetScreen": "CreateRouteSheet"}'::jsonb);

-- ============================================================================
-- 13. RECORD DRIVING SHEET TOUR (8 steps)
-- Why: Teaches users how to record their driving sessions to create routes
-- ============================================================================
INSERT INTO public.content (key, content_type, platforms, title, body, order_index, active, metadata)
VALUES
('tour.screen.RecordDrivingSheet.record-welcome', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Record Your Drive! 🎬", "sv": "Spela In Din Körning! 🎬"}'::jsonb,
 '{"en": "Turn any drive into a shareable route! The app uses GPS to track your path automatically. Perfect for capturing real-world practice sessions.", "sv": "Förvandla vilken körning som helst till en delbar rutt! Appen använder GPS för att spåra din väg automatiskt. Perfekt för att fånga verkliga övningspass."}'::jsonb,
 1, true,
 '{"targetElement": null, "position": "center", "targetScreen": "RecordDrivingSheet"}'::jsonb),

('tour.screen.RecordDrivingSheet.record-start', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Start Recording ▶️", "sv": "Starta Inspelning ▶️"}'::jsonb,
 '{"en": "Tap the play button when you are ready to start driving. The recording begins immediately - no need to rush, take your time to get comfortable!", "sv": "Tryck på play-knappen när du är redo att börja köra. Inspelningen börjar direkt - ingen brådska, ta din tid att bli bekväm!"}'::jsonb,
 2, true,
 '{"targetElement": "RecordDrivingSheet.StartButton", "position": "top", "targetScreen": "RecordDrivingSheet"}'::jsonb),

('tour.screen.RecordDrivingSheet.record-stats', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Live Statistics 📊", "sv": "Realtidsstatistik 📊"}'::jsonb,
 '{"en": "Watch your progress in real-time! See duration, distance covered, and current speed. This data is saved with your route so you can review your driving later.", "sv": "Se din framsteg i realtid! Se varaktighet, körd distans och nuvarande hastighet. Denna data sparas med din rutt så du kan granska din körning senare."}'::jsonb,
 3, true,
 '{"targetElement": "RecordDrivingSheet.StatsContainer", "position": "bottom", "targetScreen": "RecordDrivingSheet"}'::jsonb),

('tour.screen.RecordDrivingSheet.record-map-preview', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Live Map Preview 🗺️", "sv": "Kartförhandsgranskning 🗺️"}'::jsonb,
 '{"en": "Toggle the map to see your route being drawn in real-time! Each waypoint is automatically captured as you drive. Great for verifying your path.", "sv": "Växla kartan för att se din rutt ritas i realtid! Varje vägpunkt fångas automatiskt medan du kör. Perfekt för att verifiera din väg."}'::jsonb,
 4, true,
 '{"targetElement": "RecordDrivingSheet.MapToggle", "position": "bottom", "targetScreen": "RecordDrivingSheet"}'::jsonb),

('tour.screen.RecordDrivingSheet.record-pause', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Pause When Needed ⏸️", "sv": "Pausa Vid Behov ⏸️"}'::jsonb,
 '{"en": "Taking a break? Tap pause to stop recording temporarily. The app will not track while paused - perfect for rest stops or if you need to step out.", "sv": "Tar du en paus? Tryck på pausa för att stoppa inspelningen tillfälligt. Appen spårar inte medan den är pausad - perfekt för rastplatser eller om du behöver gå ut."}'::jsonb,
 5, true,
 '{"targetElement": "RecordDrivingSheet.PauseButton", "position": "top", "targetScreen": "RecordDrivingSheet"}'::jsonb),

('tour.screen.RecordDrivingSheet.record-minimize', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Minimize to Background", "sv": "Minimera till Bakgrund"}'::jsonb,
 '{"en": "Want to use other apps while recording? Tap minimize! Recording continues in the background with a notification. Swipe down to return anytime.", "sv": "Vill du använda andra appar medan du spelar in? Tryck minimera! Inspelningen fortsätter i bakgrunden med en notis. Svep ner för att återgå när som helst."}'::jsonb,
 6, true,
 '{"targetElement": "RecordDrivingSheet.MinimizeButton", "position": "bottom", "targetScreen": "RecordDrivingSheet"}'::jsonb),

('tour.screen.RecordDrivingSheet.record-stop', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Stop & Review ⏹️", "sv": "Stoppa & Granska ⏹️"}'::jsonb,
 '{"en": "Done driving? Tap the red stop button. You will see a summary of your route with all the waypoints captured during your drive.", "sv": "Kört klart? Tryck på den röda stoppknappen. Du ser en sammanfattning av din rutt med alla vägpunkter som fångades under din körning."}'::jsonb,
 7, true,
 '{"targetElement": "RecordDrivingSheet.StopButton", "position": "top", "targetScreen": "RecordDrivingSheet"}'::jsonb),

('tour.screen.RecordDrivingSheet.record-create-route', 'tour', ARRAY['mobile', 'both'],
 '{"en": "Create Your Route! 🎉", "sv": "Skapa Din Rutt! 🎉"}'::jsonb,
 '{"en": "After stopping, tap \"Create Route\" to turn your recording into a shareable practice route. Add a name, description, and exercises - then save!", "sv": "Efter att ha stoppat, tryck \"Skapa Rutt\" för att förvandla din inspelning till en delbar övningsrutt. Lägg till namn, beskrivning och övningar - sen spara!"}'::jsonb,
 8, true,
 '{"targetElement": "RecordDrivingSheet.CreateRouteButton", "position": "top", "targetScreen": "RecordDrivingSheet"}'::jsonb);

-- ============================================================================
-- Done! All tour content has been inserted.
-- ============================================================================
```

---

## Tour Target IDs Reference

For each tour to work, the corresponding UI components need to have tour targets registered. Here are the target IDs used:

### HomeScreen
- `HomeScreen.WeeklyGoal`
- `HomeScreen.DailyStatus`
- `HomeScreen.MapPreview`
- `HomeScreen.ProgressSection`
- `HomeScreen.SavedRoutes`
- `HomeScreen.DrivenRoutes`
- `HomeScreen.NearbyRoutes`
- `CreateRouteTab`
- `ProgressTab`

### ProgressScreen
- `ProgressScreen.FirstPath`
- `ProgressScreen.FirstExercise`
- `ProgressScreen.FilterButton`
- `ExerciseDetail.VideoPlayer`
- `ExerciseDetail.StepsSection`
- `ExerciseDetail.Checkbox`
- `ExerciseDetail.RepeatSection`
- `MapTab`

### MapScreen
- `MapScreen.LocateButton`
- `MapScreen.RoutesDrawer`
- `MapScreen.RecordButton`

### RouteDetailSheet
- `RouteDetailSheet.MapPreview`
- `RouteDetailSheet.ExerciseSection`
- `RouteDetailSheet.MarkDrivenButton`
- `RouteDetailSheet.NavigateButton`
- `RouteDetailSheet.SaveButton`
- `RouteDetailSheet.ReviewSection`

### LearningPathsSheet
- `LearningPathsSheet.FilterButton`
- `LearningPathsSheet.FirstPath`

### ExerciseListSheet
- `ExerciseListSheet.PathVideo`
- `ExerciseListSheet.FirstExercise`
- `ExerciseListSheet.FirstCheckbox`
- `ExerciseListSheet.RepeatSection`
- `ExerciseListSheet.QuizSection`

### MenuTab
- `MenuTab.ProfileCard`
- `MenuTab.ConnectionsSection`
- `MenuTab.SettingsButton`

### CreateRouteSheet
- `CreateRouteSheet.NameInput`
- `CreateRouteSheet.LocationSearch`
- `CreateRouteSheet.RecordButton`
- `CreateRouteSheet.MapView`
- `CreateRouteSheet.DifficultySelector`
- `CreateRouteSheet.ExerciseSelector`
- `CreateRouteSheet.MediaSection`
- `CreateRouteSheet.SaveButton`

### RecordDrivingSheet
- `RecordDrivingSheet.StartButton`
- `RecordDrivingSheet.StatsContainer`
- `RecordDrivingSheet.MapToggle`
- `RecordDrivingSheet.PauseButton`
- `RecordDrivingSheet.MinimizeButton`
- `RecordDrivingSheet.StopButton`
- `RecordDrivingSheet.CreateRouteButton`

---

## Action Types

Tours can have the following action types in their `metadata`:

| Action Type | Description | Example |
|-------------|-------------|---------|
| `navigate` | Navigate to a tab or screen | `{"type": "navigate", "target": "ProgressTab"}` |
| `press` | Simulate pressing a button | `{"type": "press", "target": "ProgressScreen.FirstPath", "delay": 500}` |
| `waitFor` | Wait for content to load | `{"type": "waitFor", "delay": 800}` |
| `scrollTo` | Scroll to an element | Used with `scrollToElement: true` |

---

## Reset Tour for User (Optional)

To reset a user's tour progress for testing:

```sql
-- Reset tour completion for a specific user
UPDATE public.profiles
SET tour_completed = FALSE, tour_content_hash = NULL
WHERE id = 'USER_UUID_HERE';

-- Reset screen tours for a specific user
DELETE FROM public.user_tour_completions
WHERE user_id = 'USER_UUID_HERE';
```
