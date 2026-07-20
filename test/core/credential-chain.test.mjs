import test from "node:test";
import assert from "node:assert/strict";
import { deriveAuthority } from "../../src/core/authority.mjs";
import { deriveIssuerState, validateCredentialVersion } from "../../src/core/credential-chain.mjs";

// Core §8.3
const holder = deriveAuthority(new Uint8Array(32));
function content(state, effectiveAt) {
  return { "@type": "hiri:passport:CredentialClaim", schema: "https://example.test/s", schemaHash: "sha256:" + "0".repeat(64), credentialType: "License", subjectHolderAuthority: holder, claims: {}, issuanceDate: "2026-01-01T00:00:00Z", status: { state, effectiveAt } };
}

test("effective status uses time then version ordering", () => {
  const chain = [{ version: "1", content: content("active", "2026-01-01T00:00:00Z") }, { version: "2", content: content("suspended", "2026-06-01T00:00:00Z") }];
  assert.equal(deriveIssuerState(chain, "2026-07-20T00:00:00Z").issuerState, "suspended");
});

test("terminal states cannot be restored", () => {
  assert.equal(validateCredentialVersion(content("revoked", "2026-02-01T00:00:00Z"), content("active", "2026-03-01T00:00:00Z")).error, "STATUS_TRANSITION_INVALID");
});
