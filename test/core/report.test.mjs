import test from "node:test";
import assert from "node:assert/strict";
import { buildVerificationReport, deriveCryptographicDisposition } from "../../src/core/report.mjs";

test("report preserves exact parameters and evidence dimensions", () => {
  const report = buildVerificationReport({ verifiedAt: "2026-07-20T00:00:00Z", parameters: { messageClockSkewSeconds: 30, credentialIssuanceToleranceSeconds: 5 }, request: { result: "valid" }, holder: { result: "valid" }, credentials: [{ result: "valid", issuerIdentity: "unknown", status: "unknown" }], policy: { result: "accepted" } });
  assert.equal(report.cryptographicDisposition, "valid"); assert.equal(report.credentials[0].issuerIdentity, "unknown"); assert.equal(report.verificationParameters.messageClockSkewSeconds, 30);
});
test("policy never promotes cryptographic unknown", () => {
  const report = { request: { result: "valid" }, holder: { result: "unknown" }, credentials: [], selfAssertions: [], policy: { result: "accepted" } };
  assert.equal(deriveCryptographicDisposition(report), "unknown"); report.holder.result = "invalid"; assert.equal(deriveCryptographicDisposition(report), "invalid");
});
