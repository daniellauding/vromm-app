/**
 * Tour Configuration Examples
 *
 * This file contains example tour configurations for different screens and components.
 * Tours can be defined here for quick testing, or stored in the database `content` table.
 *
 * Database tour content structure:
 * {
 *   key: "tour.screen.ProgressScreen.step1",
 *   content_type: "tour",
 *   title: { en: "Welcome", sv: "Välkommen" },
 *   body: { en: "...", sv: "..." },
 *   target: "ProgressScreen",
 *   platforms: ["mobile", "both"],
 *   order_index: 1,
 *   active: true,
 *   metadata: {
 *     targetElement: "FilterButton",
 *     position: "bottom",
 *     action: { type: "navigate", target: "MenuTab" },
 *     preAction: { type: "scrollTo", target: "FilterButton" },
 *     scrollToElement: true,
 *     scrollOffset: 100
 *   }
 * }
 */

import { TourStep, TourAction } from '../contexts/TourContext';

// ============================================================================
// COMPREHENSIVE MAIN APP TOUR (17 steps with cross-screen navigation)
// NOTE: scrollToElement disabled - requires FlatList scroll handler integration
// ============================================================================
export const COMPREHENSIVE_APP_TOUR: TourStep[] = [
  // Step 1: Welcome
  {
    id: 'welcome',
    title: 'Välkommen till Vromm! 🚗',
    content: 'Låt oss ta en snabb rundtur i appen. Vi visar dig allt du behöver för att börja din körresa!',
    targetScreen: 'HomeTab',
    position: 'center',
  },
  // Step 2: Weekly Goal (visible at top)
  {
    id: 'weekly-goal',
    title: 'Veckomål',
    content: 'Här ser du dina veckomål. Sätt upp mål för hur ofta du vill öva och följ din framgång!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.WeeklyGoal',
    position: 'bottom',
  },
  // Step 3: Daily Status (visible at top)
  {
    id: 'daily-status',
    title: 'Daglig Status',
    content: 'Se vilka dagar du övat och vad du gjorde. Tryck på en dag för att se detaljer!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.DailyStatus',
    position: 'bottom',
  },
  // Step 4: Map Preview
  {
    id: 'map-preview',
    title: 'Kartöversikt',
    content: 'En snabb titt på kartan med övningsrutter nära dig. Tryck för att utforska mer!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.MapPreview',
    position: 'top',
  },
  // Step 5: Getting Started
  {
    id: 'getting-started',
    title: 'Kom igång',
    content: 'Snabbstartguide för nya förare. Följ stegen för att komma igång med övningskörningen!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.GettingStarted',
    position: 'bottom',
  },
  // Step 6: Progress Section (auto-scroll)
  {
    id: 'progress-overview',
    title: 'Din Framsteg',
    content: 'Här ser du din totala framsteg i körkortsplanen. Procenten visar hur långt du kommit!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.ProgressSection',
    position: 'top',
    scrollToElement: true,
    scrollOffset: 150,
  },
  // Step 7: Saved Routes (auto-scroll)
  {
    id: 'saved-routes',
    title: 'Sparade Rutter',
    content: 'Rutter du sparat för senare. Hitta enkelt tillbaka till favoriter!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.SavedRoutes',
    position: 'top',
    scrollToElement: true,
    scrollOffset: 150,
  },
  // Step 8: Driven Routes (auto-scroll)
  {
    id: 'driven-routes',
    title: 'Körda Rutter',
    content: 'Rutter du redan kört. Markera rutter som körda för att följa din framsteg!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.DrivenRoutes',
    position: 'top',
    scrollToElement: true,
    scrollOffset: 150,
  },
  // Step 9: Created Routes (auto-scroll)
  {
    id: 'created-routes',
    title: 'Skapade Rutter',
    content: 'Rutter du själv skapat. Dela med handledare eller andra elever!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.CreatedRoutes',
    position: 'top',
    scrollToElement: true,
    scrollOffset: 150,
  },
  // Step 10: Nearby Routes (auto-scroll)
  {
    id: 'nearby-routes',
    title: 'Rutter Nära Dig',
    content: 'Upptäck övningsrutter i ditt område skapade av communityn.',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.NearbyRoutes',
    position: 'top',
    scrollToElement: true,
    scrollOffset: 150,
  },
  // Step 11: Navigate to Progress Tab
  {
    id: 'go-to-progress',
    title: 'Framsteg-fliken',
    content: 'Nu ska vi kolla på Framsteg-fliken där du hittar alla övningar och körkortsplaner!',
    targetScreen: 'HomeTab',
    position: 'center',
    action: {
      type: 'navigate',
      target: 'ProgressTab',
      delay: 300,
    },
  },
  // Step 12: Progress Screen - Learning Paths
  {
    id: 'learning-paths',
    title: 'Körkortsplaner',
    content: 'Välj en körkortsplan som passar dig. Varje plan innehåller övningar för olika moment!',
    targetScreen: 'ProgressScreen',
    targetElement: 'ProgressScreen.FirstPath',
    position: 'bottom',
    preAction: {
      type: 'waitFor',
      delay: 800,
    },
  },
  // Step 13: Progress Screen - Filters
  {
    id: 'progress-filters',
    title: 'Filtrera Planer',
    content: 'Använd filter för att hitta planer som passar din bil och din erfarenhetsnivå.',
    targetScreen: 'ProgressScreen',
    targetElement: 'ProgressScreen.FilterButton',
    position: 'bottom',
  },
  // Step 14: Navigate to Map Tab
  {
    id: 'go-to-map',
    title: 'Kartan',
    content: 'Låt oss utforska kartan! Här hittar du övningsrutter och kan spela in dina körningar.',
    targetScreen: 'ProgressTab',
    position: 'center',
    action: {
      type: 'navigate',
      target: 'MapTab',
      delay: 300,
    },
  },
  // Step 15: Map - Locate Button
  {
    id: 'map-locate',
    title: 'Hitta Din Position',
    content: 'Tryck här för att centrera kartan på din nuvarande position.',
    targetScreen: 'MapScreen',
    targetElement: 'MapScreen.LocateButton',
    position: 'top',
    preAction: {
      type: 'waitFor',
      delay: 800,
    },
  },
  // Step 16: Map - Routes Drawer
  {
    id: 'map-routes',
    title: 'Bläddra Rutter',
    content: 'Svep uppåt för att se alla rutter i området. Tryck på en rutt för att se detaljer!',
    targetScreen: 'MapScreen',
    targetElement: 'MapScreen.RoutesDrawer',
    position: 'top',
  },
  // Step 17: Complete
  {
    id: 'tour-complete',
    title: 'Nu är du redo! 🎉',
    content: 'Det var grunderna! Utforska appen och börja din körresa. Lycka till med övningskörningen!',
    targetScreen: 'MapTab',
    position: 'center',
  },
];

// ============================================================================
// PROGRESS SCREEN TOUR (Extended - triggers when visiting ProgressScreen)
// Includes auto-press actions to simulate user interactions
// ============================================================================
export const PROGRESS_SCREEN_TOUR: TourStep[] = [
  {
    id: 'progress-welcome',
    title: 'Välkommen till Framsteg! 📚',
    content: 'Här följer du din körkortsresa. Genomför övningar och se hur nära du är målet!',
    targetScreen: 'ProgressScreen',
    position: 'center',
  },
  {
    id: 'progress-learning-paths',
    title: 'Öppnar Körkortsplan... 👆',
    content: 'Vi öppnar den första körkortsplanen automatiskt för att visa dig övningarna.',
    targetScreen: 'ProgressScreen',
    targetElement: 'ProgressScreen.FirstPath',
    position: 'bottom',
    action: {
      type: 'press',
      target: 'ProgressScreen.FirstPath',
      delay: 500,
    },
  },
  {
    id: 'progress-path-detail',
    title: 'Körkortsplanens Övningar',
    content: 'Här ser du alla övningar i planen. Tryck på en övning för att se detaljerna!',
    targetScreen: 'ProgressScreen',
    position: 'center',
    preAction: {
      type: 'waitFor',
      delay: 800,
    },
  },
  {
    id: 'progress-first-exercise',
    title: 'Öppnar Övning... 📝',
    content: 'Vi visar dig en övning med video, instruktioner och möjlighet att bocka av!',
    targetScreen: 'ProgressScreen',
    targetElement: 'ProgressScreen.FirstExercise',
    position: 'bottom',
    action: {
      type: 'press',
      target: 'ProgressScreen.FirstExercise',
      delay: 500,
    },
  },
  {
    id: 'progress-exercise-video',
    title: 'Videohandledning 🎬',
    content: 'Titta på videon för att se hur övningen ska utföras. Pausa och spola tillbaka!',
    targetScreen: 'ProgressScreen',
    targetElement: 'ExerciseDetail.VideoPlayer',
    position: 'bottom',
    preAction: {
      type: 'waitFor',
      delay: 600,
    },
  },
  {
    id: 'progress-exercise-steps',
    title: 'Steg för Steg',
    content: 'Följ instruktionerna steg för steg. Tryck på varje steg för att se mer info!',
    targetScreen: 'ProgressScreen',
    targetElement: 'ExerciseDetail.StepsSection',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'progress-exercise-checkbox',
    title: 'Bocka Av! ✅',
    content: 'Vi bockar av övningen automatiskt för att visa hur det fungerar!',
    targetScreen: 'ProgressScreen',
    targetElement: 'ExerciseDetail.Checkbox',
    position: 'top',
    action: {
      type: 'press',
      target: 'ExerciseDetail.Checkbox',
      delay: 500,
    },
  },
  {
    id: 'progress-exercise-repeats',
    title: 'Repetitioner',
    content: 'Vissa övningar kräver flera repetitioner. Gör alla för bästa resultat!',
    targetScreen: 'ProgressScreen',
    targetElement: 'ExerciseDetail.RepeatSection',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'progress-filters',
    title: 'Filteralternativ',
    content: 'Använd filter för att hitta körkortsplaner som matchar din bil och erfarenhetsnivå.',
    targetScreen: 'ProgressScreen',
    targetElement: 'ProgressScreen.FilterButton',
    position: 'bottom',
  },
  {
    id: 'progress-go-map',
    title: 'Tryck på Karta! 🗺️',
    content: 'Tryck på den markerade fliken "Karta" för att hitta övningsrutter i ditt område!',
    targetScreen: 'ProgressScreen',
    targetElement: 'MapTab',
    position: 'top',
    action: {
      type: 'navigate',
      target: 'MapTab',
    },
  },
];

// ============================================================================
// HOME SCREEN TOUR (Extended with all sections)
// ============================================================================
export const HOME_SCREEN_TOUR: TourStep[] = [
  {
    id: 'home-welcome',
    title: 'Välkommen till Vromm!',
    content: 'Detta är din hemskärm. Utforska rutter, följ framsteg och koppla samman med handledare.',
    targetScreen: 'HomeScreen',
    position: 'center',
  },
  {
    id: 'home-weekly-goal',
    title: 'Veckomål',
    content: 'Sätt mål för veckan och se hur du ligger till. Öva regelbundet för bästa resultat!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.WeeklyGoal',
    position: 'bottom',
    scrollToElement: true,
  },
  {
    id: 'home-daily-status',
    title: 'Daglig Aktivitet',
    content: 'Se din aktivitet dag för dag. Tryck på en dag för att se vad du övade!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.DailyStatus',
    position: 'bottom',
  },
  {
    id: 'home-map-preview',
    title: 'Karta & Rutter',
    content: 'Snabbtitt på kartan med rutter nära dig. Tryck för att utforska fler!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.MapPreview',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'home-progress',
    title: 'Din Framsteg',
    content: 'Följ din totala framsteg i körkortsplanen här.',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.ProgressSection',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'home-saved-routes',
    title: 'Sparade Rutter',
    content: 'Dina favoriter och sparade övningsrutter samlade på ett ställe.',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.SavedRoutes',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'home-driven-routes',
    title: 'Körda Rutter',
    content: 'Rutter du markerat som körda. Bra för att följa dina genomförda pass!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.DrivenRoutes',
    position: 'top',
  },
  {
    id: 'home-nearby-routes',
    title: 'Upptäck Rutter',
    content: 'Hitta övningsrutter skapade av communityn nära din plats.',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.NearbyRoutes',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'home-create',
    title: 'Skapa Rutter',
    content: 'Tryck på plus-knappen för att skapa egna övningsrutter och dela med andra.',
    targetScreen: 'HomeScreen',
    targetElement: 'CreateRouteTab',
    position: 'top',
  },
  {
    id: 'home-go-progress',
    title: 'Tryck på Framsteg! 👆',
    content: 'Tryck på den markerade fliken "Framsteg" i navigeringen nedanför för att fortsätta!',
    targetScreen: 'HomeScreen',
    targetElement: 'ProgressTab',
    position: 'top',
    action: {
      type: 'navigate',
      target: 'ProgressTab',
    },
  },
];

// ============================================================================
// MAP SCREEN TOUR (Extended - triggers when visiting MapScreen)
// ============================================================================
export const MAP_SCREEN_TOUR: TourStep[] = [
  {
    id: 'map-welcome',
    title: 'Välkommen till Kartan! 🗺️',
    content: 'Hitta övningsrutter nära dig på den interaktiva kartan.',
    targetScreen: 'MapScreen',
    position: 'center',
  },
  {
    id: 'map-markers',
    title: 'Ruttmarkörer',
    content: 'Varje markör på kartan är en övningsrutt. Tryck på en för att se detaljer!',
    targetScreen: 'MapScreen',
    position: 'center',
  },
  {
    id: 'map-locate',
    title: 'Din Position',
    content: 'Tryck här för att centrera kartan på din nuvarande plats.',
    targetScreen: 'MapScreen',
    targetElement: 'MapScreen.LocateButton',
    position: 'top',
  },
  {
    id: 'map-routes-drawer',
    title: 'Ruttlista',
    content: 'Svep uppåt för att se alla tillgängliga rutter. Tryck för att öppna detaljer!',
    targetScreen: 'MapScreen',
    targetElement: 'MapScreen.RoutesDrawer',
    position: 'top',
  },
  {
    id: 'map-record',
    title: 'Spela In Körning',
    content: 'Använd inspelningsknappen för att spela in dina körpass och spara som rutt.',
    targetScreen: 'MapScreen',
    targetElement: 'MapScreen.RecordButton',
    position: 'top',
  },
  {
    id: 'map-complete',
    title: 'Du är redo! 🎉',
    content: 'Nu vet du grunderna! Börja utforska rutter, öva och följ dina framsteg. Lycka till!',
    targetScreen: 'MapScreen',
    position: 'center',
  },
];

// ============================================================================
// ROUTE DETAIL SHEET TOUR
// ============================================================================
export const ROUTE_DETAIL_SHEET_TOUR: TourStep[] = [
  {
    id: 'route-detail-overview',
    title: 'Ruttöversikt',
    content: 'Se alla detaljer om rutten: svårighetsgrad, avstånd och beräknad tid.',
    targetScreen: 'RouteDetailSheet',
    position: 'center',
  },
  {
    id: 'route-detail-map',
    title: 'Ruttkarta',
    content: 'Se rutten på kartan med start- och slutpunkt markerade.',
    targetScreen: 'RouteDetailSheet',
    position: 'center',
  },
  {
    id: 'route-detail-exercises',
    title: 'Ruttövningar',
    content: 'Vissa rutter har övningar kopplade. Genomför dem för att öva specifika moment!',
    targetScreen: 'RouteDetailSheet',
    targetElement: 'RouteDetailSheet.ExerciseSection',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'route-detail-mark-driven',
    title: 'Markera som Körd',
    content: 'När du kört rutten, markera den som körd för att följa din framsteg!',
    targetScreen: 'RouteDetailSheet',
    targetElement: 'RouteDetailSheet.MarkDrivenButton',
    position: 'top',
  },
  {
    id: 'route-detail-navigate',
    title: 'Starta Navigation',
    content: 'Tryck "Öppna i kartor" för att navigera till ruttens startpunkt.',
    targetScreen: 'RouteDetailSheet',
    targetElement: 'RouteDetailSheet.NavigateButton',
    position: 'top',
  },
  {
    id: 'route-detail-save',
    title: 'Spara Rutt',
    content: 'Spara rutten till din samling för att enkelt hitta den senare.',
    targetScreen: 'RouteDetailSheet',
    targetElement: 'RouteDetailSheet.SaveButton',
    position: 'top',
  },
  {
    id: 'route-detail-review',
    title: 'Lämna Recension',
    content: 'Berätta hur rutten var! Din feedback hjälper andra förare.',
    targetScreen: 'RouteDetailSheet',
    targetElement: 'RouteDetailSheet.ReviewSection',
    position: 'top',
    scrollToElement: true,
  },
];

// ============================================================================
// EXERCISE DETAIL TOUR
// ============================================================================
export const EXERCISE_DETAIL_TOUR: TourStep[] = [
  {
    id: 'exercise-detail-video',
    title: 'Se Tutorial',
    content: 'Titta på videon för att förstå övningen innan du övar.',
    targetScreen: 'ExerciseDetail',
    targetElement: 'ExerciseDetail.VideoPlayer',
    position: 'bottom',
  },
  {
    id: 'exercise-detail-description',
    title: 'Övningsbeskrivning',
    content: 'Läs igenom beskrivningen för att förstå vad övningen går ut på.',
    targetScreen: 'ExerciseDetail',
    position: 'center',
  },
  {
    id: 'exercise-detail-steps',
    title: 'Följ Stegen',
    content: 'Varje övning har steg att följa. Kryssa av dem när du gjort dem.',
    targetScreen: 'ExerciseDetail',
    targetElement: 'ExerciseDetail.StepsSection',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'exercise-detail-complete',
    title: 'Markera som Klar',
    content: 'När du övat, tryck på kryssrutan för att markera övningen som klar!',
    targetScreen: 'ExerciseDetail',
    targetElement: 'ExerciseDetail.MarkCompleteButton',
    position: 'top',
  },
  {
    id: 'exercise-detail-repeat',
    title: 'Repetera',
    content: 'Vissa övningar kräver flera repetitioner. Gör alla för att bli riktigt duktig!',
    targetScreen: 'ExerciseDetail',
    targetElement: 'ExerciseDetail.RepeatSection',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'exercise-detail-quiz',
    title: 'Kunskapstest',
    content: 'Vissa övningar har quiz för att testa din kunskap. Svara rätt för att gå vidare!',
    targetScreen: 'ExerciseDetail',
    targetElement: 'ExerciseDetail.QuizSection',
    position: 'top',
    scrollToElement: true,
  },
];

// ============================================================================
// MENU TAB TOUR
// ============================================================================
export const MENU_TAB_TOUR: TourStep[] = [
  {
    id: 'menu-profile',
    title: 'Din Profil',
    content: 'Se och redigera din profilinformation, inklusive namn och bild.',
    targetScreen: 'MenuTab',
    targetElement: 'MenuTab.ProfileCard',
    position: 'bottom',
  },
  {
    id: 'menu-connections',
    title: 'Kopplingar',
    content: 'Koppla samman med handledare eller elever för att dela framsteg och få vägledning.',
    targetScreen: 'MenuTab',
    targetElement: 'MenuTab.ConnectionsSection',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'menu-settings',
    title: 'Inställningar',
    content: 'Anpassa appen i inställningssektionen.',
    targetScreen: 'MenuTab',
    targetElement: 'MenuTab.SettingsButton',
    position: 'top',
  },
];

// ============================================================================
// CREATE ROUTE SHEET TOUR (9 steps)
// Educational tour explaining how and WHY to create practice routes
// ============================================================================
export const CREATE_ROUTE_SHEET_TOUR: TourStep[] = [
  {
    id: 'create-welcome',
    title: 'Skapa en Övningsrutt! 🛣️',
    content: 'Dela dina favoritplatser för körning med andra elever! Att skapa rutter hjälper communityn och sparar dina övningsplatser.',
    targetScreen: 'CreateRouteSheet',
    position: 'center',
  },
  {
    id: 'create-name',
    title: 'Ge den ett Namn',
    content: 'Ett bra namn hjälper andra att hitta din rutt! Var beskrivande: "Rondellövning - Malmö Central" är bättre än "Rutt 1".',
    targetScreen: 'CreateRouteSheet',
    targetElement: 'CreateRouteSheet.NameInput',
    position: 'bottom',
  },
  {
    id: 'create-location',
    title: 'Ange Plats 📍',
    content: 'Sök efter en adress eller tryck på kartan för att sätta vägpunkter. Rutten visas på kartan så andra kan hitta och navigera till den.',
    targetScreen: 'CreateRouteSheet',
    targetElement: 'CreateRouteSheet.LocationSearch',
    position: 'bottom',
  },
  {
    id: 'create-record-option',
    title: 'Eller Spela In Medan Du Kör! 🎥',
    content: 'Tips: Tryck "Spela in rutt" för att automatiskt fånga rutten medan du kör. Appen spårar din GPS-väg - perfekt för komplexa rutter!',
    targetScreen: 'CreateRouteSheet',
    targetElement: 'CreateRouteSheet.RecordButton',
    position: 'top',
  },
  {
    id: 'create-waypoints',
    title: 'Lägg till Vägpunkter',
    content: 'Vägpunkter markerar viktiga platser längs rutten - som var man övar parallellparkering eller var en knepig korsning är. Tryck på kartan för att lägga till dem!',
    targetScreen: 'CreateRouteSheet',
    targetElement: 'CreateRouteSheet.MapView',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'create-difficulty',
    title: 'Ange Svårighetsgrad',
    content: 'Hjälp andra att veta vad de kan förvänta sig! Nybörjarrutter har enkel trafik, medan Avancerade rutter kan ha utmanande korsningar eller motorvägspåfarter.',
    targetScreen: 'CreateRouteSheet',
    targetElement: 'CreateRouteSheet.DifficultySelector',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'create-exercises',
    title: 'Koppla Övningar 📚',
    content: 'Koppla specifika övningar till denna rutt! Om din rutt är bra för att öva rondeller, koppla rondellövningen så användare kan lära sig och öva tillsammans.',
    targetScreen: 'CreateRouteSheet',
    targetElement: 'CreateRouteSheet.ExerciseSelector',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'create-media',
    title: 'Lägg till Foton & Videos 📸',
    content: 'En bild säger mer än tusen ord! Lägg till foton av knepiga platser eller en videoguide. Detta hjälper andra att förbereda sig innan de kör din rutt.',
    targetScreen: 'CreateRouteSheet',
    targetElement: 'CreateRouteSheet.MediaSection',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'create-save',
    title: 'Spara & Dela! 🚀',
    content: 'När du är nöjd, tryck Spara! Din rutt visas på kartan så andra kan upptäcka den. Du kan sätta den som privat om du bara vill behålla den för dig själv.',
    targetScreen: 'CreateRouteSheet',
    targetElement: 'CreateRouteSheet.SaveButton',
    position: 'top',
  },
];

// ============================================================================
// RECORD DRIVING SHEET TOUR (8 steps)
// Educational tour explaining how and WHY to record driving sessions
// ============================================================================
export const RECORD_DRIVING_SHEET_TOUR: TourStep[] = [
  {
    id: 'record-welcome',
    title: 'Spela In Din Körning! 🎬',
    content: 'Förvandla vilken körning som helst till en delbar rutt! Appen använder GPS för att spåra din väg automatiskt. Perfekt för att fånga verkliga övningspass.',
    targetScreen: 'RecordDrivingSheet',
    position: 'center',
  },
  {
    id: 'record-start',
    title: 'Starta Inspelning ▶️',
    content: 'Tryck på play-knappen när du är redo att börja köra. Inspelningen börjar direkt - ingen brådska, ta din tid att bli bekväm!',
    targetScreen: 'RecordDrivingSheet',
    targetElement: 'RecordDrivingSheet.StartButton',
    position: 'top',
  },
  {
    id: 'record-stats',
    title: 'Realtidsstatistik 📊',
    content: 'Se din framsteg i realtid! Se varaktighet, körd distans och nuvarande hastighet. Denna data sparas med din rutt så du kan granska din körning senare.',
    targetScreen: 'RecordDrivingSheet',
    targetElement: 'RecordDrivingSheet.StatsContainer',
    position: 'bottom',
  },
  {
    id: 'record-map-preview',
    title: 'Kartförhandsgranskning 🗺️',
    content: 'Växla kartan för att se din rutt ritas i realtid! Varje vägpunkt fångas automatiskt medan du kör. Perfekt för att verifiera din väg.',
    targetScreen: 'RecordDrivingSheet',
    targetElement: 'RecordDrivingSheet.MapToggle',
    position: 'bottom',
  },
  {
    id: 'record-pause',
    title: 'Pausa Vid Behov ⏸️',
    content: 'Tar du en paus? Tryck på pausa för att stoppa inspelningen tillfälligt. Appen spårar inte medan den är pausad - perfekt för rastplatser eller om du behöver gå ut.',
    targetScreen: 'RecordDrivingSheet',
    targetElement: 'RecordDrivingSheet.PauseButton',
    position: 'top',
  },
  {
    id: 'record-minimize',
    title: 'Minimera till Bakgrund',
    content: 'Vill du använda andra appar medan du spelar in? Tryck minimera! Inspelningen fortsätter i bakgrunden med en notis. Svep ner för att återgå när som helst.',
    targetScreen: 'RecordDrivingSheet',
    targetElement: 'RecordDrivingSheet.MinimizeButton',
    position: 'bottom',
  },
  {
    id: 'record-stop',
    title: 'Stoppa & Granska ⏹️',
    content: 'Kört klart? Tryck på den röda stoppknappen. Du ser en sammanfattning av din rutt med alla vägpunkter som fångades under din körning.',
    targetScreen: 'RecordDrivingSheet',
    targetElement: 'RecordDrivingSheet.StopButton',
    position: 'top',
  },
  {
    id: 'record-create-route',
    title: 'Skapa Din Rutt! 🎉',
    content: 'Efter att ha stoppat, tryck "Skapa Rutt" för att förvandla din inspelning till en delbar övningsrutt. Lägg till namn, beskrivning och övningar - sen spara!',
    targetScreen: 'RecordDrivingSheet',
    targetElement: 'RecordDrivingSheet.CreateRouteButton',
    position: 'top',
  },
];

// ============================================================================
// STUDENT FIRST VISIT TOUR (Short version for students)
// ============================================================================
export const STUDENT_FIRST_VISIT_TOUR: TourStep[] = [
  {
    id: 'student-welcome',
    title: 'Välkommen ny elev! 🎉',
    content: 'Vromm hjälper dig att förbereda dig för körkortet. Låt oss komma igång!',
    targetScreen: 'HomeTab',
    position: 'center',
  },
  {
    id: 'student-weekly-goal',
    title: 'Sätt Veckomål',
    content: 'Börja med att sätta ett veckomål. Hur ofta vill du öva?',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.WeeklyGoal',
    position: 'bottom',
    scrollToElement: true,
  },
  {
    id: 'student-progress',
    title: 'Följ Din Framsteg',
    content: 'Gå till Framsteg-fliken för att se körkortsplaner och börja öva!',
    targetScreen: 'HomeTab',
    targetElement: 'ProgressTab',
    position: 'top',
    action: {
      type: 'navigate',
      target: 'ProgressTab',
    },
  },
  {
    id: 'student-pick-path',
    title: 'Välj en Plan',
    content: 'Välj en körkortsplan som passar dig och din bil. Sedan är det bara att börja!',
    targetScreen: 'ProgressScreen',
    targetElement: 'ProgressScreen.FirstPath',
    position: 'bottom',
    scrollToElement: true,
    preAction: {
      type: 'waitFor',
      delay: 500,
    },
  },
  {
    id: 'student-complete',
    title: 'Nu kör vi! 🚗',
    content: 'Lycka till med övningskörningen! Kom ihåg att öva regelbundet.',
    targetScreen: 'ProgressTab',
    position: 'center',
  },
];

// ============================================================================
// INSTRUCTOR FIRST VISIT TOUR
// ============================================================================
export const INSTRUCTOR_FIRST_VISIT_TOUR: TourStep[] = [
  {
    id: 'instructor-welcome',
    title: 'Välkommen Handledare! 👋',
    content: 'Som handledare kan du följa dina elevers framsteg och hjälpa dem på vägen.',
    targetScreen: 'HomeTab',
    position: 'center',
  },
  {
    id: 'instructor-students',
    title: 'Dina Elever',
    content: 'Se alla elever kopplade till dig här. Du kan följa deras framsteg i realtid!',
    targetScreen: 'HomeScreen',
    position: 'center',
  },
  {
    id: 'instructor-switch',
    title: 'Byt Till Elev',
    content: 'Tryck på en elev för att se appen från deras perspektiv och följa deras övning.',
    targetScreen: 'HomeScreen',
    position: 'center',
  },
  {
    id: 'instructor-routes',
    title: 'Skapa Rutter',
    content: 'Skapa övningsrutter och dela dem med dina elever för strukturerad övning.',
    targetScreen: 'HomeScreen',
    targetElement: 'CreateRouteTab',
    position: 'top',
  },
  {
    id: 'instructor-complete',
    title: 'Redo att Hjälpa! 💪',
    content: 'Nu är du redo att hjälpa dina elever mot körkortet. Lycka till!',
    targetScreen: 'HomeTab',
    position: 'center',
  },
];

// ============================================================================
// MAIN APP TOUR (Legacy - Shorter version)
// ============================================================================
export const MAIN_APP_TOUR: TourStep[] = [
  {
    id: 'main-home',
    title: 'Välkommen till Vromm!',
    content: 'Låt oss ta en snabb rundtur. Det här är hemskärmen där du utforskar rutter.',
    targetScreen: 'HomeTab',
    position: 'center',
  },
  {
    id: 'main-progress',
    title: 'Följ Din Framsteg',
    content: 'Framsteg-fliken är där du hittar körkortsplaner och övningar.',
    targetScreen: 'HomeTab',
    targetElement: 'ProgressTab',
    position: 'top',
    action: {
      type: 'navigate',
      target: 'ProgressTab',
      delay: 300,
    },
  },
  {
    id: 'main-progress-content',
    title: 'Körkortsplaner',
    content: 'Här ser du alla tillgängliga körkortsplaner. Välj en för att börja lära dig!',
    targetScreen: 'ProgressTab',
    position: 'center',
    preAction: {
      type: 'waitFor',
      delay: 500,
    },
  },
  {
    id: 'main-map',
    title: 'Utforska Kartan',
    content: 'Kart-fliken visar övningsrutter nära dig. Låt oss kolla!',
    targetScreen: 'ProgressTab',
    targetElement: 'MapTab',
    position: 'top',
    action: {
      type: 'navigate',
      target: 'MapTab',
      delay: 300,
    },
  },
  {
    id: 'main-map-content',
    title: 'Hitta Rutter',
    content: 'Bläddra på kartan för att hitta övningsrutter. Tryck på markörer för att se detaljer.',
    targetScreen: 'MapTab',
    position: 'center',
    preAction: {
      type: 'waitFor',
      delay: 500,
    },
  },
  {
    id: 'main-complete',
    title: 'Nu är du redo!',
    content: 'Det var grunderna! Utforska appen och börja din körresa. Lycka till!',
    targetScreen: 'MapTab',
    position: 'center',
  },
];

// ============================================================================
// HELPER: Get tour by screen ID
// ============================================================================
export function getTourForScreen(screenId: string): TourStep[] | null {
  const tourMap: Record<string, TourStep[]> = {
    ProgressScreen: PROGRESS_SCREEN_TOUR,
    HomeScreen: HOME_SCREEN_TOUR,
    MapScreen: MAP_SCREEN_TOUR,
    RouteDetailSheet: ROUTE_DETAIL_SHEET_TOUR,
    ExerciseDetail: EXERCISE_DETAIL_TOUR,
    MenuTab: MENU_TAB_TOUR,
    CreateRouteSheet: CREATE_ROUTE_SHEET_TOUR,
    RecordDrivingSheet: RECORD_DRIVING_SHEET_TOUR,
  };

  return tourMap[screenId] || null;
}

// ============================================================================
// HELPER: Get tour by user role
// ============================================================================
export function getTourForUserRole(role: 'student' | 'instructor' | 'school'): TourStep[] {
  switch (role) {
    case 'student':
      return STUDENT_FIRST_VISIT_TOUR;
    case 'instructor':
    case 'school':
      return INSTRUCTOR_FIRST_VISIT_TOUR;
    default:
      return COMPREHENSIVE_APP_TOUR;
  }
}

// ============================================================================
// HELPER: Create database-ready tour content (bilingual)
// ============================================================================
export function createDatabaseTourContent(
  screenId: string,
  steps: TourStep[],
): any[] {
  return steps.map((step, index) => ({
    key: `tour.screen.${screenId}.${step.id}`,
    content_type: 'tour',
    title: { en: step.title, sv: step.title }, // Swedish already in configs
    body: { en: step.content, sv: step.content }, // Swedish already in configs
    target: step.targetElement || screenId,
    platforms: ['mobile', 'both'],
    order_index: index + 1,
    active: true,
    metadata: {
      targetElement: step.targetElement,
      position: step.position,
      action: step.action,
      preAction: step.preAction,
      scrollToElement: step.scrollToElement,
      scrollOffset: step.scrollOffset,
    },
  }));
}

// ============================================================================
// EXPORT ALL TOURS
// ============================================================================
export const ALL_TOURS = {
  COMPREHENSIVE_APP_TOUR,
  PROGRESS_SCREEN_TOUR,
  HOME_SCREEN_TOUR,
  MAP_SCREEN_TOUR,
  ROUTE_DETAIL_SHEET_TOUR,
  EXERCISE_DETAIL_TOUR,
  MENU_TAB_TOUR,
  CREATE_ROUTE_SHEET_TOUR,
  RECORD_DRIVING_SHEET_TOUR,
  STUDENT_FIRST_VISIT_TOUR,
  INSTRUCTOR_FIRST_VISIT_TOUR,
  MAIN_APP_TOUR,
};
