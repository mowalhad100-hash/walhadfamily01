import { test } from "node:test";
import assert from "node:assert/strict";
import { chatId, initials, isOnline, validMessage } from "../src/model.mjs";
test("conversation ID is deterministic for either participant", () => {
  assert.equal(chatId("alice", "bob"), chatId("bob", "alice"));
  assert.notEqual(chatId("alice", "bob"), chatId("alice", "charlie"));
});
test("profile initials handle empty and multiword names", () => {
  assert.equal(initials("Walhad Family"), "WF");
  assert.equal(initials("  Aisha  Walhad  "), "AW");
  assert.equal(initials(""), " ?".trim());
});
test("online heartbeat expires and explicit offline wins", () => {
  const now = 1000000;
  assert.equal(
    isOnline({ online: true, lastSeen: { toMillis: () => now - 10000 } }, now),
    true,
  );
  assert.equal(
    isOnline({ online: true, lastSeen: { toMillis: () => now - 100001 } }, now),
    false,
  );
  assert.equal(
    isOnline({ online: false, lastSeen: { toMillis: () => now } }, now),
    false,
  );
});
test("empty and oversized messages are rejected", () => {
  assert.equal(validMessage("  "), false);
  assert.equal(validMessage("hi"), true);
  assert.equal(validMessage("x".repeat(4000)), true);
  assert.equal(validMessage("x".repeat(4001)), false);
});
