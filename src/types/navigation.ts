import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Database } from '../lib/database.types';
import { SearchResult } from '../components/SearchView';
import type { Route } from '../hooks/useRoutes';

export type FilterCategory = {
  id: string;
  label: string;
  value: string;
  type: 'difficulty' | 'spot_type' | 'category' | 'transmission_type' | 'activity_level' | 'best_season' | 'vehicle_types';
};

export type RootStackParamList = {
  SplashScreen: undefined;
  Onboarding: undefined;
  MainTabs: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  RouteDetail: { routeId: string };
  CreateRoute: { routeId?: string };
  Map: { selectedLocation?: SearchResult };
  Search: undefined;
  AddReview: { routeId: string };
  OnboardingDemo: undefined;
  TranslationDemo: undefined;
  LicensePlanScreen: undefined;
  RoleSelectionScreen: undefined;
  PublicProfile: { userId: string };
  UsersScreen: undefined;
  RouteList: {
    title: string;
    routes: Route[];
    type: 'saved' | 'driven' | 'created' | 'nearby' | 'difficulty' | 'spot_type' | 'category' | 'city' | 'transmission_type' | 'activity_level' | 'best_season' | 'vehicle_types';
    activeFilter?: FilterCategory;
  };
};

export type TabParamList = {
  HomeTab: undefined;
  ProgressTab: {
    selectedPathId?: string;
    showDetail?: boolean;
  };
  MapTab: undefined;
  ProfileTab: undefined;
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