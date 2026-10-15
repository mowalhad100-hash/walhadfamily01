import { test, before, after } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-walhad",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    for (const uid of ["alice", "bob", "eve"])
      await setDoc(doc(db, "users", uid), {
        displayName: uid,
        photoURL: "",
        bio: "",
        online: false,
        lastSeen: new Date(),
      });
    await setDoc(doc(db, "chats/alice_bob"), { members: ["alice", "bob"] });
  });
});
after(async () => {
  await env?.cleanup();
});
const db = (id) =>
  env.authenticatedContext(id, { email_verified: true }).firestore();
test("unauthenticated and unverified users cannot discover profiles", async () => {
  await assertFails(
    getDoc(doc(env.unauthenticatedContext().firestore(), "users/alice")),
  );
  await assertFails(
    getDoc(
      doc(
        env.authenticatedContext("eve", { email_verified: false }).firestore(),
        "users/alice",
      ),
    ),
  );
});
test("participant can send text, outsider cannot read or send", async () => {
  await assertSucceeds(
    setDoc(doc(db("alice"), "chats/alice_bob/messages/ok"), {
      senderId: "alice",
      text: "Hello Bob",
      createdAt: serverTimestamp(),
    }),
  );
  await assertFails(getDoc(doc(db("eve"), "chats/alice_bob/messages/ok")));
  await assertFails(
    setDoc(doc(db("eve"), "chats/alice_bob/messages/no"), {
      senderId: "eve",
      text: "Intrusion",
      createdAt: serverTimestamp(),
    }),
  );
});
test("sender impersonation and oversized messages fail", async () => {
  await assertFails(
    setDoc(doc(db("alice"), "chats/alice_bob/messages/forged"), {
      senderId: "bob",
      text: "Forged",
      createdAt: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(db("alice"), "chats/alice_bob/messages/huge"), {
      senderId: "alice",
      text: "x".repeat(4001),
      createdAt: serverTimestamp(),
    }),
  );
});
test("members cannot change participants or write call status", async () => {
  await assertFails(
    setDoc(doc(db("alice"), "chats/alice_bob"), { members: ["alice", "eve"] }),
  );
  await assertFails(
    setDoc(doc(db("alice"), "calls/fake"), {
      members: ["alice", "bob"],
      status: "accepted",
    }),
  );
});
test("owner can save profile and only owner may modify it", async () => {
  await assertSucceeds(
    setDoc(doc(db("alice"), "users/alice"), {
      displayName: "Alice",
      photoURL: "",
      bio: "Family first",
      online: true,
      lastSeen: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(db("eve"), "users/alice"), {
      displayName: "Hacked",
      photoURL: "",
      bio: "",
      online: true,
      lastSeen: serverTimestamp(),
    }),
  );
});
test("chat creation requires canonical ID, distinct existing members", async () => {
  await assertSucceeds(
    setDoc(doc(db("alice"), "chats/alice_eve"), { members: ["alice", "eve"] }),
  );
  await assertFails(
    setDoc(doc(db("alice"), "chats/arbitrary"), { members: ["alice", "eve"] }),
  );
  await assertFails(
    setDoc(doc(db("alice"), "chats/alice_alice"), {
      members: ["alice", "alice"],
    }),
  );
});
test("blocking prevents messages in both directions", async () => {
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "users/bob/blocks/alice"), {
      createdAt: new Date(),
    });
  });
  for (const id of ["alice", "bob"])
    await assertFails(
      setDoc(doc(db(id), `chats/alice_bob/messages/blocked_${id}`), {
        senderId: id,
        text: "Blocked",
        createdAt: serverTimestamp(),
      }),
    );
});
test("device tokens are private and cannot be registered for another user", async () => {
  await assertSucceeds(
    setDoc(doc(db("alice"), "users/alice/devices/phone"), {
      token: "ExpoPushToken[test]",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(getDoc(doc(db("eve"), "users/alice/devices/phone")));
  await assertFails(
    setDoc(doc(db("eve"), "users/alice/devices/other"), {
      token: "ExpoPushToken[test]",
      updatedAt: serverTimestamp(),
    }),
  );
});
test("message schema rejects extra fields and empty bodies", async () => {
  await assertFails(
    setDoc(doc(db("alice"), "chats/alice_eve/messages/empty"), {
      senderId: "alice",
      text: "",
      createdAt: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(db("alice"), "chats/alice_eve/messages/extra"), {
      senderId: "alice",
      text: "Hi",
      role: "admin",
      createdAt: serverTimestamp(),
    }),
  );
});
test("two authenticated clients receive a real Firestore live message event", async () => {
  const { onSnapshot } = await import("firebase/firestore");
  const path = `chats/alice_eve/messages/live_${Date.now()}`;
  const receiver = doc(db("eve"), path);
  const sender = doc(db("alice"), path);
  let unsubscribe = () => {};
  let timer;
  let sent = false;
  const received = new Promise((resolve, reject) => {
    timer = setTimeout(
      () =>
        reject(Error("Timed out waiting for server-backed real-time event")),
      20000,
    );
    unsubscribe = onSnapshot(
      receiver,
      { includeMetadataChanges: true },
      (snapshot) => {
        // Establish the receiver's server-backed subscription before issuing a write.
        // This avoids racing emulator watch-target initialization against commit.
        if (snapshot.metadata.fromCache) return;
        if (!sent) {
          sent = true;
          void setDoc(sender, {
            senderId: "alice",
            text: "Live hello",
            createdAt: serverTimestamp(),
          }).catch(reject);
        }
        if (
          snapshot.exists() &&
          snapshot.data().text === "Live hello" &&
          snapshot.data().createdAt
        )
          resolve(snapshot.data());
      },
      reject,
    );
  });
  try {
    const message = await received;
    if (message.senderId !== "alice") throw Error("Unexpected sender");
  } finally {
    clearTimeout(timer);
    unsubscribe();
  }
});
test("conversation list query is restricted to membership", async () => {
  const { query, collection, where, getDocs } = await import(
    "firebase/firestore"
  );
  await assertSucceeds(
    getDocs(
      query(
        collection(db("alice"), "chats"),
        where("members", "array-contains", "alice"),
      ),
    ),
  );
  await assertFails(getDocs(collection(db("eve"), "chats")));
});
