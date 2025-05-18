const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for SVG files
config.resolver.assetExts = [...config.resolver.assetExts.filter(ext => ext !== 'svg'), 'ttf'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

config.resolver.unstable_conditionNames = ["browser"];
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
