import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { Database } from '../lib/database.types';

export type RootStackParamList = {
  Tabs: undefined;
  CreateRoute: undefined;
  RouteDetail: {
    routeId: string;
  };
  Login: undefined;
  Signup: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  ProfileTab: undefined;
};

// Combined navigation type that works with both stack and tab navigation
export type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList>,
  BottomTabNavigationProp<TabParamList>
>;

export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Signup: undefined;
  Profile: undefined;
  CreateRoute: undefined;
  RouteDetail: {
    routeId: string;
  };
};

export type NavigationProp = NativeStackNavigationProp<RootStackParamList>; 