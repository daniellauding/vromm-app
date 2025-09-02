-- GETTING STARTED TRANSLATIONS
-- Copy-paste this SQL to add Swedish and English translations for GettingStarted component
-- Replace hardcoded text with proper translation system

INSERT INTO "public"."translations" ("key", "language", "value", "platform") VALUES

-- Section Header
('home.gettingStarted.title', 'en', 'Getting Started', 'mobile'),
('home.gettingStarted.title', 'sv', 'Komma igång', 'mobile'),

-- 1. License Plan Card
('home.gettingStarted.licensePlan.title', 'en', 'Your License Plan', 'mobile'),
('home.gettingStarted.licensePlan.title', 'sv', 'Din körkortsplan', 'mobile'),
('home.gettingStarted.licensePlan.description', 'en', 'Tell us about yourself and your goals', 'mobile'),
('home.gettingStarted.licensePlan.description', 'sv', 'Berätta om dig och dina mål', 'mobile'),

-- 2. Create First Route Card
('home.gettingStarted.firstRoute.title', 'en', 'Add Your First Route', 'mobile'),
('home.gettingStarted.firstRoute.title', 'sv', 'Lägg till din första rutt', 'mobile'),
('home.gettingStarted.firstRoute.description', 'en', 'Create a route you use often', 'mobile'),
('home.gettingStarted.firstRoute.description', 'sv', 'Skapa en körrutt du använder ofta', 'mobile'),

-- 3. Start Learning Card  
('home.gettingStarted.startLearning.title', 'en', 'Start on Step 1 of 16', 'mobile'),
('home.gettingStarted.startLearning.title', 'sv', 'Börja på steg 1 av 16', 'mobile'),
('home.gettingStarted.startLearning.description', 'en', 'Start your license journey', 'mobile'),
('home.gettingStarted.startLearning.description', 'sv', 'Starta din körkortsresa', 'mobile'),

-- 4. Save Route Card
('home.gettingStarted.saveRoute.title', 'en', 'Save a Route', 'mobile'),
('home.gettingStarted.saveRoute.title', 'sv', 'Spara en körrutt', 'mobile'),
('home.gettingStarted.saveRoute.description', 'en', 'Find and save a route from the map', 'mobile'),
('home.gettingStarted.saveRoute.description', 'sv', 'Hitta och spara en rutt från kartan', 'mobile'),

-- 5. Choose Role Card
('home.gettingStarted.chooseRole.title', 'en', 'Choose Your Role', 'mobile'),
('home.gettingStarted.chooseRole.title', 'sv', 'Välj din roll', 'mobile'),
('home.gettingStarted.chooseRole.description', 'en', 'Student, instructor, or driving school?', 'mobile'),
('home.gettingStarted.chooseRole.description', 'sv', 'Student, lärare eller trafikskola?', 'mobile'),

-- 6. Connect with Others Card (Student Version)
('home.gettingStarted.connectStudent.title', 'en', 'Add Supervisor', 'mobile'),
('home.gettingStarted.connectStudent.title', 'sv', 'Lägg till handledare', 'mobile'),
('home.gettingStarted.connectStudent.description', 'en', 'Connect with driving schools and supervisors', 'mobile'),
('home.gettingStarted.connectStudent.description', 'sv', 'Anslut med körskolor och handledare', 'mobile'),

-- 6. Connect with Others Card (Instructor Version)
('home.gettingStarted.connectInstructor.title', 'en', 'Add Students', 'mobile'),
('home.gettingStarted.connectInstructor.title', 'sv', 'Lägg till elever', 'mobile'),
('home.gettingStarted.connectInstructor.description', 'en', 'Connect with students to supervise', 'mobile'),
('home.gettingStarted.connectInstructor.description', 'sv', 'Anslut med elever att handleda', 'mobile'),

-- Completion Status Labels
('home.gettingStarted.status.completed', 'en', 'DONE', 'mobile'),
('home.gettingStarted.status.completed', 'sv', 'KLART', 'mobile'),
('home.gettingStarted.status.progress', 'en', '100%', 'mobile'),
('home.gettingStarted.status.progress', 'sv', '100%', 'mobile'),
('home.gettingStarted.status.notStarted', 'en', '0%', 'mobile'),
('home.gettingStarted.status.notStarted', 'sv', '0%', 'mobile')

ON CONFLICT (key, language) DO UPDATE SET 
  value = EXCLUDED.value,
  updated_at = NOW();

-- Verification query
SELECT 
  'GETTING STARTED TRANSLATIONS' as section,
  key,
  language,
  value
FROM "public"."translations" 
WHERE key LIKE 'home.gettingStarted.%'
ORDER BY key, language;
