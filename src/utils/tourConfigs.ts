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
// COMPREHENSIVE MAIN APP TOUR (15+ steps with cross-screen navigation)
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
  // Step 2: Weekly Goal
  {
    id: 'weekly-goal',
    title: 'Veckomål',
    content: 'Här ser du dina veckomål. Sätt upp mål för hur ofta du vill öva och följ din framgång!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.WeeklyGoal',
    position: 'bottom',
    scrollToElement: true,
    scrollOffset: 50,
  },
  // Step 3: Daily Status
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
    scrollToElement: true,
  },
  // Step 5: Getting Started
  {
    id: 'getting-started',
    title: 'Kom igång',
    content: 'Snabbstartguide för nya förare. Följ stegen för att komma igång med övningskörningen!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.GettingStarted',
    position: 'bottom',
    scrollToElement: true,
  },
  // Step 6: Progress Section
  {
    id: 'progress-overview',
    title: 'Din Framsteg',
    content: 'Här ser du din totala framsteg i körkortsplanen. Procenten visar hur långt du kommit!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.ProgressSection',
    position: 'top',
    scrollToElement: true,
  },
  // Step 7: Saved Routes
  {
    id: 'saved-routes',
    title: 'Sparade Rutter',
    content: 'Rutter du sparat för senare. Hitta enkelt tillbaka till favoriter!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.SavedRoutes',
    position: 'top',
    scrollToElement: true,
  },
  // Step 8: Driven Routes
  {
    id: 'driven-routes',
    title: 'Körda Rutter',
    content: 'Rutter du redan kört. Markera rutter som körda för att följa din framsteg!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.DrivenRoutes',
    position: 'top',
  },
  // Step 9: Created Routes
  {
    id: 'created-routes',
    title: 'Skapade Rutter',
    content: 'Rutter du själv skapat. Dela med handledare eller andra elever!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.CreatedRoutes',
    position: 'top',
  },
  // Step 10: Nearby Routes
  {
    id: 'nearby-routes',
    title: 'Rutter Nära Dig',
    content: 'Upptäck övningsrutter i ditt område skapade av communityn.',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.NearbyRoutes',
    position: 'top',
    scrollToElement: true,
  },
  // Step 11: Navigate to Progress Tab
  {
    id: 'go-to-progress',
    title: 'Framsteg-fliken',
    content: 'Nu ska vi kolla på Framsteg-fliken där du hittar alla övningar och körkortsplaner!',
    targetScreen: 'HomeTab',
    targetElement: 'ProgressTab',
    position: 'top',
    action: {
      type: 'navigate',
      target: 'ProgressTab',
      delay: 400,
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
    scrollToElement: true,
    preAction: {
      type: 'waitFor',
      delay: 600,
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
    targetElement: 'MapTab',
    position: 'top',
    action: {
      type: 'navigate',
      target: 'MapTab',
      delay: 400,
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
      delay: 600,
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
    scrollToElement: true,
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
// PROGRESS SCREEN TOUR (Extended)
// ============================================================================
export const PROGRESS_SCREEN_TOUR: TourStep[] = [
  {
    id: 'progress-welcome',
    title: 'Välkommen till Framsteg',
    content: 'Här följer du din körkortsresa. Genomför övningar och se hur nära du är målet!',
    targetScreen: 'ProgressScreen',
    position: 'center',
  },
  {
    id: 'progress-learning-paths',
    title: 'Körkortsplaner',
    content: 'Välj en körkortsplan för att börja. Varje plan innehåller övningar som hjälper dig bli bättre!',
    targetScreen: 'ProgressScreen',
    targetElement: 'ProgressScreen.FirstPath',
    position: 'bottom',
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
    id: 'progress-tap-path',
    title: 'Öppna en Plan',
    content: 'Tryck på en körkortsplan för att se dess övningar. Markera övningar som avklarade när du är klar!',
    targetScreen: 'ProgressScreen',
    position: 'center',
  },
  {
    id: 'progress-complete-exercises',
    title: 'Genomför Övningar',
    content: 'Varje övning har instruktioner och ibland video. Öva och markera som klar för att se din framsteg!',
    targetScreen: 'ProgressScreen',
    position: 'center',
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
    title: 'Gå till Framsteg',
    content: 'Gå till Framsteg-fliken för att se körkortsplaner och övningar.',
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
// MAP SCREEN TOUR (Extended)
// ============================================================================
export const MAP_SCREEN_TOUR: TourStep[] = [
  {
    id: 'map-welcome',
    title: 'Utforska Kartan',
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
    id: 'map-filters',
    title: 'Filtrera Rutter',
    content: 'Filtrera rutter efter svårighetsgrad, typ eller avstånd.',
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
  STUDENT_FIRST_VISIT_TOUR,
  INSTRUCTOR_FIRST_VISIT_TOUR,
  MAIN_APP_TOUR,
};
