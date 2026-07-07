/** @type {import('expo/config').ExpoConfig} */
const appJson = require('./app-base.json');

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra ?? {}),
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '',
      sessionTimeoutSeconds: process.env.EXPO_PUBLIC_SESSION_TIMEOUT_SECONDS ?? '300', // Default 5 minutos
      eas: {
        projectId: '89c2141e-72ad-4573-b5e8-516dee6e39ab',
      },
    },
  },
};
