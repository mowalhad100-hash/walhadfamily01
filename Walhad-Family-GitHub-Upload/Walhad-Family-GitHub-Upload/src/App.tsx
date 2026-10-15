import { GestureHandlerRootView } from "react-native-gesture-handler";
import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Modal,
  Linking,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  reload,
} from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  setDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import {
  StreamVideo,
  StreamCall,
  StreamVideoClient,
  CallContent,
} from "@stream-io/video-react-native-sdk";
import type { Call } from "@stream-io/video-react-native-sdk";
import { auth, db, storage, configured } from "./firebase";
import {
  Profile,
  Conversation,
  Message,
  Invite,
  presence,
  registerPush,
  unregisterPush,
  openChat,
  sendMessage,
  createCall,
  streamToken,
  changeCall,
  deleteAccount,
  blockUser,
  reportUser,
} from "./api";
import { initials, isOnline } from "./model.mjs";
import { C, S } from "./theme";
const error = (e: any) =>
  Alert.alert(
    "Walhad Family",
    e?.message || "Something went wrong. Please try again.",
  );
function Icon({
  name,
  onPress,
  color = C.green,
}: {
  name: any;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={String(name).replaceAll("-", " ")}
      onPress={onPress}
      style={S.icon}
    >
      <Ionicons name={name} size={23} color={color} />
    </Pressable>
  );
}
function Avatar({
  profile,
  size = 51,
}: {
  profile?: Partial<Profile>;
  size?: number;
}) {
  return (
    <View
      style={[
        S.avatar,
        { width: size, height: size, borderRadius: size * 0.34 },
      ]}
    >
      {profile?.photoURL ? (
        <Image
          source={{ uri: profile.photoURL }}
          style={{ width: size, height: size, borderRadius: size * 0.34 }}
        />
      ) : (
        <Text
          style={{ fontSize: size * 0.32, fontWeight: "600", color: C.green }}
        >
          {initials(profile?.displayName)}
        </Text>
      )}
      {isOnline(profile) && (
        <View
          style={{
            position: "absolute",
            right: -1,
            bottom: 0,
            width: 13,
            height: 13,
            borderRadius: 8,
            backgroundColor: "#47B481",
            borderWidth: 3,
            borderColor: "white",
          }}
        />
      )}
    </View>
  );
}
function Button({
  title,
  onPress,
  busy = false,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={[S.button, { opacity: busy ? 0.6 : 1 }]}
    >
      {busy ? (
        <ActivityIndicator color="white" />
      ) : (
        <Text style={S.buttonText}>{title}</Text>
      )}
    </Pressable>
  );
}
function Brand() {
  return (
    <View style={[S.row, { gap: 12 }]}>
      <View style={S.logo}>
        <Text style={{ color: "white", fontSize: 27, fontWeight: "800" }}>
          W
        </Text>
      </View>
      <View>
        <Text
          style={{
            fontSize: 21,
            fontWeight: "700",
            color: C.dark,
            letterSpacing: -0.6,
          }}
        >
          Walhad Family
        </Text>
        <Text
          style={[S.small, { fontSize: 10, letterSpacing: 1.6, marginTop: 3 }]}
        >
          A LITTLE CLOSER
        </Text>
      </View>
    </View>
  );
}
function Setup() {
  return (
    <SafeAreaView style={S.page}>
      <View style={S.empty}>
        <Brand />
        <Ionicons name="chatbubbles-outline" size={86} color={C.green} />
        <Text style={[S.title, { textAlign: "center" }]}>
          Your family.\nOne little place.
        </Text>
        <Text style={S.caption}>
          This is the native app, not a messaging demo. Connect your Firebase
          and Stream projects to start real conversations.
        </Text>
        <View
          style={{
            backgroundColor: "white",
            padding: 22,
            borderRadius: 18,
            gap: 12,
          }}
        >
          <Text style={S.text}>1. Copy .env.example to .env</Text>
          <Text style={S.text}>2. Configure Firebase, Stream & EAS</Text>
          <Text style={S.text}>3. Deploy rules and Cloud Functions</Text>
          <Text style={S.text}>4. Install an EAS development build</Text>
        </View>
        <Text style={S.small}>Full Windows instructions are in README.md.</Text>
      </View>
    </SafeAreaView>
  );
}
function AuthScreen() {
  const [signup, setSignup] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      if (signup) {
        if (!name.trim()) throw Error("Enter your name.");
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        );
        await setDoc(doc(db, "users", credential.user.uid), {
          displayName: name.trim().slice(0, 60),
          photoURL: "",
          bio: "",
          online: false,
          lastSeen: serverTimestamp(),
        });
        await sendEmailVerification(credential.user);
      } else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={S.page}>
      <KeyboardAvoidingView
        style={S.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 28,
            flexGrow: 1,
            justifyContent: "center",
          }}
          keyboardShouldPersistTaps="handled"
        >
          <Brand />
          <View style={{ height: 50 }} />
          <Text style={S.label}>WHEREVER LIFE TAKES YOU</Text>
          <Text style={[S.title, { fontSize: 36, marginBottom: 14 }]}>
            {signup ? "A place for\nyour people." : "Good to have\nyou back."}
          </Text>
          <Text style={[S.caption, { textAlign: "left", marginBottom: 27 }]}>
            Little updates. Long conversations. Always connected.
          </Text>
          {signup && (
            <TextInput
              accessibilityLabel="Your name"
              placeholder="Your name"
              value={name}
              onChangeText={setName}
              maxLength={60}
              style={[S.input, { marginBottom: 12 }]}
            />
          )}
          <TextInput
            accessibilityLabel="Email address"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            style={[S.input, { marginBottom: 12 }]}
          />
          <TextInput
            accessibilityLabel="Password"
            autoCapitalize="none"
            placeholder="Password (at least 8 characters)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={S.input}
          />
          <Button
            title={signup ? "Create your account" : "Sign in"}
            busy={busy}
            onPress={() => {
              if (password.length < 8 && signup)
                return error(Error("Use at least 8 characters."));
              void submit();
            }}
          />
          {!signup && (
            <Pressable
              onPress={async () => {
                try {
                  if (!email.trim())
                    throw Error("Enter your email above first.");
                  await sendPasswordResetEmail(auth, email.trim());
                  Alert.alert(
                    "Check your inbox",
                    "If the account exists, a reset link will arrive.",
                  );
                } catch (e) {
                  error(e);
                }
              }}
            >
              <Text
                style={{ textAlign: "center", color: C.green, marginTop: 20 }}
              >
                Forgot password?
              </Text>
            </Pressable>
          )}
          <Pressable onPress={() => setSignup(!signup)}>
            <Text
              style={{ textAlign: "center", color: C.green, marginTop: 30 }}
            >
              {signup
                ? "Already part of the family? Sign in"
                : "New here? Create an account"}
            </Text>
          </Pressable>
          <Text style={[S.caption, { fontSize: 11, marginTop: 30 }]}>
            Private conversations. Real connections.\nMessages are
            access-controlled, not end-to-end encrypted.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function Verify({ user, onVerified }: { user: User; onVerified: () => void }) {
  const [name, setName] = useState("");
  return (
    <SafeAreaView style={S.page}>
      <View style={S.empty}>
        <Brand />
        <Ionicons name="mail-open-outline" size={65} color={C.green} />
        <Text style={S.title}>Check your inbox</Text>
        <Text style={S.caption}>
          Verify {user.email} before accessing profiles, messages or calls. If
          signup was interrupted, enter your name below to finish your profile.
        </Text>
        <TextInput
          placeholder="Your name (if needed)"
          value={name}
          onChangeText={setName}
          style={[S.input, { width: "100%" }]}
        />
        <Button
          title="I've verified my email"
          onPress={async () => {
            try {
              await reload(user);
              await user.getIdToken(true);
              if (!user.emailVerified)
                throw Error("Open the verification link first.");
              const p = await getDoc(doc(db, "users", user.uid));
              if (!p.exists()) {
                if (!name.trim()) throw Error("Please enter your name.");
                await setDoc(p.ref, {
                  displayName: name.trim().slice(0, 60),
                  photoURL: "",
                  bio: "",
                  online: false,
                  lastSeen: serverTimestamp(),
                });
              }
              onVerified();
            } catch (e) {
              error(e);
            }
          }}
        />
        <Pressable
          onPress={() =>
            sendEmailVerification(user)
              .then(() => Alert.alert("Verification sent"))
              .catch(error)
          }
        >
          <Text style={{ color: C.green, marginTop: 12 }}>
            Resend verification email
          </Text>
        </Pressable>
        <Pressable onPress={() => signOut(auth)}>
          <Text style={S.small}>Back to sign in</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
function ProfileScreen({ user, profile }: { user: User; profile?: Profile }) {
  const [name, setName] = useState(profile?.displayName || ""),
    [bio, setBio] = useState(profile?.bio || ""),
    [photo, setPhoto] = useState(profile?.photoURL || ""),
    [busy, setBusy] = useState(false);
  async function picture() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted)
        throw Error("Photo library permission is needed.");
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (picked.canceled) return;
      setBusy(true);
      const asset = picked.assets[0];
      const blob = await (await fetch(asset.uri)).blob();
      if (blob.size >= 5 * 1024 * 1024)
        throw Error("Choose an image smaller than 5 MB.");
      const type = asset.mimeType || "image/jpeg";
      if (!["image/jpeg", "image/png", "image/webp"].includes(type))
        throw Error("Choose a JPEG, PNG or WebP image.");
      const location = ref(storage, `avatars/${user.uid}/profile`);
      await uploadBytes(location, blob, { contentType: type });
      const url = await getDownloadURL(location);
      await updateDoc(doc(db, "users", user.uid), {
        photoURL: url,
        lastSeen: serverTimestamp(),
      });
      setPhoto(url);
    } catch (e) {
      error(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text style={S.label}>YOUR LITTLE CORNER</Text>
      <View style={{ alignItems: "center", marginVertical: 25, gap: 12 }}>
        <Avatar profile={{ displayName: name, photoURL: photo }} size={94} />
        <Pressable disabled={busy} onPress={picture}>
          <Text style={{ color: C.green }}>Change profile picture</Text>
        </Pressable>
      </View>
      <Text style={S.label}>DISPLAY NAME</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        maxLength={60}
        style={S.input}
      />
      <Text style={S.label}>ABOUT YOU</Text>
      <TextInput
        value={bio}
        onChangeText={setBio}
        maxLength={160}
        placeholder="A little about you"
        style={S.input}
      />
      <Text style={[S.small, { marginTop: 15 }]}>{user.email} · Verified</Text>
      <Button
        title="Save profile"
        busy={busy}
        onPress={async () => {
          setBusy(true);
          try {
            if (!name.trim()) throw Error("Your name cannot be empty.");
            await updateDoc(doc(db, "users", user.uid), {
              displayName: name.trim(),
              bio,
              lastSeen: serverTimestamp(),
            });
            Alert.alert("Profile saved");
          } catch (e) {
            error(e);
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button
        title="Enable notifications"
        onPress={() =>
          registerPush(user.uid)
            .then(() =>
              Alert.alert(
                "Notification settings updated",
                "Delivery requires OS permission and configured APNs/FCM credentials.",
              ),
            )
            .catch(error)
        }
      />
      <Button
        title="Sign out"
        onPress={async () => {
          try {
            await unregisterPush(user.uid);
            await updateDoc(doc(db, "users", user.uid), {
              online: false,
              lastSeen: serverTimestamp(),
            });
            await signOut(auth);
          } catch (e) {
            error(e);
          }
        }}
      />
      <Pressable
        onPress={() =>
          Alert.alert(
            "Delete your account?",
            "Your profile, photos and all your private conversations will be permanently removed for both participants. Sign in again first if your session is older than 5 minutes.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete account",
                style: "destructive",
                onPress: () =>
                  deleteAccount()
                    .then(() => signOut(auth))
                    .catch(error),
              },
            ],
          )
        }
      >
        <Text style={{ color: "#B34F4B", textAlign: "center", marginTop: 30 }}>
          Delete my account & data
        </Text>
      </Pressable>
      <Text style={[S.caption, { marginTop: 35, fontSize: 11 }]}>
        Walhad Family 1.0.0 · Made for staying close{"\n"}Profile discovery is
        visible to registered, verified users.{"\n"}Online status is approximate
        and expires after 100 seconds.
      </Text>
    </ScrollView>
  );
}
function ChatScreen({
  uid,
  chatId,
  other,
  onBack,
  onCall,
}: {
  uid: string;
  chatId: string;
  other?: Profile;
  onBack: () => void;
  onCall: (video: boolean) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]),
    [older, setOlder] = useState<Message[]>([]),
    [text, setText] = useState(""),
    [sending, setSending] = useState(false),
    [loadingOlder, setLoadingOlder] = useState(false),
    [more, setMore] = useState(true);
  const [blocked, setBlocked] = useState(false),
    [reporting, setReporting] = useState(false),
    [reason, setReason] = useState("");
  useEffect(() => {
    if (!other) return;
    return onSnapshot(
      doc(db, "users", uid, "blocks", other.id),
      (s) => setBlocked(s.exists()),
      error,
    );
  }, [uid, other?.id]);
  const cursor = useRef<any>(null);
  useEffect(() => {
    setOlder([]);
    setMore(true);
    cursor.current = null;
    return onSnapshot(
      query(
        collection(db, "chats", chatId, "messages"),
        orderBy("createdAt", "desc"),
        limit(50),
      ),
      (s) => {
        setMessages((previous) => [
          ...new Map(
            [
              ...previous,
              ...s.docs.map((d) => ({ id: d.id, ...d.data() }) as Message),
            ].map((m) => [m.id, m]),
          ).values(),
        ]);
        if (!cursor.current) cursor.current = s.docs.at(-1);
      },
      error,
    );
  }, [chatId]);
  async function olderMessages() {
    if (!cursor.current) return;
    setLoadingOlder(true);
    try {
      const s = await getDocs(
        query(
          collection(db, "chats", chatId, "messages"),
          orderBy("createdAt", "desc"),
          startAfter(cursor.current),
          limit(50),
        ),
      );
      setOlder((old) => [
        ...old,
        ...s.docs.map((d) => ({ id: d.id, ...d.data() }) as Message),
      ]);
      cursor.current = s.docs.at(-1);
      setMore(s.size === 50);
    } catch (e) {
      error(e);
    } finally {
      setLoadingOlder(false);
    }
  }
  async function send() {
    if (sending || !text.trim()) return;
    setSending(true);
    const value = text;
    try {
      await sendMessage(chatId, uid, value);
      setText((current) => (current === value ? "" : current));
    } catch (e) {
      error(e);
    } finally {
      setSending(false);
    }
  }
  const merged = [
    ...new Map([...messages, ...older].map((m) => [m.id, m])).values(),
  ].sort(
    (a, b) =>
      (b.createdAt?.toMillis?.() || Date.now()) -
      (a.createdAt?.toMillis?.() || Date.now()),
  );
  return (
    <KeyboardAvoidingView
      style={S.fill}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[S.header, S.row, { paddingHorizontal: 6, gap: 8 }]}>
        <Icon name="chevron-back" onPress={onBack} />
        <Avatar profile={other} size={41} />
        <View style={S.fill}>
          <Text style={[S.text, { fontWeight: "600" }]} numberOfLines={1}>
            {other?.displayName || "Family member"}
          </Text>
          <Text style={[S.small, { marginTop: 4 }]}>
            {isOnline(other) ? "Online now" : "Offline"}
          </Text>
        </View>
        <Icon name="call-outline" onPress={() => onCall(false)} />
        <Icon name="videocam-outline" onPress={() => onCall(true)} />
        <Icon
          name="ellipsis-vertical"
          onPress={() =>
            Alert.alert(
              "Conversation options",
              "Manage this private conversation",
              [
                {
                  text: blocked ? "Unblock user" : "Block user",
                  onPress: () =>
                    other && blockUser(other.id, !blocked).catch(error),
                },
                { text: "Report user", onPress: () => setReporting(true) },
                { text: "Cancel", style: "cancel" },
              ],
            )
          }
        />
      </View>
      {blocked && (
        <Text
          style={{ padding: 12, color: "#A25A43", backgroundColor: "#FFF5E9" }}
        >
          You blocked this member. Messages and calls are disabled.
        </Text>
      )}
      <Modal
        visible={reporting}
        transparent
        animationType="slide"
        onRequestClose={() => setReporting(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "#153B3480",
            padding: 25,
          }}
        >
          <View
            style={{ padding: 23, borderRadius: 20, backgroundColor: "white" }}
          >
            <Text style={S.title}>Report a concern</Text>
            <Text
              style={[S.caption, { textAlign: "left", marginVertical: 15 }]}
            >
              Tell the app operator what happened. Do not include passwords.
              Reports are reviewed by the operator, not by an automated safety
              service.
            </Text>
            <TextInput
              multiline
              maxLength={1000}
              value={reason}
              onChangeText={setReason}
              placeholder="Reason (5–1000 characters)"
              style={[S.input, { minHeight: 100 }]}
            />
            <Button
              title="Send report"
              onPress={async () => {
                try {
                  if (!other) return;
                  await reportUser(other.id, reason);
                  setReporting(false);
                  setReason("");
                  Alert.alert(
                    "Report submitted",
                    "The app operator can review your report.",
                  );
                } catch (e) {
                  error(e);
                }
              }}
            />
            <Button title="Cancel" onPress={() => setReporting(false)} />
          </View>
        </View>
      </Modal>
      <FlatList
        inverted
        data={merged}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 18,
          flexGrow: 1,
        }}
        ListFooterComponent={
          messages.length >= 50 && more ? (
            <Pressable disabled={loadingOlder} onPress={olderMessages}>
              <Text style={[S.caption, { padding: 15 }]}>
                {loadingOlder ? "Loading…" : "Load earlier messages"}
              </Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ transform: [{ scaleY: -1 }], padding: 35 }}>
            <Text style={S.caption}>
              This is the start of your conversation.\nSay a little hello.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[S.bubble, item.senderId === uid && S.mine]}>
            <Text style={[S.text, { lineHeight: 22 }]}>{item.text}</Text>
            <Text
              style={{
                fontSize: 9,
                color: C.muted,
                textAlign: "right",
                marginTop: 5,
              }}
            >
              {item.createdAt?.toDate?.().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }) || "Sending…"}
            </Text>
          </View>
        )}
      />
      <View style={S.composer}>
        <TextInput
          accessibilityLabel="Message"
          multiline
          maxLength={4000}
          placeholder="A little message…"
          value={text}
          onChangeText={setText}
          style={[
            S.input,
            { flex: 1, borderWidth: 0, maxHeight: 130, padding: 10 },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send message"
          disabled={sending || !text.trim()}
          onPress={send}
          style={{
            backgroundColor: C.green,
            padding: 13,
            borderRadius: 14,
            opacity: !text.trim() ? 0.45 : 1,
          }}
        >
          {sending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Ionicons name="send" size={21} color="white" />
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
function CallScreen({
  client,
  callId,
  uid,
  onClose,
}: {
  client: StreamVideoClient;
  callId: string;
  uid: string;
  onClose: () => void;
}) {
  const [invite, setInvite] = useState<Invite | null>(null),
    [call, setCall] = useState<Call | null>(null),
    [failure, setFailure] = useState("");
  const instance = useRef<Call | null>(null);
  const shouldJoin =
    !!invite && (invite.callerId === uid || invite.status === "accepted");
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "calls", callId),
      (s) => {
        if (!s.exists()) {
          onClose();
          return;
        }
        const d = { id: s.id, ...s.data() } as Invite;
        setInvite(d);
        if (["ended", "declined", "missed"].includes(d.status)) onClose();
      },
      (e) => {
        setFailure(e.message);
      },
    );
    return () => {
      unsub();
      const c = instance.current;
      if (c) {
        void c.leave().catch(console.warn);
        instance.current = null;
      }
    };
  }, [callId]);
  useEffect(() => {
    if (!invite || !shouldJoin || instance.current) return;
    const c = client.call("default", callId);
    instance.current = c;
    let alive = true;
    const join = async () => {
      try {
        if (!invite.video) await c.camera.disable();
        await c.join({ create: false });
        if (alive) setCall(c);
        else await c.leave();
      } catch (e: any) {
        if (alive) setFailure(e.message);
      }
    };
    void join();
    return () => {
      alive = false;
    };
  }, [shouldJoin, client, callId]);
  useEffect(() => {
    if (invite?.status !== "ringing") return;
    const timeout = setTimeout(
      () => {
        if (invite.callerId === uid)
          void changeCall(callId, "end").catch(console.warn);
        else onClose();
      },
      Math.max(0, invite.expiresAt.toMillis() - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [invite?.status, callId]);
  async function hangup() {
    try {
      await changeCall(callId, "end");
    } catch (e) {
      error(e);
    } finally {
      onClose();
    }
  }
  return (
    <Modal visible animationType="slide" onRequestClose={() => void hangup()}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#103E33" }}>
        {failure ? (
          <View style={S.empty}>
            <Text style={{ color: "white" }}>
              Call could not connect: {failure}
            </Text>
            <Button title="Close call" onPress={() => void hangup()} />
          </View>
        ) : call ? (
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <CallContent onHangupCallHandler={() => void hangup()} />
            </StreamCall>
          </StreamVideo>
        ) : (
          <View style={S.empty}>
            <Ionicons
              name={invite?.video ? "videocam" : "call"}
              size={65}
              color="#91C9AD"
            />
            <Text style={{ color: "white", fontSize: 25, fontWeight: "600" }}>
              {invite?.callerId === uid
                ? "Calling…"
                : invite?.callerName || "Incoming call"}
            </Text>
            <Text style={{ color: "#ACC9B8" }}>
              {invite?.video ? "Video" : "Audio"} call · Walhad Family
            </Text>
            {invite?.calleeId === uid && invite.status === "ringing" ? (
              <View style={{ gap: 12, width: "100%" }}>
                <Button
                  title="Accept call"
                  onPress={() => changeCall(callId, "accept").catch(error)}
                />
                <Button
                  title="Decline"
                  onPress={() =>
                    changeCall(callId, "decline").then(onClose).catch(error)
                  }
                />
              </View>
            ) : (
              <Button title="End call" onPress={() => void hangup()} />
            )}
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
function Home({ user }: { user: User }) {
  const [profiles, setProfiles] = useState<Profile[]>([]),
    [chats, setChats] = useState<Conversation[]>([]),
    [tab, setTab] = useState<"chats" | "people" | "profile">("chats"),
    [search, setSearch] = useState(""),
    [active, setActive] = useState<string | null>(null),
    [callId, setCallId] = useState<string | null>(null),
    [client, setClient] = useState<StreamVideoClient | null>(null),
    [callBusy, setCallBusy] = useState(false),
    [status, setStatus] = useState(""),
    [, tick] = useState(0);
  const currentCall = useRef<string | null>(null);
  currentCall.current = callId;
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 30000);
    const a = onSnapshot(
      query(collection(db, "users"), orderBy("displayName"), limit(200)),
      (s) =>
        setProfiles(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Profile)),
      error,
    );
    const b = onSnapshot(
      query(
        collection(db, "chats"),
        where("members", "array-contains", user.uid),
      ),
      (s) =>
        setChats(
          s.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Conversation)
            .sort(
              (a, b) =>
                (b.updatedAt?.toMillis?.() || 0) -
                (a.updatedAt?.toMillis?.() || 0),
            ),
        ),
      error,
    );
    const c = presence(user.uid);
    void registerPush(user.uid).catch((e) =>
      setStatus(`Notifications: ${e.message}`),
    );
    return () => {
      clearInterval(timer);
      a();
      b();
      c();
    };
  }, [user.uid]);
  useEffect(() => {
    if (!process.env.EXPO_PUBLIC_STREAM_API_KEY) {
      setStatus(
        "Calls require EXPO_PUBLIC_STREAM_API_KEY and deployed backend functions.",
      );
      return;
    }
    let alive = true;
    let connected: StreamVideoClient | undefined;
    async function connect() {
      try {
        const c = new StreamVideoClient({
          apiKey: process.env.EXPO_PUBLIC_STREAM_API_KEY!,
          user: { id: user.uid },
          tokenProvider: async () => (await streamToken()).token,
        });
        connected = c;
        if (alive) setClient(c);
        else await c.disconnectUser();
      } catch (e: any) {
        setStatus(`Calling unavailable: ${e.message}`);
      }
    }
    void connect();
    return () => {
      alive = false;
      void connected?.disconnectUser();
    };
  }, [user.uid]);
  async function notification(data: any) {
    if (data?.kind === "message" && typeof data.chatId === "string") {
      try {
        const chat = await getDoc(doc(db, "chats", data.chatId));
        if (chat.exists() && chat.data().members.includes(user.uid)) {
          setActive(data.chatId);
          setTab("chats");
        }
      } catch (e) {
        error(e);
      }
    }
    if (data?.kind === "call" && typeof data.callId === "string") {
      try {
        const c = await getDoc(doc(db, "calls", data.callId));
        if (
          c.exists() &&
          c.data().members.includes(user.uid) &&
          ["ringing", "accepted"].includes(c.data().status) &&
          c.data().expiresAt.toMillis() > Date.now()
        ) {
          setCallId(c.id);
        } else Alert.alert("Call no longer available");
      } catch (e) {
        error(e);
      }
    }
  }
  useEffect(() => {
    const s = Notifications.addNotificationResponseReceivedListener(
      (r) => void notification(r.notification.request.content.data),
    );
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) void notification(r.notification.request.content.data);
    });
    const unsub = onSnapshot(
      query(
        collection(db, "calls"),
        where("members", "array-contains", user.uid),
      ),
      (s) => {
        const incoming = s.docs.find(
          (d) =>
            d.data().calleeId === user.uid &&
            d.data().status === "ringing" &&
            d.data().expiresAt.toMillis() > Date.now(),
        );
        if (incoming && !currentCall.current) setCallId(incoming.id);
      },
      error,
    );
    return () => {
      s.remove();
      unsub();
    };
  }, [user.uid]);
  const own = profiles.find((p) => p.id === user.uid);
  const selected = chats.find((c) => c.id === active);
  const other = profiles.find(
    (p) => p.id === selected?.members.find((id) => id !== user.uid),
  );
  async function startCall(video: boolean) {
    if (!other || callBusy) return;
    if (!client)
      return Alert.alert(
        "Calling not configured",
        "Set your Stream key, deploy functions and restart the app.",
      );
    setCallBusy(true);
    try {
      const result = await createCall(other.id, video);
      setCallId(result.callId);
    } catch (e) {
      error(e);
    } finally {
      setCallBusy(false);
    }
  }
  const people = profiles.filter(
    (p) =>
      p.id !== user.uid &&
      p.displayName.toLowerCase().includes(search.toLowerCase()),
  );
  const filtered = chats.filter((c) =>
    profiles
      .find((p) => c.members.includes(p.id) && p.id !== user.uid)
      ?.displayName.toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <SafeAreaView
      style={[S.page, { backgroundColor: "white" }]}
      edges={["top", "bottom"]}
    >
      {active ? (
        <ChatScreen
          uid={user.uid}
          chatId={active}
          other={other}
          onBack={() => setActive(null)}
          onCall={startCall}
        />
      ) : (
        <>
          <View style={S.header}>
            <View style={S.between}>
              <Brand />
              <Icon
                name={
                  tab === "profile"
                    ? "chatbubble-ellipses-outline"
                    : "create-outline"
                }
                onPress={() => setTab(tab === "profile" ? "chats" : "people")}
              />
            </View>
            {tab !== "profile" && (
              <>
                <View
                  style={[
                    S.row,
                    {
                      backgroundColor: C.bg,
                      borderRadius: 13,
                      paddingHorizontal: 13,
                      marginTop: 25,
                    },
                  ]}
                >
                  <Ionicons name="search-outline" size={19} color={C.muted} />
                  <TextInput
                    accessibilityLabel="Search people"
                    placeholder="Search your people"
                    value={search}
                    onChangeText={setSearch}
                    style={{ padding: 13, flex: 1, color: C.dark }}
                  />
                </View>
                <View style={[S.between, { marginTop: 22 }]}>
                  <Text
                    style={{ fontSize: 22, fontWeight: "600", color: C.dark }}
                  >
                    {tab === "people" ? "Your people" : "Conversations"}
                  </Text>
                  <View style={S.badge}>
                    <Text style={{ fontSize: 11, color: C.green }}>
                      {tab === "people" ? people.length : chats.length}{" "}
                      {tab === "people" ? "members" : "chats"}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
          {!!status && (
            <Pressable onPress={() => Alert.alert("Service status", status)}>
              <Text
                style={[S.small, { backgroundColor: "#FFF6DF", padding: 12 }]}
                numberOfLines={2}
              >
                {status}
              </Text>
            </Pressable>
          )}
          {tab === "profile" ? (
            <ProfileScreen
              key={own?.id || "profile"}
              user={user}
              profile={own}
            />
          ) : tab === "people" ? (
            <FlatList
              data={people}
              keyExtractor={(p) => p.id}
              ListHeaderComponent={
                <Text style={{ fontSize: 11, color: C.muted, padding: 20 }}>
                  REGISTERED FAMILY MEMBERS · FIRST 200
                </Text>
              }
              ListEmptyComponent={
                <View style={S.empty}>
                  <Text style={S.caption}>
                    No other members yet. Ask someone to create an account and
                    verify their email.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <Pressable
                  style={S.contact}
                  onPress={async () => {
                    try {
                      const id = await openChat(user.uid, item.id);
                      setActive(id);
                    } catch (e) {
                      error(e);
                    }
                  }}
                >
                  <Avatar profile={item} />
                  <View style={S.fill}>
                    <Text style={[S.text, { fontWeight: "600" }]}>
                      {item.displayName}
                    </Text>
                    <Text numberOfLines={1} style={[S.small, { marginTop: 6 }]}>
                      {item.bio ||
                        (isOnline(item) ? "Online now" : "Say hello")}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" color={C.muted} size={16} />
                </Pressable>
              )}
            />
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ flexGrow: 1 }}
              ListEmptyComponent={
                <View style={S.empty}>
                  <View
                    style={{
                      backgroundColor: C.soft,
                      borderRadius: 60,
                      padding: 30,
                    }}
                  >
                    <Ionicons
                      name="chatbubbles-outline"
                      size={62}
                      color={C.green}
                    />
                  </View>
                  <Text
                    style={[S.title, { fontSize: 27, textAlign: "center" }]}
                  >
                    A little closer,\nwherever you are.
                  </Text>
                  <Text style={S.caption}>
                    Your conversations will feel right at home here. Find
                    someone you love and say hello.
                  </Text>
                  <Button
                    title="Find your people"
                    onPress={() => setTab("people")}
                  />
                  <View style={[S.row, { gap: 6, marginTop: 15 }]}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={13}
                      color={C.muted}
                    />
                    <Text style={{ fontSize: 10, color: C.muted }}>
                      Private chats · Real-time connection
                    </Text>
                  </View>
                </View>
              }
              renderItem={({ item }) => {
                const p = profiles.find(
                  (p) => item.members.includes(p.id) && p.id !== user.uid,
                );
                return (
                  <Pressable
                    style={S.contact}
                    onPress={() => setActive(item.id)}
                  >
                    <Avatar profile={p} />
                    <View style={S.fill}>
                      <View style={S.between}>
                        <Text
                          style={[S.text, { fontWeight: "600", flex: 1 }]}
                          numberOfLines={1}
                        >
                          {p?.displayName || "Family member"}
                        </Text>
                        <Text style={{ fontSize: 10, color: C.muted }}>
                          {item.updatedAt?.toDate?.().toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          }) || ""}
                        </Text>
                      </View>
                      <Text
                        style={[S.small, { marginTop: 7 }]}
                        numberOfLines={1}
                      >
                        {item.lastMessage || "Start your conversation"}
                      </Text>
                    </View>
                  </Pressable>
                );
              }}
            />
          )}
          <View
            style={[
              S.row,
              {
                borderTopWidth: 1,
                borderColor: C.line,
                backgroundColor: "white",
              },
            ]}
          >
            {(
              [
                {
                  id: "chats",
                  icon: "chatbubble-ellipses-outline",
                  label: "Chats",
                },
                { id: "people", icon: "people-outline", label: "People" },
                { id: "profile", icon: "person-outline", label: "You" },
              ] as const
            ).map((t) => (
              <Pressable key={t.id} style={S.tab} onPress={() => setTab(t.id)}>
                <Ionicons
                  name={t.icon}
                  size={23}
                  color={tab === t.id ? C.green : C.muted}
                />
                <Text
                  style={{
                    fontSize: 10,
                    color: tab === t.id ? C.green : C.muted,
                    fontWeight: tab === t.id ? "600" : "400",
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {callId && client && (
        <CallScreen
          client={client}
          callId={callId}
          uid={user.uid}
          onClose={() => setCallId(null)}
        />
      )}
    </SafeAreaView>
  );
}
export default function App() {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(configured),
    [verified, setVerified] = useState(false);
  useEffect(() => {
    if (!configured) return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setVerified(!!u?.emailVerified);
      setLoading(false);
    });
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {!configured ? (
          <Setup />
        ) : loading ? (
          <SafeAreaView style={S.page}>
            <ActivityIndicator style={S.fill} color={C.green} />
          </SafeAreaView>
        ) : !user ? (
          <AuthScreen />
        ) : !verified ? (
          <Verify user={user} onVerified={() => setVerified(true)} />
        ) : (
          <Home user={user} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
