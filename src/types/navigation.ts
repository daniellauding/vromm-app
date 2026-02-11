import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { SearchResult } from '../components/SearchView';
import type { Route } from '../hooks/useRoutes';
import type { Exercise } from './route';

export type FilterCategory = {
  id: string;
  label: string;
  value: string;
  type:
    | 'difficulty'
    | 'spot_type'
    | 'category'
    | 'transmission_type'
    | 'activity_level'
    | 'best_season'
    | 'vehicle_types';
};

export type RootStackParamList = {
  SplashScreen: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string };
  AuthGate: undefined;
  RouteDetail: { routeId: string; shouldRefresh?: boolean; shouldRefreshReviews?: boolean };
  CreateRoute: {
    routeId?: string;
    initialWaypoints?: Array<{
      latitude: number;
      longitude: number;
      title?: string;
      description?: string;
    }>;
    initialName?: string;
    initialDescription?: string;
    initialSearchCoordinates?: string;
    initialRoutePath?: Array<{
      latitude: number;
      longitude: number;
    }>;
    initialStartPoint?: {
      latitude: number;
      longitude: number;
    };
    initialEndPoint?: {
      latitude: number;
      longitude: number;
    };
    fromOnboarding?: boolean;
    onboardingStep?: string;
    isModal?: boolean;
    onClose?: () => void;
    onRouteCreated?: (routeId: string) => void;
  };
  Map: { selectedLocation?: SearchResult };
  Search: undefined;
  AddReview: { routeId: string };
  OnboardingDemo: undefined;
  TranslationDemo: undefined;
  ContentDemo: undefined;
  LicensePlanScreen: {
    fromOnboarding?: boolean;
    onboardingStep?: string;
  };
  RoleSelectionScreen: {
    fromOnboarding?: boolean;
    onboardingStep?: string;
  };
  PublicProfile: { userId: string };
  UsersScreen: undefined;
  ProfileScreen: undefined;

  // Messaging screens
  Messages: undefined;
  Conversation: { conversationId: string };
  Notifications: undefined;
  NewMessage: undefined;

  // Events screens
  Events: undefined;
  EventDetail: { eventId: string };
  CreateEvent: { eventId?: string };
  InviteUsers: {
    eventId: string;
    eventTitle: string;
    onInvitesSent?: (invitedUserIds: string[]) => void;
  };
  RouteExercise: {
    routeId: string;
    exercises: Exercise[];
    routeName?: string;
    startIndex?: number;
  };
  RouteList: {
    title: string;
    routes: Route[];
    type:
      | 'saved'
      | 'driven'
      | 'created'
      | 'nearby'
      | 'difficulty'
      | 'spot_type'
      | 'category'
      | 'city'
      | 'transmission_type'
      | 'activity_level'
      | 'best_season'
      | 'vehicle_types';
    activeFilter?: FilterCategory;
  };
  CommunityFeedScreen: undefined;
  StudentManagementScreen: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  ProgressTab: {
    selectedPathId?: string;
    showDetail?: boolean;
    activeUserId?: string; // Add activeUserId for student switching
    fromOnboarding?: boolean;
    onboardingStep?: string;
  };
  CreateRouteTab: undefined;
  MapTab: {
    fromOnboarding?: boolean;
    onboardingStep?: string;
  };
  BetaTestingTab: undefined;
  ProfileTab: undefined;
  MenuTab: undefined;
  ProfileScreen: undefined;
};

// Combined navigation type that works with both stack and tab navigation
export type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export type RouteDetailRouteProp = RouteProp<RootStackParamList, 'RouteDetail'>;

export interface RouteDetailProps {
  route: RouteDetailRouteProp;
  navigation: NativeStackNavigationProp<RootStackParamList, 'RouteDetail'>;
}
