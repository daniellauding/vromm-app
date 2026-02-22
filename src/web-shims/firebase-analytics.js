// Web shim for @react-native-firebase/analytics
const analytics = () => ({
  logEvent: async () => {},
  setUserId: async () => {},
  setUserProperties: async () => {},
  setCurrentScreen: async () => {},
});

analytics.default = analytics;
module.exports = analytics;
module.exports.default = analytics;
