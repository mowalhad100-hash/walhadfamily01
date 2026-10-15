import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret, defineString } from "firebase-functions/params";
import { StreamClient } from "@stream-io/node-sdk";
initializeApp();
const db = getFirestore();
const streamSecret = defineSecret("STREAM_SECRET");
const streamKey = defineString("STREAM_API_KEY");
const expoAccess = defineSecret("EXPO_ACCESS_TOKEN");
const stream = () => new StreamClient(streamKey.value(), streamSecret.value());
function uid(r: any) {
  if (!r.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  if (!r.auth.token.email_verified)
    throw new HttpsError("permission-denied", "Verify your email first.");
  return r.auth.uid as string;
}
async function throttle(id: string, kind: string, gap: number) {
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`limits/${id}_${kind}`);
    const s = await tx.get(ref);
    if (s.exists && Date.now() - s.data()!.time < gap)
      throw new HttpsError(
        "resource-exhausted",
        "Please wait before trying again.",
      );
    tx.set(ref, { time: Date.now() });
  });
}
async function push(to: string, title: string, body: string, data: object) {
  const devices = await db.collection(`users/${to}/devices`).get();
  for (let i = 0; i < devices.docs.length; i += 100) {
    const chunk = devices.docs.slice(i, i + 100);
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${expoAccess.value()}`,
      },
      body: JSON.stringify(
        chunk.map((d) => ({
          to: d.data().token,
          title,
          body,
          data,
          sound: "default",
          channelId: "default",
          priority: "high",
          ttl: 120,
        })),
      ),
    });
    if (!response.ok) throw Error(`Expo push failed: ${response.status}`);
    const result: any = await response.json();
    for (const [j, ticket] of (result.data || []).entries()) {
      if (
        ticket.status === "error" &&
        ticket.details?.error === "DeviceNotRegistered"
      )
        await chunk[j].ref.delete();
      if (ticket.id)
        await db
          .collection("pushReceipts")
          .doc(ticket.id)
          .set({ devicePath: chunk[j].ref.path, createdAt: Timestamp.now() });
    }
  }
}
export const messageCreated = onDocumentCreated(
  {
    document: "chats/{chatId}/messages/{messageId}",
    secrets: [expoAccess],
    retry: true,
  },
  async (e) => {
    const m = e.data?.data();
    if (!m) return;
    const ref = db.doc(`chats/${e.params.chatId}`);
    const chat = await ref.get();
    const members = chat.data()?.members as string[] | undefined;
    if (!members) return;
    await db.runTransaction(async (tx) => {
      const current = await tx.get(ref);
      if (
        !current.data()?.updatedAt ||
        current.data()!.updatedAt.toMillis() <= m.createdAt.toMillis()
      )
        tx.update(ref, { lastMessage: m.text, updatedAt: m.createdAt });
    });
    const sender = await db.doc(`users/${m.senderId}`).get();
    await push(
      members.find((x) => x !== m.senderId)!,
      sender.data()?.displayName || "Walhad Family",
      "Sent you a message",
      { kind: "message", chatId: e.params.chatId },
    );
  },
);
export const streamToken = onCall({ secrets: [streamSecret] }, async (r) => {
  const id = uid(r);
  await throttle(id, "token", 3000);
  const user = await db.doc(`users/${id}`).get();
  await stream().upsertUsers([
    {
      id,
      name: user.data()?.displayName || "Family member",
      image: user.data()?.photoURL || undefined,
      role: "user",
    },
  ]);
  return {
    token: stream().generateUserToken({
      user_id: id,
      validity_in_seconds: 3600,
    }),
  };
});
export const createCall = onCall({ secrets: [streamSecret] }, async (r) => {
  const id = uid(r);
  const { calleeId, video } = r.data || {};
  if (
    typeof calleeId !== "string" ||
    calleeId === id ||
    typeof video !== "boolean"
  )
    throw new HttpsError("invalid-argument", "Invalid recipient.");
  await throttle(id, "call", 15000);
  const [caller, target] = await Promise.all([
    db.doc(`users/${id}`).get(),
    db.doc(`users/${calleeId}`).get(),
  ]);
  if (!target.exists) throw new HttpsError("not-found", "User not found.");
  const blocks = await Promise.all([
    db.doc(`users/${id}/blocks/${calleeId}`).get(),
    db.doc(`users/${calleeId}/blocks/${id}`).get(),
  ]);
  if (blocks.some((b) => b.exists))
    throw new HttpsError(
      "permission-denied",
      "Calls are blocked for this conversation.",
    );
  const chatId = [id, calleeId].sort().join("_");
  if (!(await db.doc(`chats/${chatId}`).get()).exists)
    throw new HttpsError(
      "failed-precondition",
      "Open a private conversation first.",
    );
  const call = db.collection("calls").doc();
  const client = stream();
  await client.upsertUsers([
    { id, name: caller.data()?.displayName || "Family member" },
    { id: calleeId, name: target.data()?.displayName || "Family member" },
  ]);
  await client.video.call("default", call.id).getOrCreate({
    data: {
      created_by_id: id,
      members: [{ user_id: id }, { user_id: calleeId }],
      settings_override: {
        video: { enabled: video },
        limits: { max_participants: 2 },
      },
    },
  });
  await call.set({
    members: [id, calleeId],
    callerId: id,
    calleeId,
    callerName: caller.data()?.displayName || "Family member",
    video,
    status: "ringing",
    createdAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 60000),
  });
  return { callId: call.id };
});
export const callCreated = onDocumentCreated(
  { document: "calls/{callId}", secrets: [expoAccess], retry: true },
  async (e) => {
    // A delayed/retried event must not ring a call that was already answered or ended.
    const current = await e.data?.ref.get();
    const call = current?.data();
    if (
      !call ||
      call.status !== "ringing" ||
      call.expiresAt.toMillis() < Date.now()
    )
      return;
    await push(
      call.calleeId,
      call.callerName || "Walhad Family",
      `Incoming ${call.video ? "video" : "audio"} call`,
      { kind: "call", callId: e.params.callId },
    );
  },
);
export const changeCall = onCall({ secrets: [streamSecret] }, async (r) => {
  const id = uid(r);
  const { callId, action } = r.data || {};
  if (
    typeof callId !== "string" ||
    !/^[a-zA-Z0-9]{20}$/.test(callId) ||
    !["accept", "decline", "end"].includes(action)
  )
    throw new HttpsError("invalid-argument", "Invalid call action.");
  const ref = db.doc(`calls/${callId}`);
  await db.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    const d = s.data();
    if (!d?.members.includes(id))
      throw new HttpsError("permission-denied", "Not a participant.");
    if (action === "accept" || action === "decline") {
      if (
        d.calleeId !== id ||
        d.status !== "ringing" ||
        d.expiresAt.toMillis() < Date.now()
      )
        throw new HttpsError(
          "failed-precondition",
          "Call is no longer ringing.",
        );
    }
    tx.update(ref, {
      status:
        action === "accept"
          ? "accepted"
          : action === "decline"
            ? "declined"
            : "ended",
      updatedAt: Timestamp.now(),
    });
  });
  if (action !== "accept") await stream().video.call("default", callId).end();
  return { ok: true };
});
export const removePushDevices = onCall(async (r) => {
  if (!r.auth) throw new HttpsError("unauthenticated", "Sign in.");
  const token = r.data?.token;
  if (typeof token !== "string" || token.length > 300)
    throw new HttpsError("invalid-argument", "Invalid device token.");
  await db
    .doc(`users/${r.auth.uid}/devices/${encodeURIComponent(token)}`)
    .delete();
  return { ok: true };
});
export const deleteAccount = onCall(
  { secrets: [streamSecret], timeoutSeconds: 540 },
  async (r) => {
    const id = uid(r);
    if (Date.now() / 1000 - (r.auth!.token.auth_time || 0) > 300)
      throw new HttpsError(
        "failed-precondition",
        "Sign out and sign in again before deleting your account.",
      );
    const calls = await db
      .collection("calls")
      .where("members", "array-contains", id)
      .get();
    for (const call of calls.docs) {
      await stream()
        .video.call("default", call.id)
        .end()
        .catch(() => {});
      await call.ref.delete();
    }
    const chats = await db
      .collection("chats")
      .where("members", "array-contains", id)
      .get();
    for (const chat of chats.docs) await db.recursiveDelete(chat.ref);
    await getStorage()
      .bucket()
      .deleteFiles({ prefix: `avatars/${id}/` });
    await db.recursiveDelete(db.doc(`users/${id}`));
    await stream().deleteUsers({
      user_ids: [id],
      user: "hard",
      messages: "hard",
      conversations: "hard",
    });
    await getAuth().deleteUser(id);
    return { ok: true };
  },
);
export const maintenance = onSchedule(
  { schedule: "every 5 minutes", secrets: [streamSecret, expoAccess] },
  async () => {
    const stale = await db
      .collection("calls")
      .where("status", "==", "ringing")
      .where("expiresAt", "<", Timestamp.now())
      .get();
    for (const c of stale.docs) {
      await c.ref.update({ status: "missed" });
      await stream().video.call("default", c.id).end().catch(console.error);
    }
    const receipts = await db
      .collection("pushReceipts")
      .where("createdAt", "<", Timestamp.fromMillis(Date.now() - 15 * 60000))
      .limit(300)
      .get();
    if (receipts.empty) return;
    const res = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${expoAccess.value()}`,
      },
      body: JSON.stringify({ ids: receipts.docs.map((d) => d.id) }),
    });
    if (!res.ok) throw Error("Push receipt lookup failed");
    const result: any = await res.json();
    for (const d of receipts.docs) {
      const receipt = result.data?.[d.id];
      if (!receipt) {
        if (d.data().createdAt.toMillis() < Date.now() - 86400000)
          await d.ref.delete();
        continue;
      }
      if (receipt.details?.error === "DeviceNotRegistered")
        await db.doc(d.data().devicePath).delete();
      if (receipt.status === "error")
        console.error("Push receipt error", receipt);
      await d.ref.delete();
    }
  },
);
export const blockUser = onCall(async (r) => {
  const id = uid(r);
  const { targetId, blocked } = r.data || {};
  if (
    typeof targetId !== "string" ||
    targetId === id ||
    typeof blocked !== "boolean"
  )
    throw new HttpsError("invalid-argument", "Invalid user.");
  const target = await db.doc(`users/${targetId}`).get();
  if (!target.exists) throw new HttpsError("not-found", "User not found.");
  const ref = db.doc(`users/${id}/blocks/${targetId}`);
  if (blocked) await ref.set({ createdAt: Timestamp.now() });
  else await ref.delete();
  return { ok: true };
});
export const reportUser = onCall(async (r) => {
  const id = uid(r);
  const { targetId, reason } = r.data || {};
  if (
    typeof targetId !== "string" ||
    targetId === id ||
    typeof reason !== "string" ||
    reason.length < 5 ||
    reason.length > 1000
  )
    throw new HttpsError(
      "invalid-argument",
      "Enter a reason between 5 and 1000 characters.",
    );
  await throttle(id, "report", 60000);
  await db.collection("reports").add({
    reporterId: id,
    targetId,
    reason,
    createdAt: Timestamp.now(),
    status: "open",
  });
  return { ok: true };
});
