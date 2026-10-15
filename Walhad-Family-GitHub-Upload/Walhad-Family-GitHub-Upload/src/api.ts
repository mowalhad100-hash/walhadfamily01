import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, Platform } from "react-native";
import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  updateDoc,
  addDoc,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { db, functions } from "./firebase";
import { chatId, validMessage } from "./model.mjs";
export type Profile = {
  id: string;
  displayName: string;
  photoURL: string;
  bio: string;
  online: boolean;
  lastSeen: any;
};
export type Conversation = {
  id: string;
  members: string[];
  lastMessage?: string;
  updatedAt?: any;
};
export type Message = {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
};
export type Invite = {
  id: string;
  callerId: string;
  calleeId: string;
  callerName: string;
  video: boolean;
  status: string;
  expiresAt: any;
};
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
export async function openChat(uid: string, other: string) {
  const id = chatId(uid, other);
  await setDoc(
    doc(db, "chats", id),
    { members: [uid, other].sort() },
    { merge: true },
  );
  return id;
}
export async function sendMessage(id: string, uid: string, text: string) {
  if (!validMessage(text))
    throw Error("Message must contain 1–4000 characters.");
  await addDoc(collection(db, "chats", id, "messages"), {
    senderId: uid,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });
}
export function presence(uid: string) {
  let foreground = AppState.currentState === "active";
  const write = (online: boolean) =>
    updateDoc(doc(db, "users", uid), {
      online,
      lastSeen: serverTimestamp(),
    }).catch(console.warn);
  void write(foreground);
  const interval = setInterval(() => {
    if (foreground) void write(true);
  }, 40000);
  const sub = AppState.addEventListener("change", (s) => {
    foreground = s === "active";
    void write(foreground);
  });
  return () => {
    clearInterval(interval);
    sub.remove();
    void write(false);
  };
}
export async function registerPush(uid: string) {
  if (!Device.isDevice) return;
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("default", {
      name: "Messages & calls",
      importance: Notifications.AndroidImportance.HIGH,
      sound: "default",
    });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;
  if (!projectId)
    throw Error("Set EXPO_PUBLIC_EAS_PROJECT_ID to enable notifications.");
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await setDoc(doc(db, "users", uid, "devices", encodeURIComponent(token)), {
    token,
    updatedAt: serverTimestamp(),
  });
  await AsyncStorage.setItem("walhad-push-token", token);
}
export async function unregisterPush(uid: string) {
  const token = await AsyncStorage.getItem("walhad-push-token");
  if (token) await httpsCallable(functions, "removePushDevices")({ token });
  await AsyncStorage.removeItem("walhad-push-token");
}
export async function createCall(calleeId: string, video: boolean) {
  const result = await httpsCallable(
    functions,
    "createCall",
  )({ calleeId, video });
  return result.data as { callId: string };
}
export async function streamToken() {
  return (await httpsCallable(functions, "streamToken")()).data as {
    token: string;
  };
}
export async function changeCall(
  callId: string,
  action: "accept" | "decline" | "end",
) {
  await httpsCallable(functions, "changeCall")({ callId, action });
}
export async function deleteAccount() {
  await httpsCallable(functions, "deleteAccount")();
}

export async function blockUser(targetId: string, blocked: boolean) {
  await httpsCallable(functions, "blockUser")({ targetId, blocked });
}
export async function reportUser(targetId: string, reason: string) {
  await httpsCallable(functions, "reportUser")({ targetId, reason });
}
