-- Swedish translations for Beta Testing Checklist items
-- Run this in Supabase SQL Editor

-- Student checklist translations
INSERT INTO public.translations (platform, language, key, value, created_at, updated_at) VALUES
('mobile', 'en', 'beta.checklist.student.connect_supervisor.title', 'Connect with a supervisor', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.student.connect_supervisor.title', 'Anslut till en handledare', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.student.connect_supervisor.description', 'Find and connect with a supervisor through the app', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.student.connect_supervisor.description', 'Hitta och anslut till en handledare via appen', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.student.browse_routes.title', 'Browse driving routes', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.student.browse_routes.title', 'Bläddra bland körr​utter', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.student.browse_routes.description', 'Explore available routes in your area', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.student.browse_routes.description', 'Utforska tillgängliga rutter i ditt område', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.student.create_account.title', 'Create your student account', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.student.create_account.title', 'Skapa ditt elevkonto', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.student.create_account.description', 'Complete the registration process and set up your profile', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.student.create_account.description', 'Slutför registreringen och skapa din profil', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.student.join_session.title', 'Join a practice session', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.student.join_session.title', 'Gå med i en övningssession', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.student.join_session.description', 'Participate in a group practice session or theory test event', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.student.join_session.description', 'Delta i en gruppövning eller teoriprovsevenemang', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.student.complete_exercise.title', 'Complete a practice exercise', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.student.complete_exercise.title', 'Slutför en övning', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.student.complete_exercise.description', 'Try at least one interactive exercise along a route', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.student.complete_exercise.description', 'Prova minst en interaktiv övning längs en rutt', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.student.test_features.title', 'Test core features', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.student.test_features.title', 'Testa kärnfunktioner', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.student.test_features.description', 'Spend 15-20 minutes exploring the main app features', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.student.test_features.description', 'Ägna 15-20 minuter åt att utforska appens huvudfunktioner', NOW(), NOW()),

-- Supervisor checklist translations
('mobile', 'en', 'beta.checklist.supervisor.create_supervisor_account.title', 'Create supervisor account', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.supervisor.create_supervisor_account.title', 'Skapa handledarekonto', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.supervisor.create_supervisor_account.description', 'Set up your account and verify credentials', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.supervisor.create_supervisor_account.description', 'Skapa ditt konto och verifiera dina uppgifter', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.supervisor.guide_student_route.title', 'Guide student through route', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.supervisor.guide_student_route.title', 'Vägled elev genom rutt', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.supervisor.guide_student_route.description', 'Use the app to guide a student through a practice route', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.supervisor.guide_student_route.description', 'Använd appen för att vägleda en elev genom en övningsrutt', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.supervisor.provide_realtime_feedback.title', 'Provide real-time feedback', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.supervisor.provide_realtime_feedback.title', 'Ge feedback i realtid', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.supervisor.provide_realtime_feedback.description', 'Give feedback during a driving session using app features', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.supervisor.provide_realtime_feedback.description', 'Ge feedback under en körlektion med hjälp av appens funktioner', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.supervisor.track_student_improvement.title', 'Track student improvement', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.supervisor.track_student_improvement.title', 'Följ elevens framsteg', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.supervisor.track_student_improvement.description', 'Monitor and log student progress over multiple sessions', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.supervisor.track_student_improvement.description', 'Övervaka och logga elevens framsteg över flera sessioner', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.supervisor.coordinate_with_instructors.title', 'Coordinate with instructors', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.supervisor.coordinate_with_instructors.title', 'Samordna med lärare', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.supervisor.coordinate_with_instructors.description', 'Communicate with driving schools or instructors through the app', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.supervisor.coordinate_with_instructors.description', 'Kommunicera med körskolor eller lärare via appen', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.supervisor.use_safety_features.title', 'Use safety features', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.supervisor.use_safety_features.title', 'Använd säkerhetsfunktioner', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.supervisor.use_safety_features.description', 'Test emergency and safety features during practice sessions', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.supervisor.use_safety_features.description', 'Testa nöd- och säkerhetsfunktioner under övningstillfällen', NOW(), NOW()),

-- Instructor checklist translations
('mobile', 'en', 'beta.checklist.instructor.setup_profile.title', 'Set up instructor profile', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.instructor.setup_profile.title', 'Skapa lärarprofil', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.instructor.setup_profile.description', 'Complete your instructor profile and verification', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.instructor.setup_profile.description', 'Slutför din lärarprofil och verifiering', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.instructor.create_routes.title', 'Create driving routes', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.instructor.create_routes.title', 'Skapa körrutter', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.instructor.create_routes.description', 'Create at least 3 driving routes for your students', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.instructor.create_routes.description', 'Skapa minst 3 körrutter för dina elever', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.instructor.invite_students.title', 'Invite students', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.instructor.invite_students.title', 'Bjud in elever', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.instructor.invite_students.description', 'Invite students to join your supervision', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.instructor.invite_students.description', 'Bjud in elever att gå med i din handledning', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.instructor.test_supervision.title', 'Test supervision features', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.instructor.test_supervision.title', 'Testa handledningsfunktioner', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.instructor.test_supervision.description', 'Test the supervision and monitoring features', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.instructor.test_supervision.description', 'Testa handlednings- och övervakningsfunktionerna', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.instructor.provide_feedback.title', 'Provide student feedback', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.instructor.provide_feedback.title', 'Ge elevfeedback', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.instructor.provide_feedback.description', 'Give feedback to at least one student', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.instructor.provide_feedback.description', 'Ge feedback till minst en elev', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.instructor.test_analytics.title', 'Test analytics dashboard', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.instructor.test_analytics.title', 'Testa analyspanelen', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.instructor.test_analytics.description', 'Explore the analytics and progress tracking features', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.instructor.test_analytics.description', 'Utforska analys- och framstegsspårningsfunktionerna', NOW(), NOW()),

-- School checklist translations
('mobile', 'en', 'beta.checklist.school.setup_school.title', 'Set up school profile', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.school.setup_school.title', 'Skapa skolprofil', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.school.setup_school.description', 'Complete your school profile and verification', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.school.setup_school.description', 'Slutför din skolprofil och verifiering', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.school.create_instructors.title', 'Add instructors', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.school.create_instructors.title', 'Lägg till lärare', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.school.create_instructors.description', 'Add instructor accounts to your school', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.school.create_instructors.description', 'Lägg till lärarkonton till din skola', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.school.create_students.title', 'Add students', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.school.create_students.title', 'Lägg till elever', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.school.create_students.description', 'Add student accounts to your school', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.school.create_students.description', 'Lägg till elevkonton till din skola', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.school.test_management.title', 'Test management features', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.school.test_management.title', 'Testa administrationsfunktioner', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.school.test_management.description', 'Test the school management and administration features', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.school.test_management.description', 'Testa skolans administrations- och hanteringsfunktioner', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.school.test_reporting.title', 'Test reporting', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.school.test_reporting.title', 'Testa rapportering', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.school.test_reporting.description', 'Test the reporting and analytics features', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.school.test_reporting.description', 'Testa rapporterings- och analysfunktionerna', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.school.test_billing.title', 'Test billing features', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.school.test_billing.title', 'Testa faktureringsfunktioner', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.school.test_billing.description', 'Test the billing and payment features', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.school.test_billing.description', 'Testa fakturerings- och betalningsfunktionerna', NOW(), NOW()),

-- Other/Stress Test checklist translations
('mobile', 'en', 'beta.checklist.other.browse_interface.title', 'Browse the app interface', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.other.browse_interface.title', 'Bläddra i appens gränssnitt', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.other.browse_interface.description', 'Navigate through all main sections and explore the app structure', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.other.browse_interface.description', 'Navigera genom alla huvudavsnitt och utforska appens struktur', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.other.test_navigation.title', 'Test basic navigation flows', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.other.test_navigation.title', 'Testa grundläggande navigationsflöden', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.other.test_navigation.description', 'Test moving between different screens and features', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.other.test_navigation.description', 'Testa navigering mellan olika skärmar och funktioner', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.other.check_performance.title', 'Check app performance and loading', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.other.check_performance.title', 'Kontrollera appens prestanda och laddning', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.other.check_performance.description', 'Monitor loading times, responsiveness, and overall app speed', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.other.check_performance.description', 'Övervaka laddningstider, responsivitet och appens totala hastighet', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.other.test_edge_cases.title', 'Test edge cases and error handling', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.other.test_edge_cases.title', 'Testa kantfall och felhantering', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.other.test_edge_cases.description', 'Try unusual inputs, poor network conditions, and error scenarios', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.other.test_edge_cases.description', 'Prova ovanliga inmatningar, dåliga nätverksförhållanden och felscenarier', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.other.stress_test.title', 'Stress test core features', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.other.stress_test.title', 'Stresstesta kärnfunktioner', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.other.stress_test.description', 'Use features intensively to find performance issues and bottlenecks', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.other.stress_test.description', 'Använd funktioner intensivt för att hitta prestandaproblem och flaskhalsar', NOW(), NOW()),

('mobile', 'en', 'beta.checklist.other.document_usability.title', 'Document general usability issues', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.other.document_usability.title', 'Dokumentera allmänna användbarhetsproblem', NOW(), NOW()),
('mobile', 'en', 'beta.checklist.other.document_usability.description', 'Note any confusing UI elements, unclear instructions, or usability problems', NOW(), NOW()),
('mobile', 'sv', 'beta.checklist.other.document_usability.description', 'Notera förvirrande UI-element, oklara instruktioner eller användarbarhetsproblem', NOW(), NOW()),

-- Additional Beta Testing UI translations
('mobile', 'en', 'beta.completed', 'Completed', NOW(), NOW()),
('mobile', 'sv', 'beta.completed', 'Slutförd', NOW(), NOW())
ON CONFLICT (platform, language, key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

