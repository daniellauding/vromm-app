-- ============================================================
-- WINTER DRIVING - BITE-SIZED EDUCATIONAL UPDATE
-- Replaces article-style content with actionable learning
-- ============================================================

-- First, safely remove only the winter driving content we created
DELETE FROM exercise_quiz_answers WHERE question_id IN (
    SELECT q.id FROM exercise_quiz_questions q
    JOIN learning_path_exercises e ON q.exercise_id = e.id
    JOIN learning_paths lp ON e.learning_path_id = lp.id
    WHERE lp.title->>'en' = 'Winter Driving Mastery'
);

DELETE FROM exercise_quiz_questions WHERE exercise_id IN (
    SELECT e.id FROM learning_path_exercises e
    JOIN learning_paths lp ON e.learning_path_id = lp.id
    WHERE lp.title->>'en' = 'Winter Driving Mastery'
);

DELETE FROM learning_path_exercises WHERE learning_path_id IN (
    SELECT id FROM learning_paths WHERE title->>'en' = 'Winter Driving Mastery'
);

DELETE FROM learning_paths WHERE title->>'en' = 'Winter Driving Mastery';

-- Now create the new bite-sized version
DO $$
DECLARE
    v_lp_id UUID := gen_random_uuid();

    -- Module 1: Before You Drive (4 quick exercises)
    v_ex1a UUID := gen_random_uuid();
    v_ex1b UUID := gen_random_uuid();
    v_ex1c UUID := gen_random_uuid();
    v_ex1d UUID := gen_random_uuid();

    -- Module 2: On the Road Basics (5 exercises)
    v_ex2a UUID := gen_random_uuid();
    v_ex2b UUID := gen_random_uuid();
    v_ex2c UUID := gen_random_uuid();
    v_ex2d UUID := gen_random_uuid();
    v_ex2e UUID := gen_random_uuid();

    -- Module 3: Emergency Skills (4 exercises)
    v_ex3a UUID := gen_random_uuid();
    v_ex3b UUID := gen_random_uuid();
    v_ex3c UUID := gen_random_uuid();
    v_ex3d UUID := gen_random_uuid();

    -- Quiz question IDs
    v_q1 UUID := gen_random_uuid();
    v_q2 UUID := gen_random_uuid();
    v_q3 UUID := gen_random_uuid();
    v_q4 UUID := gen_random_uuid();
    v_q5 UUID := gen_random_uuid();
    v_q6 UUID := gen_random_uuid();
    v_q7 UUID := gen_random_uuid();
    v_q8 UUID := gen_random_uuid();

BEGIN

-- ============================================================
-- LEARNING PATH
-- ============================================================
INSERT INTO learning_paths (id, title, description, icon, image, is_featured, active, vehicle_type, experience_level, created_at, updated_at)
VALUES (
    v_lp_id,
    '{"en": "Winter Driving Mastery", "sv": "Behärska vinterkörning"}'::jsonb,
    '{"en": "13 bite-sized lessons to master winter driving. Practice in your car, test your knowledge, and build confidence on snow and ice.", "sv": "13 korta lektioner för att behärska vinterkörning. Öva i bilen, testa dina kunskaper och bygg självförtroende på snö och is."}'::jsonb,
    'snowflake',
    'https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=800',
    false, false, 'car', 'beginner', now(), now()
);

-- ============================================================
-- MODULE 1: BEFORE YOU DRIVE
-- ============================================================

-- 1a: Quick Check - Spot Ice Types (Flashcard style)
INSERT INTO learning_path_exercises (id, learning_path_id, title, description, order_index, repeat_count, completed, is_featured, has_quiz, quiz_required, quiz_pass_score, show_quiz, icon, created_at, updated_at)
VALUES (
    v_ex1a, v_lp_id,
    '{"en": "Spot the Ice Type", "sv": "Identifiera istypen"}'::jsonb,
    '{"en": "Can you identify these 4 winter road surfaces?\n\n1. **Black ice** - Looks wet but is frozen. Nearly invisible!\n2. **Packed snow** - White, compressed. Better grip than ice.\n3. **Slush** - Wet snow mix. Can cause hydroplaning.\n4. **Frost** - Thin white layer. Slippery in shade.\n\n**Quick test:** Which is most dangerous? (Black ice - you can''t see it!)", "sv": "Kan du identifiera dessa 4 vintervägytor?\n\n1. **Svartis** - Ser vått ut men är fruset. Nästan osynligt!\n2. **Packad snö** - Vit, komprimerad. Bättre grepp än is.\n3. **Slask** - Våt snöblandning. Kan orsaka vattenplaning.\n4. **Frost** - Tunt vitt lager. Halt i skugga.\n\n**Snabbtest:** Vilken är farligast? (Svartis - du kan inte se den!)"}'::jsonb,
    1, 1, false, false, true, false, 70, true, 'eye', now(), now()
);

-- 1b: Do This - 60 Second Car Check
INSERT INTO learning_path_exercises (id, learning_path_id, title, description, order_index, repeat_count, completed, is_featured, has_quiz, quiz_required, quiz_pass_score, show_quiz, icon, created_at, updated_at)
VALUES (
    v_ex1b, v_lp_id,
    '{"en": "60-Second Winter Check", "sv": "60-sekunders vinterkoll"}'::jsonb,
    '{"en": "**Do this before every winter drive:**\n\n[ ] All windows clear? (Not just a peephole!)\n[ ] Lights visible? Brush off snow.\n[ ] Mirrors clear?\n[ ] Roof cleared? (Snow slides onto windshield!)\n[ ] Wipers free? Not frozen to glass.\n\n**Pro tip:** Keep a small brush in your door pocket.", "sv": "**Gör detta före varje vinterresa:**\n\n[ ] Alla rutor rena? (Inte bara ett kikhål!)\n[ ] Lampor synliga? Borsta bort snö.\n[ ] Speglar rena?\n[ ] Tak rensat? (Snö glider ner på vindrutan!)\n[ ] Torkare fria? Inte frusna mot glaset.\n\n**Tips:** Ha en liten borste i dörren."}'::jsonb,
    2, 5, false, false, false, false, 70, false, 'clipboard-check', now(), now()
);

-- 1c: Remember This - Fuel Tank Rule
INSERT INTO learning_path_exercises (id, learning_path_id, title, description, order_index, repeat_count, completed, is_featured, has_quiz, quiz_required, quiz_pass_score, show_quiz, icon, created_at, updated_at)
VALUES (
    v_ex1c, v_lp_id,
    '{"en": "The Half-Tank Rule", "sv": "Halvtanksregeln"}'::jsonb,
    '{"en": "**Keep your tank at least HALF full in winter.**\n\nWhy?\n- Prevents fuel line freezing\n- Extra weight = better traction\n- Won''t run out if stuck in traffic\n\n**Remember:** Half tank = Happy winter driving", "sv": "**Håll tanken minst HALVFULL på vintern.**\n\nVarför?\n- Förhindrar att bränsleledningar fryser\n- Extra vikt = bättre grepp\n- Tar inte slut om du fastnar i trafik\n\n**Kom ihåg:** Halvtank = Glad vinterkörning"}'::jsonb,
    3, 1, false, false, false, false, 70, false, 'fuel', now(), now()
);

-- 1d: Quiz - Before You Drive
INSERT INTO learning_path_exercises (id, learning_path_id, title, description, order_index, repeat_count, completed, is_featured, has_quiz, quiz_required, quiz_pass_score, show_quiz, icon, created_at, updated_at)
VALUES (
    v_ex1d, v_lp_id,
    '{"en": "Quick Quiz: Pre-Drive", "sv": "Snabbquiz: Före körning"}'::jsonb,
    '{"en": "Test what you learned! 3 quick questions about preparing for winter driving.", "sv": "Testa vad du lärt dig! 3 snabba frågor om förberedelse för vinterkörning."}'::jsonb,
    4, 1, false, false, true, true, 70, true, 'help-circle', now(), now()
);

-- ============================================================
-- MODULE 2: ON THE ROAD
-- ============================================================

-- 2a: Practice - Gentle Start
INSERT INTO learning_path_exercises (id, learning_path_id, title, description, order_index, repeat_count, completed, is_featured, has_quiz, quiz_required, quiz_pass_score, show_quiz, icon, created_at, updated_at)
VALUES (
    v_ex2a, v_lp_id,
    '{"en": "Practice: The Gentle Start", "sv": "Öva: Mjuk start"}'::jsonb,
    '{"en": "**Try this in a safe area:**\n\n1. Find a snowy parking lot\n2. Start moving with MINIMAL gas\n3. Feel for wheel spin\n4. If wheels spin → ease off immediately\n\n**Goal:** Move smoothly without any wheel spin.\n\n**Manual car?** Try starting in 2nd gear for less torque.", "sv": "**Prova detta på en säker plats:**\n\n1. Hitta en snöig parkering\n2. Börja röra dig med MINIMAL gas\n3. Känn efter hjulspinn\n4. Om hjulen spinner → lätta genast\n\n**Mål:** Röra dig mjukt utan hjulspinn.\n\n**Manuell bil?** Prova starta i 2:an för mindre vridmoment."}'::jsonb,
    5, 10, false, false, false, false, 70, false, 'play-circle', now(), now()
);

-- 2b: Key Number - Stopping Distance
INSERT INTO learning_path_exercises (id, learning_path_id, title, description, order_index, repeat_count, completed, is_featured, has_quiz, quiz_required, quiz_pass_score, show_quiz, icon, created_at, updated_at)
VALUES (
    v_ex2b, v_lp_id,
    '{"en": "Key Number: 10x Longer!", "sv": "Nyckeltal: 10x längre!"}'::jsonb,
    '{"en": "**Stopping on ice takes up to 10x LONGER than dry roads.**\n\nAt 50 km/h:\n- Dry road: ~13 meters\n- Ice: ~130 meters!\n\n**What this means:**\n- Brake EARLY\n- Brake GENTLY\n- Keep huge distance to car ahead\n\n**ABS tip:** Press firm and hold. Let it pulse.", "sv": "**Att stanna på is tar upp till 10x LÄNGRE än torra vägar.**\n\nVid 50 km/h:\n- Torr väg: ~13 meter\n- Is: ~130 meter!\n\n**Vad detta betyder:**\n- Bromsa TIDIGT\n- Bromsa FÖRSIKTIGT\n- Håll stort avstånd till bilen framför\n\n**ABS-tips:** Tryck stadigt och håll. Låt det pulsera."}'::jsonb,
    6, 1, false, false, true, false, 70, true, 'alert-triangle', now(), now()
);

-- 2c: Practice - Brake Feel Test
INSERT INTO learning_path_exercises (id, learning_path_id, title, description, order_index, repeat_count, completed, is_featured, has_quiz, quiz_required, quiz_pass_score, show_quiz, icon, created_at, updated_at)
VALUES (
    v_ex2c, v_lp_id,
    '{"en": "Practice: Feel Your Brakes", "sv": "Öva: Känn dina bromsar"}'::jsonb,
    '{"en": "**Safe practice (empty parking lot):**\n\n1. Drive slowly (20 km/h)\n2. Brake gently - feel the grip\n3. Brake harder - feel ABS kick in (pulsing pedal)\n4. Note how long it takes to stop\n\n**Goal:** Know exactly how your car responds on snow.\n\n**Never done this?** You need to before winter!", "sv": "**Säker övning (tom parkering):**\n\n1. Kör långsamt (20 km/h)\n2. Bromsa försiktigt - känn greppet\n3. Bromsa hårdare - känn ABS slå in (pulserande pedal)\n4. Notera hur lång tid det tar att stanna\n\n**Mål:** Vet exakt hur din bil reagerar på snö.\n\n**Aldrig gjort detta?** Du måste innan vintern!"}'::jsonb,
    7, 5, false, false, false, false, 70, false, 'disc', now(), now()
);

-- 2d: Rule - The 8-Second Gap
INSERT INTO learning_path_exercises (id, learning_path_id, title, description, order_index, repeat_count, completed, is_featured, has_quiz, quiz_required, quiz_pass_score, show_quiz, icon, created_at, updated_at)
VALUES (
    v_ex2d, v_lp_id,
    '{"en": "The 8-Second Rule", "sv": "8-sekundersregeln"}'::jsonb,
    '{"en": "**Normal following: 3 seconds. Winter: 8-10 seconds!**\n\nHow to measure:\n1. Car ahead passes a sign\n2. Count: \"one-thousand-one, one-thousand-two...\"\n3. You should reach 8 before passing the sign\n\n**Too close?** Ease off gas and rebuild the gap.\n\n**Remember:** If you can''t stop safely, you''re too close.", "sv": "**Normalt avstånd: 3 sekunder. Vinter: 8-10 sekunder!**\n\nHur du mäter:\n1. Bilen framför passerar en skylt\n2. Räkna: \"ett-tusen-ett, ett-tusen-två...\"\n3. Du ska nå 8 innan du passerar skylten\n\n**För nära?** Lätta på gasen och bygg upp avståndet.\n\n**Kom ihåg:** Kan du inte stanna säkert är du för nära."}'::jsonb,
    8, 3, false, false, false, false, 70, false, 'clock', now(), now()
);

-- 2e: Watch For - First to Freeze
INSERT INTO learning_path_exercises (id, learning_path_id, title, description, order_index, repeat_count, completed, is_featured, has_quiz, quiz_required, quiz_pass_score, show_quiz, icon, created_at, updated_at)
VALUES (
    v_ex2e, v_lp_id,
    '{"en": "Watch: First to Freeze", "sv": "Se upp: Fryser först"}'::jsonb,
    '{"en": "**These spots freeze FIRST - always be alert!**\n\n1. **Bridges** - Cold air underneath\n2. **Overpasses** - Same reason\n3. **Shaded areas** - No sun to warm them\n4. **Near water** - Extra moisture\n\n**Visual cue:** Road looks darker/shinier? Slow down!\n\n**Temperature trick:** +3°C and below = ice possible", "sv": "**Dessa platser fryser FÖRST - var alltid alert!**\n\n1. **Broar** - Kall luft undertill\n2. **Viadukter** - Samma anledning\n3. **Skuggiga områden** - Ingen sol som värmer\n4. **Nära vatten** - Extra fukt\n\n**Visuell ledtråd:** Vägen ser mörkare/blankare ut? Sakta ner!\n\n**Temperaturtrick:** +3°C och under = is möjlig"}'::jsonb,
    9, 1, false, false, true, false, 70, true, 'thermometer', now(), now()
);

-- ============================================================
-- MODULE 3: EMERGENCY SKILLS
-- ============================================================

-- 3a: Skill - Skid Recovery (Oversteer)
INSERT INTO learning_path_exercises (id, learning_path_id, title, description, order_index, repeat_count, completed, is_featured, has_quiz, quiz_required, quiz_pass_score, show_quiz, icon, created_at, updated_at)
VALUES (
    v_ex3a, v_lp_id,
    '{"en": "Skid Rescue: Rear Slides", "sv": "Sladdräddning: Bakhjulen glider"}'::jsonb,
    '{"en": "**Rear wheels sliding out? (Oversteer)**\n\n**DO:**\n1. Look where you WANT to go\n2. Steer gently that direction\n3. Ease off gas (don''t lift completely)\n4. Stay calm - smooth inputs!\n\n**DON''T:**\n- Slam brakes (locks wheels!)\n- Overcorrect (causes spin)\n- Panic\n\n**Key phrase:** \"Eyes where you want to go\"", "sv": "**Bakhjulen glider ut? (Överstyrning)**\n\n**GÖR:**\n1. Titta dit du VILL åka\n2. Styr försiktigt dit\n3. Lätta på gasen (släpp inte helt)\n4. Var lugn - mjuka inmatningar!\n\n**GÖR INTE:**\n- Trampa på bromsen (låser hjulen!)\n- Överkorrigera (orsakar spinn)\n- Panik\n\n**Nyckelfras:** \"Ögonen dit du vill åka\""}'::jsonb,
    10, 1, false, false, true, true, 75, true, 'rotate-ccw', now(), now()
);

-- 3b: Skill - Skid Recovery (Understeer)
INSERT INTO learning_path_exercises (id, learning_path_id, title, description, order_index, repeat_count, completed, is_featured, has_quiz, quiz_required, quiz_pass_score, show_quiz, icon, created_at, updated_at)
VALUES (
    v_ex3b, v_lp_id,
    '{"en": "Skid Rescue: Car Won''t Turn", "sv": "Sladdräddning: Bilen svänger inte"}'::jsonb,
    '{"en": "**Front wheels sliding straight? (Understeer)**\n\n**DO:**\n1. Ease off gas completely\n2. Straighten steering briefly\n3. Wait for grip to return\n4. Then steer again - gently!\n\n**Why straighten?** Tires grip best rolling straight.\n\n**Prevention:** Slow down BEFORE the turn, not during!", "sv": "**Framhjulen glider rakt? (Understyrning)**\n\n**GÖR:**\n1. Släpp gasen helt\n2. Räta upp styrningen kort\n3. Vänta på att greppet återkommer\n4. Styr sedan igen - försiktigt!\n\n**Varför räta upp?** Däck greppar bäst rakt framåt.\n\n**Förebyggande:** Sakta ner FÖRE kurvan, inte under!"}'::jsonb,
    11, 1, false, false, false, false, 70, false, 'corner-up-right', now(), now()
);

-- 3c: Stuck! - Getting Unstuck
INSERT INTO learning_path_exercises (id, learning_path_id, title, description, order_index, repeat_count, completed, is_featured, has_quiz, quiz_required, quiz_pass_score, show_quiz, icon, created_at, updated_at)
VALUES (
    v_ex3c, v_lp_id,
    '{"en": "Stuck in Snow? Do This", "sv": "Fastnat i snö? Gör så här"}'::jsonb,
    '{"en": "**Step by step:**\n\n1. **Don''t spin wheels!** Makes it worse.\n2. **Clear snow** around tires\n3. **Rock the car:** Forward → Reverse → Forward\n4. **Add traction:** Sand, cat litter, or floor mats under wheels\n5. **Deflate slightly?** Lower pressure = more grip (reinflate after!)\n\n**Still stuck?** Turn wheels left-right while gently accelerating.", "sv": "**Steg för steg:**\n\n1. **Spinn inte hjulen!** Gör det värre.\n2. **Rensa snö** runt däcken\n3. **Vagga bilen:** Framåt → Backa → Framåt\n4. **Lägg till grepp:** Sand, kattströ eller golvmattor under hjulen\n5. **Släpp ut luft?** Lägre tryck = mer grepp (fyll på efter!)\n\n**Fortfarande fast?** Vrid hjulen vänster-höger medan du gasar försiktigt."}'::jsonb,
    12, 1, false, false, false, false, 70, false, 'truck', now(), now()
);

-- 3d: Checklist - Emergency Kit
INSERT INTO learning_path_exercises (id, learning_path_id, title, description, order_index, repeat_count, completed, is_featured, has_quiz, quiz_required, quiz_pass_score, show_quiz, icon, created_at, updated_at)
VALUES (
    v_ex3d, v_lp_id,
    '{"en": "Your Winter Car Kit", "sv": "Ditt vinter-bilkit"}'::jsonb,
    '{"en": "**Keep in your car:**\n\n**Must have:**\n[ ] Ice scraper + brush\n[ ] Jumper cables\n[ ] Phone charger\n[ ] Flashlight\n[ ] Warm blanket\n\n**Smart to have:**\n[ ] Sand/cat litter (traction)\n[ ] Small shovel\n[ ] Snacks + water\n[ ] Candle + matches (1 candle can warm a car!)\n\n**Check your kit at winter start!**", "sv": "**Ha i bilen:**\n\n**Måste ha:**\n[ ] Isskrapa + borste\n[ ] Startkablar\n[ ] Mobilladdare\n[ ] Ficklampa\n[ ] Varm filt\n\n**Smart att ha:**\n[ ] Sand/kattströ (grepp)\n[ ] Liten spade\n[ ] Snacks + vatten\n[ ] Stearinljus + tändstickor (1 ljus kan värma en bil!)\n\n**Kolla ditt kit vid vinterstart!**"}'::jsonb,
    13, 1, false, false, true, false, 70, true, 'package', now(), now()
);

-- ============================================================
-- QUIZ QUESTIONS
-- ============================================================

-- Q1: Black ice identification
INSERT INTO exercise_quiz_questions (id, exercise_id, question_text, question_type, order_index, difficulty, points, time_limit, explanation_text, created_at)
VALUES (v_q1, v_ex1a,
    '{"en": "What makes black ice so dangerous?", "sv": "Vad gör svartis så farlig?"}'::jsonb,
    'single_choice', 1, 'Easy', 10, 30,
    '{"en": "Black ice is nearly invisible - it looks like a wet road but is actually frozen.", "sv": "Svartis är nästan osynlig - den ser ut som en våt väg men är faktiskt frusen."}'::jsonb,
    now()
);

-- Q2: Pre-drive priority
INSERT INTO exercise_quiz_questions (id, exercise_id, question_text, question_type, order_index, difficulty, points, time_limit, explanation_text, created_at)
VALUES (v_q2, v_ex1d,
    '{"en": "Why clear snow from your roof?", "sv": "Varför rensa snö från taket?"}'::jsonb,
    'single_choice', 1, 'Easy', 10, 30,
    '{"en": "Snow can slide onto your windshield when braking, blocking your view completely!", "sv": "Snö kan glida ner på vindrutan vid inbromsning och blockera sikten helt!"}'::jsonb,
    now()
);

-- Q3: Fuel tank
INSERT INTO exercise_quiz_questions (id, exercise_id, question_text, question_type, order_index, difficulty, points, time_limit, explanation_text, created_at)
VALUES (v_q3, v_ex1d,
    '{"en": "Minimum fuel level in winter?", "sv": "Minsta bränslenivå på vintern?"}'::jsonb,
    'single_choice', 2, 'Easy', 10, 20,
    '{"en": "Half tank prevents fuel line freezing and gives you reserve if stuck.", "sv": "Halvtank förhindrar att bränsleledningar fryser och ger reserv om du fastnar."}'::jsonb,
    now()
);

-- Q4: Stopping distance
INSERT INTO exercise_quiz_questions (id, exercise_id, question_text, question_type, order_index, difficulty, points, time_limit, explanation_text, created_at)
VALUES (v_q4, v_ex2b,
    '{"en": "How much longer is stopping distance on ice?", "sv": "Hur mycket längre är bromssträckan på is?"}'::jsonb,
    'single_choice', 1, 'Medium', 15, 30,
    '{"en": "Up to 10 times longer! That''s why early, gentle braking is essential.", "sv": "Upp till 10 gånger längre! Därför är tidig, försiktig bromsning viktigt."}'::jsonb,
    now()
);

-- Q5: ABS usage
INSERT INTO exercise_quiz_questions (id, exercise_id, question_text, question_type, order_index, difficulty, points, time_limit, explanation_text, created_at)
VALUES (v_q5, v_ex2b,
    '{"en": "With ABS, how should you brake on ice?", "sv": "Med ABS, hur ska du bromsa på is?"}'::jsonb,
    'single_choice', 2, 'Medium', 10, 30,
    '{"en": "Press firmly and hold - let the ABS system pulse and do its job.", "sv": "Tryck stadigt och håll - låt ABS-systemet pulsera och göra sitt jobb."}'::jsonb,
    now()
);

-- Q6: First to freeze
INSERT INTO exercise_quiz_questions (id, exercise_id, question_text, question_type, order_index, difficulty, points, time_limit, explanation_text, created_at)
VALUES (v_q6, v_ex2e,
    '{"en": "Which freezes first?", "sv": "Vad fryser först?"}'::jsonb,
    'multiple_choice', 1, 'Easy', 15, 45,
    '{"en": "Bridges and shaded areas freeze first - cold air underneath and no sun warming.", "sv": "Broar och skuggiga områden fryser först - kall luft undertill och ingen sol som värmer."}'::jsonb,
    now()
);

-- Q7: Oversteer recovery
INSERT INTO exercise_quiz_questions (id, exercise_id, question_text, question_type, order_index, difficulty, points, time_limit, explanation_text, created_at)
VALUES (v_q7, v_ex3a,
    '{"en": "Rear wheels sliding - what do you do?", "sv": "Bakhjulen glider - vad gör du?"}'::jsonb,
    'single_choice', 1, 'Hard', 20, 30,
    '{"en": "Look and steer where you want to go. Don''t slam brakes or overcorrect.", "sv": "Titta och styr dit du vill åka. Trampa inte på bromsen eller överkorrigera."}'::jsonb,
    now()
);

-- Q8: Emergency kit
INSERT INTO exercise_quiz_questions (id, exercise_id, question_text, question_type, order_index, difficulty, points, time_limit, explanation_text, created_at)
VALUES (v_q8, v_ex3d,
    '{"en": "What can warm a car in an emergency?", "sv": "Vad kan värma en bil i en nödsituation?"}'::jsonb,
    'single_choice', 1, 'Easy', 10, 30,
    '{"en": "A single candle can provide enough heat to keep you warm in a stranded car.", "sv": "Ett enda stearinljus kan ge tillräckligt med värme för att hålla dig varm i en strandsatt bil."}'::jsonb,
    now()
);

-- ============================================================
-- QUIZ ANSWERS
-- ============================================================

-- A1: Black ice
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q1, '{"en": "It''s invisible - looks like wet road", "sv": "Den är osynlig - ser ut som våt väg"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q1, '{"en": "It''s the coldest type of ice", "sv": "Det är den kallaste typen av is"}'::jsonb, false, 2, now()),
(gen_random_uuid(), v_q1, '{"en": "It only forms at night", "sv": "Den bildas bara på natten"}'::jsonb, false, 3, now()),
(gen_random_uuid(), v_q1, '{"en": "It makes a loud cracking sound", "sv": "Den gör ett högt knakande ljud"}'::jsonb, false, 4, now());

-- A2: Roof snow
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q2, '{"en": "It slides onto windshield when braking", "sv": "Den glider ner på vindrutan vid inbromsning"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q2, '{"en": "It''s illegal to have snow on roof", "sv": "Det är olagligt att ha snö på taket"}'::jsonb, false, 2, now()),
(gen_random_uuid(), v_q2, '{"en": "It damages the car paint", "sv": "Det skadar billacken"}'::jsonb, false, 3, now()),
(gen_random_uuid(), v_q2, '{"en": "It adds too much weight", "sv": "Det tillför för mycket vikt"}'::jsonb, false, 4, now());

-- A3: Fuel level
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q3, '{"en": "Half tank", "sv": "Halvtank"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q3, '{"en": "Quarter tank", "sv": "Kvartstank"}'::jsonb, false, 2, now()),
(gen_random_uuid(), v_q3, '{"en": "Full tank always", "sv": "Alltid full tank"}'::jsonb, false, 3, now()),
(gen_random_uuid(), v_q3, '{"en": "Doesn''t matter in winter", "sv": "Spelar ingen roll på vintern"}'::jsonb, false, 4, now());

-- A4: Stopping distance multiplier
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q4, '{"en": "Up to 10 times longer", "sv": "Upp till 10 gånger längre"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q4, '{"en": "2 times longer", "sv": "2 gånger längre"}'::jsonb, false, 2, now()),
(gen_random_uuid(), v_q4, '{"en": "Same with winter tires", "sv": "Samma med vinterdäck"}'::jsonb, false, 3, now()),
(gen_random_uuid(), v_q4, '{"en": "5 times longer", "sv": "5 gånger längre"}'::jsonb, false, 4, now());

-- A5: ABS braking
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q5, '{"en": "Press firmly and hold", "sv": "Tryck stadigt och håll"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q5, '{"en": "Pump the brakes quickly", "sv": "Pumpa bromsarna snabbt"}'::jsonb, false, 2, now()),
(gen_random_uuid(), v_q5, '{"en": "Tap brakes lightly", "sv": "Tryck lätt på bromsarna"}'::jsonb, false, 3, now()),
(gen_random_uuid(), v_q5, '{"en": "Turn off ABS first", "sv": "Stäng av ABS först"}'::jsonb, false, 4, now());

-- A6: First to freeze (multiple correct)
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q6, '{"en": "Bridges", "sv": "Broar"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q6, '{"en": "Shaded areas", "sv": "Skuggiga områden"}'::jsonb, true, 2, now()),
(gen_random_uuid(), v_q6, '{"en": "Sunny parking lots", "sv": "Soliga parkeringar"}'::jsonb, false, 3, now()),
(gen_random_uuid(), v_q6, '{"en": "Underground garages", "sv": "Underjordiska garage"}'::jsonb, false, 4, now());

-- A7: Oversteer
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q7, '{"en": "Steer where you want to go", "sv": "Styr dit du vill åka"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q7, '{"en": "Slam the brakes hard", "sv": "Trampa hårt på bromsen"}'::jsonb, false, 2, now()),
(gen_random_uuid(), v_q7, '{"en": "Steer the opposite direction", "sv": "Styr åt motsatt håll"}'::jsonb, false, 3, now()),
(gen_random_uuid(), v_q7, '{"en": "Accelerate to regain control", "sv": "Accelerera för att återfå kontroll"}'::jsonb, false, 4, now());

-- A8: Emergency heat
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q8, '{"en": "A single candle", "sv": "Ett enda stearinljus"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q8, '{"en": "Running the engine continuously", "sv": "Köra motorn kontinuerligt"}'::jsonb, false, 2, now()),
(gen_random_uuid(), v_q8, '{"en": "Opening windows slightly", "sv": "Öppna fönstren lite"}'::jsonb, false, 3, now()),
(gen_random_uuid(), v_q8, '{"en": "Honking the horn", "sv": "Tuta i hornet"}'::jsonb, false, 4, now());

RAISE NOTICE '✓ Created Winter Driving Mastery (bite-sized version)';
RAISE NOTICE '  - 13 exercises in 3 modules';
RAISE NOTICE '  - 8 quiz questions';
RAISE NOTICE '  - Learning Path ID: %', v_lp_id;

END $$;

-- Verification
SELECT 'Learning Path' as type, title->>'en' as name FROM learning_paths WHERE title->>'en' = 'Winter Driving Mastery'
UNION ALL
SELECT 'Exercises' as type, COUNT(*)::text FROM learning_path_exercises e JOIN learning_paths lp ON e.learning_path_id = lp.id WHERE lp.title->>'en' = 'Winter Driving Mastery'
UNION ALL
SELECT 'Quiz Questions' as type, COUNT(*)::text FROM exercise_quiz_questions q JOIN learning_path_exercises e ON q.exercise_id = e.id JOIN learning_paths lp ON e.learning_path_id = lp.id WHERE lp.title->>'en' = 'Winter Driving Mastery';
