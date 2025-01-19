import { registerRootComponent } from 'expo';
import App from './App';

if (__DEV__) {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (args[0]?.match?.(/Warning/)) return;
    originalConsoleError(...args);
  };
}

registerRootComponent(App); 