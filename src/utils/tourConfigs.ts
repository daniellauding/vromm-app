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
// PROGRESS SCREEN TOUR
// ============================================================================
export const PROGRESS_SCREEN_TOUR: TourStep[] = [
  {
    id: 'progress-welcome',
    title: 'Welcome to Progress',
    content: 'Track your learning journey here. Complete exercises and earn achievements!',
    targetScreen: 'ProgressScreen',
    position: 'center',
  },
  {
    id: 'progress-learning-paths',
    title: 'Learning Paths',
    content: 'Choose a learning path to start your journey. Each path contains exercises to help you improve.',
    targetScreen: 'ProgressScreen',
    targetElement: 'ProgressScreen.FirstPath',
    position: 'bottom',
    scrollToElement: true,
  },
  {
    id: 'progress-filters',
    title: 'Filter Options',
    content: 'Use filters to find learning paths that match your vehicle type and experience level.',
    targetScreen: 'ProgressScreen',
    targetElement: 'ProgressScreen.FilterButton',
    position: 'bottom',
  },
  {
    id: 'progress-exercise',
    title: 'Complete Exercises',
    content: 'Tap on a learning path to see exercises. Mark them complete to track your progress!',
    targetScreen: 'ProgressScreen',
    position: 'center',
  },
];

// ============================================================================
// HOME SCREEN TOUR
// ============================================================================
export const HOME_SCREEN_TOUR: TourStep[] = [
  {
    id: 'home-welcome',
    title: 'Welcome to Vromm!',
    content: 'This is your home screen. Explore routes, track progress, and connect with instructors.',
    targetScreen: 'HomeScreen',
    position: 'center',
  },
  {
    id: 'home-routes',
    title: 'Discover Routes',
    content: 'Browse driving routes created by the community. Save your favorites for later!',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.NearbyRoutes',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'home-create',
    title: 'Create Routes',
    content: 'Tap the plus button to create your own driving routes and share them with others.',
    targetScreen: 'HomeScreen',
    targetElement: 'HomeScreen.CreateButton',
    position: 'top',
  },
  {
    id: 'home-progress-tab',
    title: 'Track Your Progress',
    content: 'Head to the Progress tab to see your learning journey.',
    targetScreen: 'HomeScreen',
    targetElement: 'TabBar.ProgressTab',
    position: 'top',
    action: {
      type: 'navigate',
      target: 'ProgressTab',
    },
  },
];

// ============================================================================
// MAP SCREEN TOUR
// ============================================================================
export const MAP_SCREEN_TOUR: TourStep[] = [
  {
    id: 'map-welcome',
    title: 'Explore the Map',
    content: 'Find driving routes near you on the interactive map.',
    targetScreen: 'MapScreen',
    position: 'center',
  },
  {
    id: 'map-route-cards',
    title: 'Route Cards',
    content: 'Tap on a route marker to see details. Swipe through nearby routes at the bottom.',
    targetScreen: 'MapScreen',
    targetElement: 'MapScreen.RouteCard',
    position: 'top',
  },
  {
    id: 'map-record',
    title: 'Record Your Drive',
    content: 'Use the record button to track your driving session and save it as a route.',
    targetScreen: 'MapScreen',
    targetElement: 'MapScreen.RecordButton',
    position: 'top',
  },
  {
    id: 'map-search',
    title: 'Search Locations',
    content: 'Search for specific locations or areas to find routes nearby.',
    targetScreen: 'MapScreen',
    targetElement: 'MapScreen.SearchButton',
    position: 'bottom',
  },
];

// ============================================================================
// ROUTE DETAIL SHEET TOUR
// ============================================================================
export const ROUTE_DETAIL_SHEET_TOUR: TourStep[] = [
  {
    id: 'route-detail-overview',
    title: 'Route Overview',
    content: 'See all the details about this route including difficulty, distance, and estimated time.',
    targetScreen: 'RouteDetailSheet',
    position: 'center',
  },
  {
    id: 'route-detail-exercises',
    title: 'Route Exercises',
    content: 'Some routes have exercises attached. Complete them to practice specific skills!',
    targetScreen: 'RouteDetailSheet',
    targetElement: 'RouteDetailSheet.ExerciseSection',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'route-detail-navigate',
    title: 'Start Navigation',
    content: 'Tap "Open in Maps" to start navigation to this route.',
    targetScreen: 'RouteDetailSheet',
    targetElement: 'RouteDetailSheet.NavigateButton',
    position: 'top',
  },
  {
    id: 'route-detail-save',
    title: 'Save Route',
    content: 'Save this route to your collection so you can find it easily later.',
    targetScreen: 'RouteDetailSheet',
    targetElement: 'RouteDetailSheet.SaveButton',
    position: 'top',
  },
];

// ============================================================================
// EXERCISE DETAIL TOUR
// ============================================================================
export const EXERCISE_DETAIL_TOUR: TourStep[] = [
  {
    id: 'exercise-detail-video',
    title: 'Watch the Tutorial',
    content: 'Watch the video tutorial to understand the exercise before practicing.',
    targetScreen: 'ExerciseDetail',
    targetElement: 'ExerciseDetail.VideoPlayer',
    position: 'bottom',
  },
  {
    id: 'exercise-detail-steps',
    title: 'Follow the Steps',
    content: 'Each exercise has steps to follow. Check them off as you complete them.',
    targetScreen: 'ExerciseDetail',
    targetElement: 'ExerciseDetail.StepsSection',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'exercise-detail-complete',
    title: 'Mark as Complete',
    content: 'When you\'re done, tap the checkbox to mark this exercise as complete.',
    targetScreen: 'ExerciseDetail',
    targetElement: 'ExerciseDetail.MarkCompleteButton',
    position: 'top',
  },
  {
    id: 'exercise-detail-repeat',
    title: 'Repeat for Practice',
    content: 'Some exercises require multiple repetitions. Complete all reps to master the skill!',
    targetScreen: 'ExerciseDetail',
    targetElement: 'ExerciseDetail.RepeatSection',
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
    title: 'Your Profile',
    content: 'View and edit your profile information, including your name and avatar.',
    targetScreen: 'MenuTab',
    targetElement: 'MenuTab.ProfileCard',
    position: 'bottom',
  },
  {
    id: 'menu-connections',
    title: 'Connections',
    content: 'Connect with instructors or students to share progress and get guidance.',
    targetScreen: 'MenuTab',
    targetElement: 'MenuTab.ConnectionsSection',
    position: 'top',
    scrollToElement: true,
  },
  {
    id: 'menu-settings',
    title: 'Settings',
    content: 'Customize your app experience in the settings section.',
    targetScreen: 'MenuTab',
    targetElement: 'MenuTab.SettingsButton',
    position: 'top',
  },
];

// ============================================================================
// MAIN APP TOUR (Cross-screen navigation)
// ============================================================================
export const MAIN_APP_TOUR: TourStep[] = [
  {
    id: 'main-home',
    title: 'Welcome to Vromm!',
    content: 'Let\'s take a quick tour of the app. This is your home screen where you can explore routes.',
    targetScreen: 'HomeTab',
    position: 'center',
  },
  {
    id: 'main-progress',
    title: 'Track Your Progress',
    content: 'The Progress tab is where you\'ll find your learning paths and exercises.',
    targetScreen: 'HomeTab',
    targetElement: 'TabBar.ProgressTab',
    position: 'top',
    action: {
      type: 'navigate',
      target: 'ProgressTab',
      delay: 300,
    },
  },
  {
    id: 'main-progress-content',
    title: 'Learning Paths',
    content: 'Here you can see all available learning paths. Choose one to start learning!',
    targetScreen: 'ProgressTab',
    position: 'center',
    preAction: {
      type: 'waitFor',
      delay: 500,
    },
  },
  {
    id: 'main-map',
    title: 'Explore the Map',
    content: 'The Map tab shows driving routes near you. Let\'s check it out!',
    targetScreen: 'ProgressTab',
    targetElement: 'TabBar.MapTab',
    position: 'top',
    action: {
      type: 'navigate',
      target: 'MapTab',
      delay: 300,
    },
  },
  {
    id: 'main-map-content',
    title: 'Find Routes',
    content: 'Browse the map to find practice routes. Tap on markers to see route details.',
    targetScreen: 'MapTab',
    position: 'center',
    preAction: {
      type: 'waitFor',
      delay: 500,
    },
  },
  {
    id: 'main-menu',
    title: 'Your Profile',
    content: 'Finally, the Menu tab is where you manage your profile and connections.',
    targetScreen: 'MapTab',
    targetElement: 'TabBar.MenuTab',
    position: 'top',
    action: {
      type: 'navigate',
      target: 'MenuTab',
      delay: 300,
    },
  },
  {
    id: 'main-complete',
    title: 'You\'re All Set!',
    content: 'That\'s the basics! Explore the app and start your driving journey. Good luck!',
    targetScreen: 'MenuTab',
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
// HELPER: Create database-ready tour content
// ============================================================================
export function createDatabaseTourContent(
  screenId: string,
  steps: TourStep[],
  language: 'en' | 'sv' = 'en',
): any[] {
  return steps.map((step, index) => ({
    key: `tour.screen.${screenId}.${step.id}`,
    content_type: 'tour',
    title: { [language]: step.title },
    body: { [language]: step.content },
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
