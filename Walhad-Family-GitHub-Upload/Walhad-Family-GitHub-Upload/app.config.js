const fs = require("fs");
const googleFile = process.env.GOOGLE_SERVICES_JSON || "./google-services.json";
module.exports = {
  expo: {
    name: "Walhad Family",
    slug: "walhad-family",
    scheme: "walhadfamily",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#F4F8F4",
    },
    ios: {
      bundleIdentifier: "com.walhad.family",
      supportsTablet: true,
      infoPlist: { ITSAppUsesNonExemptEncryption: false },
    },
    android: {
      package: "com.walhad.family",
      versionCode: 1,
      ...(fs.existsSync(googleFile) ? { googleServicesFile: googleFile } : {}),
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#087F67",
      },
    },
    plugins: [
      "expo-font",
      "expo-dev-client",
      ["expo-build-properties", { ios: { deploymentTarget: "15.1" } }],
      [
        "expo-image-picker",
        {
          photosPermission: "Choose your Walhad Family profile picture.",
          cameraPermission: "Take a profile picture.",
        },
      ],
      ["expo-notifications", { color: "#087F67" }],
      ["@stream-io/video-react-native-sdk", { ringing: false }],
      [
        "@config-plugins/react-native-webrtc",
        {
          cameraPermission:
            "Allow Walhad Family to use your camera for video calls.",
          microphonePermission:
            "Allow Walhad Family to use your microphone for calls.",
        },
      ],
    ],
    extra: {
      eas: { projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID || undefined },
    },
    owner: process.env.EXPO_OWNER || undefined,
  },
};
