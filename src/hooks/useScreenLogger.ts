import { useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { AppState, AppStateStatus } from 'react-native';
import {
  logScreenMount,
  logScreenUnmount,
  logScreenFocus,
  logScreenBlur,
  logPerformance,
  logInfo,
  logError,
  logWarn,
} from '../utils/logger';

interface ScreenLoggerOptions {
  screenName: string;
  trackPerformance?: boolean;
  trackMemory?: boolean;
  logProps?: boolean;
}

export function useScreenLogger({
  screenName,
  trackPerformance = true,
  trackMemory = true,
  logProps = false,
}: ScreenLoggerOptions) {
  const mountTime = useRef<number>(Date.now());
  const focusTime = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Track component mount/unmount
  useEffect(() => {
    const startTime = Date.now();
    mountTime.current = startTime;

    logScreenMount(screenName);

    if (trackPerformance) {
      logInfo(`Screen render started`, null, screenName);
    }

    // Track app state changes while this screen is mounted
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        logInfo('App came to foreground', { previousState: appStateRef.current }, screenName);
      } else if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        logInfo('App went to background', { nextState: nextAppState }, screenName);

        // Log memory warning if app is backgrounded (might indicate memory pressure)
        if (nextAppState === 'background') {
          logWarn('App backgrounded - potential memory pressure', null, screenName);
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      const unmountTime = Date.now();
      const totalTime = unmountTime - mountTime.current;

      logScreenUnmount(screenName);

      if (trackPerformance) {
        logPerformance(screenName, 'screen_lifetime', mountTime.current);
        logInfo(`Screen was mounted for ${totalTime}ms`, { totalTime }, screenName);
      }

      subscription?.remove();
    };
  }, [screenName, trackPerformance]);

  // Track screen focus/blur with navigation
  useFocusEffect(
    useRef(() => {
      const startTime = Date.now();
      focusTime.current = startTime;

      logScreenFocus(screenName);

      if (trackPerformance) {
        logInfo('Screen focused', null, screenName);
      }

      return () => {
        const blurTime = Date.now();
        const focusedTime = focusTime.current ? blurTime - focusTime.current : 0;

        logScreenBlur(screenName);

        if (trackPerformance && focusTime.current) {
          logPerformance(screenName, 'screen_focus_duration', focusTime.current);
          logInfo(`Screen was focused for ${focusedTime}ms`, { focusedTime }, screenName);
        }

        focusTime.current = null;
      };
    }).current,
  );

  // Utility functions for manual logging within the screen
  const logAction = (action: string, data?: any) => {
    logInfo(`Action: ${action}`, data, screenName);
  };

  const logAsyncAction = async <T>(
    action: string,
    asyncFn: () => Promise<T>,
    logData?: any,
  ): Promise<T> => {
    const startTime = Date.now();
    logInfo(`Starting async action: ${action}`, logData, screenName);

    try {
      const result = await asyncFn();

      if (trackPerformance) {
        logPerformance(screenName, `async_${action}`, startTime);
      }

      logInfo(`Completed async action: ${action}`, { success: true }, screenName);
      return result;
    } catch (error) {
      logError(`Failed async action: ${action}`, error, screenName);

      if (trackPerformance) {
        logPerformance(screenName, `async_${action}_failed`, startTime);
      }

      throw error;
    }
  };

  const logRenderIssue = (issue: string, details?: any) => {
    logWarn(`Render issue: ${issue}`, details, screenName);
  };

  const logMemoryWarning = (context?: string) => {
    logWarn(`Memory warning${context ? ` - ${context}` : ''}`, undefined, screenName);
  };

  return {
    logAction,
    logAsyncAction,
    logRenderIssue,
    logMemoryWarning,
    screenName,
  };
}
