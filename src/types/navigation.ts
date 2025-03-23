import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Database } from '../lib/database.types';
import { SearchResult } from '../components/SearchView';

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
};

export type TabParamList = {
  HomeTab: undefined;
  MapTab: undefined;
  ProfileTab: undefined;
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