const { CapacitorConfig } = require('@capacitor/cli');

const config = {
  appId: 'com.volleyballcoach.app',
  appName: 'Volleyball Coach',
  webDir: 'public',
  server: {
    // In development, allow external access
    // In production (native), this will be ignored and files will be bundled
    android: {
      allowMixedContent: true
    },
    ios: {
      allowMixedContent: true
    }
  },
  plugins: {
    Preferences: {
      // Use native storage for preferences
    }
  }
};

module.exports = config;
