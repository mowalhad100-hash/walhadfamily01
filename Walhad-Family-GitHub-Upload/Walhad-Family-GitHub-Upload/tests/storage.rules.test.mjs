import { test, before, after } from "node:test";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { ref, uploadBytes, getBytes, deleteObject } from "firebase/storage";
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-walhad",
    storage: { rules: readFileSync("storage.rules", "utf8") },
  });
});
after(async () => {
  await env?.cleanup();
});
const store = (uid, verified = true) =>
  env.authenticatedContext(uid, { email_verified: verified }).storage();
const jpeg = new Uint8Array([255, 216, 255, 217]);
test("verified owner can upload and delete their avatar", async () => {
  const file = ref(store("alice"), "avatars/alice/profile");
  await assertSucceeds(uploadBytes(file, jpeg, { contentType: "image/jpeg" }));
  await assertSucceeds(deleteObject(file));
});
test("another user cannot change an avatar", async () => {
  await assertFails(
    uploadBytes(ref(store("eve"), "avatars/alice/profile"), jpeg, {
      contentType: "image/jpeg",
    }),
  );
});
test("unverified and anonymous uploads are denied", async () => {
  await assertFails(
    uploadBytes(ref(store("alice", false), "avatars/alice/profile"), jpeg, {
      contentType: "image/jpeg",
    }),
  );
  await assertFails(
    uploadBytes(
      ref(env.unauthenticatedContext().storage(), "avatars/alice/profile"),
      jpeg,
      { contentType: "image/jpeg" },
    ),
  );
});
test("non-image uploads and files at least 5 MB are denied", async () => {
  await assertFails(
    uploadBytes(ref(store("alice"), "avatars/alice/script"), jpeg, {
      contentType: "text/html",
    }),
  );
  await assertFails(
    uploadBytes(
      ref(store("alice"), "avatars/alice/huge"),
      new Uint8Array(5 * 1024 * 1024),
      { contentType: "image/jpeg" },
    ),
  );
});
test("only verified users can read profile photos through the Storage SDK", async () => {
  await env.withSecurityRulesDisabled(async (c) => {
    await uploadBytes(ref(c.storage(), "avatars/bob/profile"), jpeg, {
      contentType: "image/jpeg",
    });
  });
  await assertSucceeds(getBytes(ref(store("alice"), "avatars/bob/profile")));
  await assertFails(
    getBytes(
      ref(env.unauthenticatedContext().storage(), "avatars/bob/profile"),
    ),
  );
  await assertFails(getBytes(ref(store("eve", false), "avatars/bob/profile")));
});
