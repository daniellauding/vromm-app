-- ============================================================
-- WINTER DRIVING FEATURED CONTENT
-- Complete learning path with exercises and quizzes
-- Run this in Supabase SQL Editor
-- ============================================================

-- Generate consistent UUIDs for relationships
DO $$
DECLARE
    -- Learning Path ID
    v_learning_path_id UUID := gen_random_uuid();

    -- Exercise IDs (for quiz relationships)
    v_ex1_id UUID := gen_random_uuid();  -- Understanding Winter Conditions
    v_ex2_id UUID := gen_random_uuid();  -- Pre-Drive Winter Check
    v_ex3_id UUID := gen_random_uuid();  -- Starting on Ice/Snow
    v_ex4_id UUID := gen_random_uuid();  -- Braking on Slippery Surfaces
    v_ex5_id UUID := gen_random_uuid();  -- Steering in Winter
    v_ex6_id UUID := gen_random_uuid();  -- Speed Adaptation
    v_ex7_id UUID := gen_random_uuid();  -- Following Distance
    v_ex8_id UUID := gen_random_uuid();  -- Skid Recovery
    v_ex9_id UUID := gen_random_uuid();  -- Hill Starts in Winter
    v_ex10_id UUID := gen_random_uuid(); -- Visibility in Winter
    v_ex11_id UUID := gen_random_uuid(); -- Parking in Snow
    v_ex12_id UUID := gen_random_uuid(); -- Emergency Winter Kit

    -- Quiz Question IDs
    v_q1_id UUID := gen_random_uuid();
    v_q2_id UUID := gen_random_uuid();
    v_q3_id UUID := gen_random_uuid();
    v_q4_id UUID := gen_random_uuid();
    v_q5_id UUID := gen_random_uuid();
    v_q6_id UUID := gen_random_uuid();
    v_q7_id UUID := gen_random_uuid();
    v_q8_id UUID := gen_random_uuid();
    v_q9_id UUID := gen_random_uuid();
    v_q10_id UUID := gen_random_uuid();

BEGIN

-- ============================================================
-- 1. CREATE LEARNING PATH
-- ============================================================

INSERT INTO learning_paths (
    id,
    title,
    description,
    icon,
    image,
    is_featured,
    active,
    vehicle_type,
    experience_level,
    created_at,
    updated_at
) VALUES (
    v_learning_path_id,
    '{"en": "Winter Driving Mastery", "sv": "Behärska vinterkörning"}'::jsonb,
    '{"en": "Master safe driving techniques for snow, ice, and challenging winter conditions. Learn how to handle your vehicle when roads are slippery, visibility is reduced, and temperatures drop. Essential skills for every driver in Nordic climates.", "sv": "Behärska säkra körtekniker för snö, is och utmanande vinterförhållanden. Lär dig hur du hanterar ditt fordon när vägarna är hala, sikten är nedsatt och temperaturen sjunker. Viktiga färdigheter för varje förare i nordiskt klimat."}'::jsonb,
    'snowflake',
    'https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=800',
    false,  -- is_featured: false until you activate in admin
    false,  -- active: false until you activate in admin
    'car',
    'beginner',
    now(),
    now()
);

RAISE NOTICE 'Created Learning Path: %', v_learning_path_id;

-- ============================================================
-- 2. CREATE EXERCISES
-- ============================================================

INSERT INTO learning_path_exercises (
    id,
    learning_path_id,
    title,
    description,
    order_index,
    repeat_count,
    completed,
    is_featured,
    has_quiz,
    quiz_required,
    quiz_pass_score,
    show_quiz,
    icon,
    created_at,
    updated_at
) VALUES

-- Exercise 1: Understanding Winter Conditions (with quiz)
(
    v_ex1_id,
    v_learning_path_id,
    '{"en": "Understanding Winter Road Conditions", "sv": "Förstå vintervägsförhållanden"}'::jsonb,
    '{"en": "Learn to recognize different types of winter road conditions including black ice, packed snow, slush, and wet ice. Understanding these conditions is crucial for adapting your driving style. Black ice is particularly dangerous as it is nearly invisible. Packed snow offers more grip than ice but less than dry roads. Slush can cause hydroplaning at higher speeds. This knowledge forms the foundation of safe winter driving.", "sv": "Lär dig känna igen olika typer av vintervägsförhållanden inklusive svartis, packad snö, slask och våt is. Att förstå dessa förhållanden är avgörande för att anpassa din körstil. Svartis är särskilt farlig eftersom den är nästan osynlig. Packad snö ger bättre grepp än is men sämre än torra vägar. Slask kan orsaka vattenplaning vid högre hastigheter. Denna kunskap utgör grunden för säker vinterkörning."}'::jsonb,
    1,
    3,
    false,
    false,  -- is_featured: false until you activate in admin
    true,   -- Has quiz
    false, -- Quiz not required
    70,    -- Pass score
    true,  -- Show quiz
    'eye',
    now(),
    now()
),

-- Exercise 2: Pre-Drive Winter Check (with quiz)
(
    v_ex2_id,
    v_learning_path_id,
    '{"en": "Pre-Drive Winter Safety Check", "sv": "Säkerhetskontroll före vinterkörning"}'::jsonb,
    '{"en": "Before driving in winter conditions, perform essential safety checks. Clear all snow and ice from windows, mirrors, lights, and roof. Check that wipers work and washer fluid is topped up with winter-grade fluid. Verify tire pressure (cold weather reduces pressure) and ensure winter tires are properly installed. Test that all lights function correctly as visibility is crucial in winter. Keep fuel tank at least half full to prevent fuel line freezing.", "sv": "Innan du kör i vinterförhållanden, utför viktiga säkerhetskontroller. Rensa bort all snö och is från fönster, speglar, lampor och tak. Kontrollera att vindrutetorkarna fungerar och att spolarvätska är fylld med vintervätska. Verifiera däcktrycket (kallt väder minskar trycket) och se till att vinterdäcken är korrekt monterade. Testa att alla lampor fungerar korrekt eftersom sikt är avgörande på vintern. Håll bränsletanken minst halvfull för att förhindra att bränsleledningarna fryser."}'::jsonb,
    2,
    5,
    false,
    false,  -- is_featured: false until you activate in admin
    true,   -- Has quiz
    false,
    70,
    true,
    'clipboard-check',
    now(),
    now()
),

-- Exercise 3: Starting on Ice/Snow
(
    v_ex3_id,
    v_learning_path_id,
    '{"en": "Starting on Ice and Snow", "sv": "Starta på is och snö"}'::jsonb,
    '{"en": "Practice smooth starts on slippery surfaces. Use gentle throttle inputs to prevent wheel spin. In manual cars, consider starting in second gear to reduce torque. For automatic vehicles, use winter/snow mode if available. If wheels spin, ease off the accelerator immediately. Rock the car gently if stuck by alternating between forward and reverse. Sand, cat litter, or floor mats can provide traction under spinning wheels.", "sv": "Öva mjuka starter på hala underlag. Använd försiktig gasinput för att förhindra hjulspinn. I manuella bilar, överväg att starta i tvåan för att minska vridmomentet. För automatväxlade fordon, använd vinter/snöläge om tillgängligt. Om hjulen spinner, lätta på gasen omedelbart. Vagga bilen försiktigt om du fastnat genom att växla mellan framåt och bakåt. Sand, kattströ eller golvmattor kan ge grepp under snurrande hjul."}'::jsonb,
    3,
    10,
    false,
    false,
    false,
    false,
    70,
    false,
    'play-circle',
    now(),
    now()
),

-- Exercise 4: Braking on Slippery Surfaces (with quiz)
(
    v_ex4_id,
    v_learning_path_id,
    '{"en": "Braking on Slippery Surfaces", "sv": "Bromsning på hala underlag"}'::jsonb,
    '{"en": "Master safe braking techniques for winter conditions. Apply brakes gently and early - stopping distances can be 10 times longer on ice. If your car has ABS, press firmly and let the system work. Without ABS, use threshold braking: apply pressure until wheels start to lock, then ease off slightly. Always brake in a straight line when possible. Engine braking (downshifting) helps slow the car without activating brakes.", "sv": "Behärska säkra bromstekniker för vinterförhållanden. Bromsa försiktigt och tidigt - bromssträckan kan vara 10 gånger längre på is. Om din bil har ABS, tryck stadigt och låt systemet arbeta. Utan ABS, använd tröskelbromsning: applicera tryck tills hjulen börjar låsa sig, sedan lätta lite. Bromsa alltid i rak linje när det är möjligt. Motorbroms (nedväxling) hjälper till att sakta ner bilen utan att aktivera bromsarna."}'::jsonb,
    4,
    15,
    false,
    false,  -- is_featured: false until you activate in admin
    true,   -- Has quiz
    true,   -- Quiz required
    70,
    true,
    'stop-circle',
    now(),
    now()
),

-- Exercise 5: Steering in Winter
(
    v_ex5_id,
    v_learning_path_id,
    '{"en": "Smooth Steering Techniques", "sv": "Mjuka styrtekniker"}'::jsonb,
    '{"en": "Develop smooth, gentle steering habits for winter driving. Avoid sudden steering inputs that can break traction. Use small, gradual movements. If the car starts to slide, look where you want to go and steer gently in that direction. Keep both hands on the wheel for maximum control. Practice figure-8 patterns in empty parking lots to feel how the car responds to steering inputs on snow.", "sv": "Utveckla mjuka, försiktiga styrvanor för vinterkörning. Undvik plötsliga styrrörelser som kan bryta greppet. Använd små, gradvisa rörelser. Om bilen börjar glida, titta dit du vill åka och styr försiktigt i den riktningen. Håll båda händerna på ratten för maximal kontroll. Öva åttamönster på tomma parkeringsplatser för att känna hur bilen reagerar på styrning på snö."}'::jsonb,
    5,
    12,
    false,
    false,
    false,
    false,
    70,
    false,
    'navigation',
    now(),
    now()
),

-- Exercise 6: Speed Adaptation (with quiz)
(
    v_ex6_id,
    v_learning_path_id,
    '{"en": "Speed Adaptation for Conditions", "sv": "Hastighetsanpassning för förhållanden"}'::jsonb,
    '{"en": "Learn to adapt your speed to winter conditions. The posted speed limit is for ideal conditions - winter often requires driving well below it. Reduce speed by at least 30-50% on snow, and even more on ice. Watch for changing conditions: shadows, bridges, and overpasses freeze first. Maintain a consistent speed to avoid sudden acceleration or deceleration. Use cruise control sparingly as it may cause wheel spin on slippery patches.", "sv": "Lär dig anpassa hastigheten till vinterförhållanden. Hastighetsgränsen gäller för idealiska förhållanden - vinter kräver ofta körning långt under den. Minska hastigheten med minst 30-50% på snö, och ännu mer på is. Var uppmärksam på förändrade förhållanden: skuggor, broar och viadukter fryser först. Håll en jämn hastighet för att undvika plötslig acceleration eller inbromsning. Använd farthållare sparsamt eftersom det kan orsaka hjulspinn på hala fläckar."}'::jsonb,
    6,
    8,
    false,
    false,
    true,  -- Has quiz
    false,
    70,
    true,
    'gauge',
    now(),
    now()
),

-- Exercise 7: Following Distance
(
    v_ex7_id,
    v_learning_path_id,
    '{"en": "Maintaining Safe Following Distance", "sv": "Hålla säkert avstånd"}'::jsonb,
    '{"en": "Increase your following distance significantly in winter. The normal 3-second rule should become 8-10 seconds on snow and ice. This extra space gives you time to react and stop safely. Watch the car ahead for sudden movements or brake lights. Leave extra space when following large vehicles that may block your view of the road ahead. Remember: if you cannot stop safely, you are following too closely.", "sv": "Öka ditt avstånd betydligt på vintern. Den normala 3-sekundersregeln bör bli 8-10 sekunder på snö och is. Detta extra utrymme ger dig tid att reagera och stanna säkert. Titta på bilen framför för plötsliga rörelser eller bromsljus. Lämna extra utrymme när du följer stora fordon som kan blockera din sikt på vägen framför. Kom ihåg: om du inte kan stanna säkert följer du för nära."}'::jsonb,
    7,
    6,
    false,
    false,
    false,
    false,
    70,
    false,
    'arrow-left-right',
    now(),
    now()
),

-- Exercise 8: Skid Recovery (with quiz)
(
    v_ex8_id,
    v_learning_path_id,
    '{"en": "Skid Recovery Techniques", "sv": "Sladdningsteknik"}'::jsonb,
    '{"en": "Learn essential skid recovery skills. For understeer (front wheels sliding), ease off the accelerator and straighten the steering until grip returns. For oversteer (rear wheels sliding), look where you want to go and gently steer in that direction - this is called ''steering into the skid.'' Avoid slamming the brakes during a skid. Stay calm and make smooth corrections. Practice these techniques in a safe, controlled environment.", "sv": "Lär dig viktiga sladdningstekniker. Vid understyrning (framhjulen glider), lätta på gasen och räta upp styrningen tills greppet återkommer. Vid överstyrning (bakhjulen glider), titta dit du vill åka och styr försiktigt i den riktningen - detta kallas ''styra in i sladden.'' Undvik att trampa på bromsarna under en sladd. Var lugn och gör mjuka korrigeringar. Öva dessa tekniker i en säker, kontrollerad miljö."}'::jsonb,
    8,
    10,
    false,
    false,  -- is_featured: false until you activate in admin
    true,   -- Has quiz
    true,   -- Quiz required
    75,     -- Higher pass score for safety
    true,
    'refresh-cw',
    now(),
    now()
),

-- Exercise 9: Hill Starts in Winter
(
    v_ex9_id,
    v_learning_path_id,
    '{"en": "Hill Starts on Ice and Snow", "sv": "Backastart på is och snö"}'::jsonb,
    '{"en": "Master hill starts on slippery winter roads. Use the handbrake to prevent rolling back. Release the clutch very slowly while gently applying throttle. If available, use hill start assist. On icy hills, consider an alternative route if possible. If you must climb, maintain steady momentum - stopping on an icy hill makes restarting very difficult. Going downhill, use engine braking and gentle touches of the brake.", "sv": "Behärska backastarter på hala vintervägar. Använd handbromsen för att förhindra bakåtrullning. Släpp kopplingen mycket långsamt medan du försiktigt ger gas. Om tillgängligt, använd backastarthjälp. På isiga backar, överväg en alternativ väg om möjligt. Om du måste klättra, behåll jämnt momentum - att stanna på en isig backe gör omstart mycket svårt. Vid nedförskörning, använd motorbroms och försiktiga lätta bromsningar."}'::jsonb,
    9,
    8,
    false,
    false,
    false,
    false,
    70,
    false,
    'trending-up',
    now(),
    now()
),

-- Exercise 10: Visibility in Winter
(
    v_ex10_id,
    v_learning_path_id,
    '{"en": "Managing Winter Visibility", "sv": "Hantera vintersikt"}'::jsonb,
    '{"en": "Maintain good visibility in challenging winter conditions. Keep windows completely clear - driving with limited visibility is illegal and dangerous. Use defrost settings effectively. Clean headlights and taillights regularly as road salt and grime accumulate quickly. In heavy snow, use low beam headlights - high beams reflect off snowflakes and reduce visibility. Consider yellow fog lights which penetrate snow and fog better.", "sv": "Behåll god sikt i utmanande vinterförhållanden. Håll rutorna helt rena - att köra med begränsad sikt är olagligt och farligt. Använd avfrostningsinställningar effektivt. Rengör strålkastare och bakljus regelbundet eftersom vägsalt och smuts samlas snabbt. I kraftigt snöfall, använd halvljus - helljus reflekteras mot snöflingor och minskar sikten. Överväg gula dimljus som penetrerar snö och dimma bättre."}'::jsonb,
    10,
    5,
    false,
    false,
    false,
    false,
    70,
    false,
    'eye',
    now(),
    now()
),

-- Exercise 11: Parking in Snow
(
    v_ex11_id,
    v_learning_path_id,
    '{"en": "Winter Parking Strategies", "sv": "Vinterparkeringsstrategier"}'::jsonb,
    '{"en": "Learn smart parking strategies for winter. When possible, park facing east to catch morning sun. Lift windshield wipers off the glass to prevent freezing. Avoid parking near snow piles that may fall on your car. On hills, turn wheels toward the curb and use parking brake. Check that exhaust pipe is clear before starting a parked car. Consider using a windshield cover to prevent ice buildup overnight.", "sv": "Lär dig smarta parkeringsstrategier för vintern. När möjligt, parkera med fronten mot öst för att fånga morgonsolen. Lyft vindrutetorkarna från glaset för att förhindra frysning. Undvik att parkera nära snöhögar som kan falla på din bil. I backar, vrid hjulen mot trottoarkanten och använd parkeringsbromsen. Kontrollera att avgasröret är fritt innan du startar en parkerad bil. Överväg att använda ett vindruteskydd för att förhindra isbildning över natten."}'::jsonb,
    11,
    4,
    false,
    false,
    false,
    false,
    70,
    false,
    'parking-circle',
    now(),
    now()
),

-- Exercise 12: Emergency Winter Kit (with quiz)
(
    v_ex12_id,
    v_learning_path_id,
    '{"en": "Emergency Winter Survival Kit", "sv": "Vinter nödkit"}'::jsonb,
    '{"en": "Prepare an emergency kit for winter driving. Essential items include: ice scraper and snow brush, jumper cables, flashlight with extra batteries, warning triangle, first aid kit, warm blankets, non-perishable snacks and water, phone charger, sand or cat litter for traction, shovel, tow rope, and extra winter clothing. In remote areas, add a candle and matches - a single candle can heat a car interior in an emergency. Check kit contents at the start of each winter.", "sv": "Förbered ett nödkit för vinterkörning. Viktiga föremål inkluderar: isskrapa och snöborste, startkablar, ficklampa med extra batterier, varningstriangel, första hjälpen-kit, varma filtar, hållbara snacks och vatten, telefonladdare, sand eller kattströ för grepp, spade, bogserrep och extra vinterkläder. I avlägsna områden, lägg till ett stearinljus och tändstickor - ett enda ljus kan värma en bilinteriör i en nödsituation. Kontrollera kitets innehåll i början av varje vinter."}'::jsonb,
    12,
    2,
    false,
    false,  -- is_featured: false until you activate in admin
    true,   -- Has quiz
    false,
    70,
    true,
    'package',
    now(),
    now()
);

RAISE NOTICE 'Created 12 exercises';

-- ============================================================
-- 3. CREATE QUIZ QUESTIONS
-- ============================================================

INSERT INTO exercise_quiz_questions (
    id,
    exercise_id,
    question_text,
    question_type,
    order_index,
    difficulty,
    points,
    time_limit,
    explanation_text,
    created_at
) VALUES

-- Questions for Exercise 1: Understanding Winter Conditions
(
    v_q1_id,
    v_ex1_id,
    '{"en": "What makes black ice particularly dangerous?", "sv": "Vad gör svartis särskilt farlig?"}'::jsonb,
    'single_choice',
    1,
    'Medium',
    10,
    60,
    '{"en": "Black ice is dangerous because it is nearly invisible - it appears as a wet road surface but is actually a thin layer of transparent ice.", "sv": "Svartis är farlig eftersom den är nästan osynlig - den ser ut som en våt vägyta men är faktiskt ett tunt lager av transparent is."}'::jsonb,
    now()
),

(
    v_q2_id,
    v_ex1_id,
    '{"en": "Which winter road condition can cause hydroplaning at higher speeds?", "sv": "Vilket vintervägsförhållande kan orsaka vattenplaning vid högre hastigheter?"}'::jsonb,
    'single_choice',
    2,
    'Easy',
    10,
    45,
    '{"en": "Slush (melting snow mixed with water) creates a layer of water on the road that can cause hydroplaning similar to heavy rain.", "sv": "Slask (smältande snö blandat med vatten) skapar ett lager av vatten på vägen som kan orsaka vattenplaning liknande kraftigt regn."}'::jsonb,
    now()
),

-- Questions for Exercise 2: Pre-Drive Winter Check
(
    v_q3_id,
    v_ex2_id,
    '{"en": "Why should you keep your fuel tank at least half full in winter?", "sv": "Varför bör du hålla bränsletanken minst halvfull på vintern?"}'::jsonb,
    'single_choice',
    1,
    'Medium',
    10,
    60,
    '{"en": "A half-full tank prevents condensation from forming in the fuel lines, which can freeze and block fuel flow in cold temperatures.", "sv": "En halvfull tank förhindrar att kondens bildas i bränsleledningarna, vilket kan frysa och blockera bränsleflödet i kalla temperaturer."}'::jsonb,
    now()
),

-- Questions for Exercise 4: Braking on Slippery Surfaces
(
    v_q4_id,
    v_ex4_id,
    '{"en": "How much longer can stopping distances be on ice compared to dry roads?", "sv": "Hur mycket längre kan bromssträckan vara på is jämfört med torra vägar?"}'::jsonb,
    'single_choice',
    1,
    'Medium',
    10,
    45,
    '{"en": "Stopping distances on ice can be up to 10 times longer than on dry roads. This is why early braking and increased following distance are crucial.", "sv": "Bromssträckan på is kan vara upp till 10 gånger längre än på torra vägar. Därför är tidig bromsning och ökat avstånd avgörande."}'::jsonb,
    now()
),

(
    v_q5_id,
    v_ex4_id,
    '{"en": "If your car has ABS, what should you do when braking on ice?", "sv": "Om din bil har ABS, vad ska du göra när du bromsar på is?"}'::jsonb,
    'single_choice',
    2,
    'Medium',
    10,
    60,
    '{"en": "With ABS, you should press the brake pedal firmly and maintain pressure. The system will automatically prevent wheel lock-up.", "sv": "Med ABS ska du trycka stadigt på bromspedalen och hålla trycket. Systemet förhindrar automatiskt att hjulen låser sig."}'::jsonb,
    now()
),

-- Questions for Exercise 6: Speed Adaptation
(
    v_q6_id,
    v_ex6_id,
    '{"en": "Which areas typically freeze first in winter conditions?", "sv": "Vilka områden fryser vanligtvis först i vinterförhållanden?"}'::jsonb,
    'multiple_choice',
    1,
    'Easy',
    15,
    60,
    '{"en": "Bridges, overpasses, and shaded areas freeze before regular road surfaces because they lose heat from both top and bottom, and shadows prevent warming from sunlight.", "sv": "Broar, viadukter och skuggiga områden fryser före vanliga vägytor eftersom de förlorar värme från både topp och botten, och skuggor förhindrar uppvärmning från solljus."}'::jsonb,
    now()
),

-- Questions for Exercise 8: Skid Recovery
(
    v_q7_id,
    v_ex8_id,
    '{"en": "When experiencing oversteer (rear wheels sliding), what should you do?", "sv": "Vid överstyrning (bakhjulen glider), vad ska du göra?"}'::jsonb,
    'single_choice',
    1,
    'Hard',
    15,
    60,
    '{"en": "Steer gently in the direction you want to go (into the skid). This helps the rear wheels regain traction and straighten the car.", "sv": "Styr försiktigt i den riktning du vill åka (in i sladden). Detta hjälper bakhjulen att återfå grepp och räta upp bilen."}'::jsonb,
    now()
),

(
    v_q8_id,
    v_ex8_id,
    '{"en": "What should you AVOID doing during a skid?", "sv": "Vad ska du UNDVIKA att göra under en sladd?"}'::jsonb,
    'single_choice',
    2,
    'Medium',
    10,
    45,
    '{"en": "Avoid slamming the brakes during a skid as this will lock the wheels and make you lose all steering control.", "sv": "Undvik att trampa på bromsarna under en sladd eftersom detta låser hjulen och gör att du förlorar all styrning."}'::jsonb,
    now()
),

-- Questions for Exercise 12: Emergency Kit
(
    v_q9_id,
    v_ex12_id,
    '{"en": "What can a single candle be used for in a winter emergency?", "sv": "Vad kan ett enda stearinljus användas till i en vinternödsituation?"}'::jsonb,
    'single_choice',
    1,
    'Easy',
    10,
    45,
    '{"en": "A single candle can provide enough heat to keep a car interior warm enough for survival in an emergency situation.", "sv": "Ett enda stearinljus kan ge tillräckligt med värme för att hålla en bilinteriör tillräckligt varm för överlevnad i en nödsituation."}'::jsonb,
    now()
),

(
    v_q10_id,
    v_ex12_id,
    '{"en": "What items can help provide traction if your wheels are spinning on ice?", "sv": "Vilka föremål kan hjälpa till att ge grepp om dina hjul spinner på is?"}'::jsonb,
    'multiple_choice',
    2,
    'Easy',
    10,
    60,
    '{"en": "Sand, cat litter, and floor mats can all be placed under spinning wheels to provide traction on ice.", "sv": "Sand, kattströ och golvmattor kan alla placeras under snurrande hjul för att ge grepp på is."}'::jsonb,
    now()
);

RAISE NOTICE 'Created 10 quiz questions';

-- ============================================================
-- 4. CREATE QUIZ ANSWERS
-- ============================================================

-- Answers for Q1: Black ice danger
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q1_id, '{"en": "It is nearly invisible", "sv": "Den är nästan osynlig"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q1_id, '{"en": "It is extremely cold", "sv": "Den är extremt kall"}'::jsonb, false, 2, now()),
(gen_random_uuid(), v_q1_id, '{"en": "It only forms at night", "sv": "Den bildas bara på natten"}'::jsonb, false, 3, now()),
(gen_random_uuid(), v_q1_id, '{"en": "It makes a loud sound when driving over it", "sv": "Den gör ett högt ljud när man kör över den"}'::jsonb, false, 4, now());

-- Answers for Q2: Hydroplaning condition
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q2_id, '{"en": "Black ice", "sv": "Svartis"}'::jsonb, false, 1, now()),
(gen_random_uuid(), v_q2_id, '{"en": "Packed snow", "sv": "Packad snö"}'::jsonb, false, 2, now()),
(gen_random_uuid(), v_q2_id, '{"en": "Slush", "sv": "Slask"}'::jsonb, true, 3, now()),
(gen_random_uuid(), v_q2_id, '{"en": "Frost", "sv": "Frost"}'::jsonb, false, 4, now());

-- Answers for Q3: Fuel tank half full
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q3_id, '{"en": "To prevent fuel line freezing from condensation", "sv": "För att förhindra att bränsleledningarna fryser av kondens"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q3_id, '{"en": "Fuel burns faster in cold weather", "sv": "Bränsle förbränns snabbare i kallt väder"}'::jsonb, false, 2, now()),
(gen_random_uuid(), v_q3_id, '{"en": "It helps the engine start faster", "sv": "Det hjälper motorn att starta snabbare"}'::jsonb, false, 3, now()),
(gen_random_uuid(), v_q3_id, '{"en": "Gas stations are often closed in winter", "sv": "Bensinstationer är ofta stängda på vintern"}'::jsonb, false, 4, now());

-- Answers for Q4: Stopping distance on ice
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q4_id, '{"en": "2 times longer", "sv": "2 gånger längre"}'::jsonb, false, 1, now()),
(gen_random_uuid(), v_q4_id, '{"en": "5 times longer", "sv": "5 gånger längre"}'::jsonb, false, 2, now()),
(gen_random_uuid(), v_q4_id, '{"en": "Up to 10 times longer", "sv": "Upp till 10 gånger längre"}'::jsonb, true, 3, now()),
(gen_random_uuid(), v_q4_id, '{"en": "Same as dry roads with winter tires", "sv": "Samma som torra vägar med vinterdäck"}'::jsonb, false, 4, now());

-- Answers for Q5: ABS braking
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q5_id, '{"en": "Press firmly and maintain pressure", "sv": "Tryck stadigt och håll trycket"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q5_id, '{"en": "Pump the brakes repeatedly", "sv": "Pumpa bromsarna upprepade gånger"}'::jsonb, false, 2, now()),
(gen_random_uuid(), v_q5_id, '{"en": "Press lightly and release quickly", "sv": "Tryck lätt och släpp snabbt"}'::jsonb, false, 3, now()),
(gen_random_uuid(), v_q5_id, '{"en": "Turn off ABS and brake manually", "sv": "Stäng av ABS och bromsa manuellt"}'::jsonb, false, 4, now());

-- Answers for Q6: First to freeze (multiple choice)
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q6_id, '{"en": "Bridges and overpasses", "sv": "Broar och viadukter"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q6_id, '{"en": "Shaded areas", "sv": "Skuggiga områden"}'::jsonb, true, 2, now()),
(gen_random_uuid(), v_q6_id, '{"en": "Sunny parking lots", "sv": "Soliga parkeringsplatser"}'::jsonb, false, 3, now()),
(gen_random_uuid(), v_q6_id, '{"en": "Underground tunnels", "sv": "Underjordiska tunnlar"}'::jsonb, false, 4, now());

-- Answers for Q7: Oversteer recovery
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q7_id, '{"en": "Steer in the direction you want to go", "sv": "Styr i den riktning du vill åka"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q7_id, '{"en": "Steer in the opposite direction", "sv": "Styr i motsatt riktning"}'::jsonb, false, 2, now()),
(gen_random_uuid(), v_q7_id, '{"en": "Hold the steering wheel straight", "sv": "Håll ratten rak"}'::jsonb, false, 3, now()),
(gen_random_uuid(), v_q7_id, '{"en": "Turn the steering wheel fully to lock", "sv": "Vrid ratten helt till låsning"}'::jsonb, false, 4, now());

-- Answers for Q8: What to avoid during skid
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q8_id, '{"en": "Slamming the brakes", "sv": "Trampa på bromsarna"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q8_id, '{"en": "Looking where you want to go", "sv": "Titta dit du vill åka"}'::jsonb, false, 2, now()),
(gen_random_uuid(), v_q8_id, '{"en": "Staying calm", "sv": "Vara lugn"}'::jsonb, false, 3, now()),
(gen_random_uuid(), v_q8_id, '{"en": "Making smooth corrections", "sv": "Göra mjuka korrigeringar"}'::jsonb, false, 4, now());

-- Answers for Q9: Candle use
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q9_id, '{"en": "To heat the car interior for survival", "sv": "För att värma bilinteriören för överlevnad"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q9_id, '{"en": "To signal for help", "sv": "För att signalera efter hjälp"}'::jsonb, false, 2, now()),
(gen_random_uuid(), v_q9_id, '{"en": "To melt ice off windows", "sv": "För att smälta is från rutorna"}'::jsonb, false, 3, now()),
(gen_random_uuid(), v_q9_id, '{"en": "To light the road ahead", "sv": "För att lysa upp vägen framför"}'::jsonb, false, 4, now());

-- Answers for Q10: Traction items (multiple choice)
INSERT INTO exercise_quiz_answers (id, question_id, answer_text, is_correct, order_index, created_at) VALUES
(gen_random_uuid(), v_q10_id, '{"en": "Sand", "sv": "Sand"}'::jsonb, true, 1, now()),
(gen_random_uuid(), v_q10_id, '{"en": "Cat litter", "sv": "Kattströ"}'::jsonb, true, 2, now()),
(gen_random_uuid(), v_q10_id, '{"en": "Floor mats", "sv": "Golvmattor"}'::jsonb, true, 3, now()),
(gen_random_uuid(), v_q10_id, '{"en": "Newspapers", "sv": "Tidningar"}'::jsonb, false, 4, now());

RAISE NOTICE 'Created quiz answers';
RAISE NOTICE '============================================';
RAISE NOTICE 'WINTER DRIVING CONTENT CREATED SUCCESSFULLY';
RAISE NOTICE 'Learning Path ID: %', v_learning_path_id;
RAISE NOTICE '============================================';

END $$;

-- ============================================================
-- VERIFICATION QUERIES (Run after to confirm)
-- ============================================================

-- Check learning path was created
SELECT id, title->>'en' as title_en, is_featured
FROM learning_paths
WHERE title->>'en' = 'Winter Driving Mastery';

-- Check exercises were created
SELECT e.order_index, e.title->>'en' as title, e.has_quiz, e.is_featured
FROM learning_path_exercises e
JOIN learning_paths lp ON e.learning_path_id = lp.id
WHERE lp.title->>'en' = 'Winter Driving Mastery'
ORDER BY e.order_index;

-- Check quiz questions were created
SELECT q.question_text->>'en' as question, q.question_type, q.difficulty,
       (SELECT COUNT(*) FROM exercise_quiz_answers WHERE question_id = q.id) as answer_count
FROM exercise_quiz_questions q
JOIN learning_path_exercises e ON q.exercise_id = e.id
JOIN learning_paths lp ON e.learning_path_id = lp.id
WHERE lp.title->>'en' = 'Winter Driving Mastery'
ORDER BY q.order_index;
