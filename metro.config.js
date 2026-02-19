const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Web shims for native-only packages
const webShims = {
  '@stripe/stripe-react-native': path.resolve(__dirname, 'src/web-shims/stripe-react-native.js'),
  'react-native-webview': path.resolve(__dirname, 'src/web-shims/react-native-webview.js'),
  '@react-native-firebase/analytics': path.resolve(__dirname, 'src/web-shims/firebase-analytics.js'),
  'expo-task-manager': path.resolve(__dirname, 'src/web-shims/expo-task-manager.js'),
  '@react-native-google-signin/google-signin': path.resolve(__dirname, 'src/web-shims/google-signin.js'),
  'react-native-web-webview': path.resolve(__dirname, 'src/web-shims/react-native-web-webview.js'),
  'react-native-maps': path.resolve(__dirname, 'src/web-shims/react-native-maps.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webShims[moduleName]) {
    return {
      filePath: webShims[moduleName],
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Add support for SVG files
config.resolver.assetExts = [...config.resolver.assetExts.filter((ext) => ext !== 'svg'), 'ttf'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

config.resolver.unstable_conditionNames = ['browser'];
config.resolver.unstable_enablePackageExports = false;

// Add mjs support
config.resolver.sourceExts.push('mjs');

// Force JSC instead of Hermes
config.server = config.server || {};
config.server.enhanceMiddleware = (middleware, server) => {
  return (req, res, next) => {
    // Force JSC by modifying request headers
    if (req.url && req.url.includes('&dev=true')) {
      req.headers = req.headers || {};
      req.headers['user-agent'] = req.headers['user-agent'] || '';
      req.headers['user-agent'] = req.headers['user-agent'].replace('Hermes', 'JSC');
    }
    return middleware(req, res, next);
  };
};

module.exports = config;
