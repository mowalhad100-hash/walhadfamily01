import { initializeApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";
// Firebase exposes this symbol in Metro's react-native entry, but omits it from its generic types.
// @ts-expect-error React Native-only export, available at runtime via Metro.
import { getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const configured = !!(config.apiKey && config.projectId && config.appId);
const app = configured ? initializeApp(config) : null;
export const auth = app
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  : null!;
export const db = app ? getFirestore(app) : null!;
export const storage = app ? getStorage(app) : null!;
export const functions = app
  ? getFunctions(app, process.env.EXPO_PUBLIC_FUNCTIONS_REGION || "us-central1")
  : null!;
