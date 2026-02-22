// Web shim for @react-native-google-signin/google-signin
export const GoogleSignin = {
  configure: () => {},
  hasPlayServices: async () => false,
  signIn: async () => ({ user: null }),
  signOut: async () => {},
  isSignedIn: async () => false,
  getCurrentUser: () => null,
};

export const statusCodes = {
  SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED',
  IN_PROGRESS: 'IN_PROGRESS',
  PLAY_SERVICES_NOT_AVAILABLE: 'PLAY_SERVICES_NOT_AVAILABLE',
};

export default GoogleSignin;
