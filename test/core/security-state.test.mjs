import test from "node:test";
import assert from "node:assert/strict";
import { createAuthenticatedHeadCache, createPortfolioBackup, createReplayStore, redactForLog } from "../../src/core/security-state.mjs";

test("replay state retains tuples and authenticated cache rejects rollback", () => {
  let now = 1000; const replay = createReplayStore(new Map(), () => now); replay.put("tuple", 2000); assert.equal(replay.has("tuple"), true); assert.throws(() => replay.put("tuple", 2000), /replay/); now = 3000; assert.equal(replay.has("tuple"), false);
  const cache = createAuthenticatedHeadCache(); cache.put("u", { authenticated: true, version: 2 }); assert.throws(() => cache.put("u", { authenticated: true, version: 1 }), /rollback/);
});
test("logs redact secrets and backups retain encrypted evidence", () => {
  assert.deepEqual(redactForLog({ signingKey: "x", nested: { sourceToken: "y", safe: 1 } }), { signingKey: "[REDACTED]", nested: { sourceToken: "[REDACTED]", safe: 1 } });
  const backup = createPortfolioBackup({ manifest: { id: 1 }, ciphertext: Uint8Array.of(1), recipients: [{}], warningAccepted: true }); assert.equal(backup.ciphertext[0], 1); assert.match(backup.warning, /cannot retract/);
});
