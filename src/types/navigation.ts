import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Database } from '../lib/database.types';

export type RootStackParamList = {
  MainTabs: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
  RouteDetail: { routeId: string };
  CreateRoute: undefined;
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