import { registerRootComponent } from 'expo';
import App from './App';

// Filter out Reanimated warnings in development
if (__DEV__) {
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    if (args[0]?.includes?.('[Reanimated] Reading from `value` during component render')) return;
    originalConsoleWarn(...args);
  };
}

registerRootComponent(App); 