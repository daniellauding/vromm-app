import type { NavigationProp } from '../types/navigation';

export const navigateDomain = (navigation: any) => ({
  home: (screen: string, params?: any) => {
    console.log('[NAV][Domain] → MainTabs > HomeTab >', screen, params || '(no params)');
    navigation.navigate('MainTabs', { screen: 'HomeTab', params: { screen, params } });
  },
  menu: (screen: string, params?: any) => {
    console.log('[NAV][Domain] → MainTabs > MenuTab >', screen, params || '(no params)');
    navigation.navigate('MainTabs', { screen: 'MenuTab', params: { screen, params } });
  },
  map: () => {
    console.log('[NAV][Domain] → MainTabs > MapTab');
    navigation.navigate('MainTabs', { screen: 'MapTab' });
  },
  progress: (screen?: string, params?: any) => {
    if (screen) {
      console.log('[NAV][Domain] → MainTabs > ProgressTab >', screen, params || '(no params)');
      navigation.navigate('MainTabs', { screen: 'ProgressTab', params: { screen, params } });
    } else {
      console.log('[NAV][Domain] → MainTabs > ProgressTab');
      navigation.navigate('MainTabs', { screen: 'ProgressTab' });
    }
  },
});


