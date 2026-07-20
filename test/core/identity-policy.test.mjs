import test from "node:test";
import assert from "node:assert/strict";
import { evaluateIssuerIdentity, evaluatePolicy } from "../../src/core/identity-policy.mjs";
import { deriveAuthority } from "../../src/core/authority.mjs";

const issuer = deriveAuthority(new Uint8Array(32));
test("issuer identity is separate and absent anchors are unknown", () => {
  assert.equal(evaluateIssuerIdentity(issuer, [], "2026-07-20T00:00:00Z").result, "unknown");
  const result = evaluateIssuerIdentity(issuer, [{ authority: issuer, type: "registry", source: "pin", capturedAt: "2026-07-01T00:00:00Z", result: "valid" }], "2026-07-20T00:00:00Z"); assert.equal(result.result, "valid"); assert.equal(result.anchors[0].source, "pin");
});
test("policy decisions identify their version and evidence reasons", () => {
  const evidence = { holder: { result: "valid" } }; const result = evaluatePolicy(evidence, { id: "low-risk", version: "1", evaluate: () => ({ result: "accepted", reasons: [{ evidencePaths: ["/holder/result"] }] }) });
  assert.equal(result.result, "accepted"); assert.equal(evidence.holder.result, "valid");
});
