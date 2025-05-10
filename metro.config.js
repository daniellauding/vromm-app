const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for SVG files
config.resolver.assetExts = [...config.resolver.assetExts.filter(ext => ext !== 'svg'), 'ttf'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

config.resolver.unstable_conditionNames = ["browser"];
config.resolver.unstable_enablePackageExports = false;

// Add mjs support
config.resolver.sourceExts.push('mjs');

module.exports = config;
