import test from "node:test";
import assert from "node:assert/strict";
import { evaluateCredentialStatus } from "../../src/core/status.mjs";
import { deriveAuthority } from "../../src/core/authority.mjs";

const holder = deriveAuthority(new Uint8Array(32));
const content = (state = "active", effectiveAt = "2026-07-20T12:00:00Z") => ({ "@type": "hiri:passport:CredentialClaim", schema: "https://e.test/s", schemaHash: `sha256:${"0".repeat(64)}`, credentialType: "T", subjectHolderAuthority: holder, claims: {}, issuanceDate: "2026-07-20T12:00:00Z", status: { state, effectiveAt } });
const evidence = (chain) => ({ result: "valid", issuerAuthoritative: true, retrievedAt: "2026-07-20T12:01:00Z", source: "issuer-resolver", signature: "valid", hashes: "valid", chainResult: "valid", keyState: "valid", headManifestHash: chain.at(-1).manifestHash, chain });

test("active requires fresh issuer-authoritative current-head evidence", async () => {
  const chain = [{ version: "0", manifestHash: "h0", content: content() }];
  assert.equal((await evaluateCredentialStatus({ presented: { manifestHash: "h0" }, currentHeadEvidence: evidence(chain), evaluationTime: "2026-07-20T12:02:00Z", policy: { maximumStatusAgeSeconds: 120 } })).status, "active");
  const untrusted = evidence(chain); untrusted.issuerAuthoritative = false;
  assert.equal((await evaluateCredentialStatus({ presented: { manifestHash: "h0" }, currentHeadEvidence: untrusted, evaluationTime: "2026-07-20T12:02:00Z", policy: { maximumStatusAgeSeconds: 120 } })).status, "unknown");
});

test("revocation wins and ancestors are superseded", async () => {
  const chain = [{ version: "0", manifestHash: "h0", content: content() }, { version: "1", manifestHash: "h1", content: content("revoked", "2026-07-20T12:02:00Z") }];
  const result = await evaluateCredentialStatus({ presented: { manifestHash: "h0" }, currentHeadEvidence: evidence(chain), evaluationTime: "2026-07-20T12:03:00Z", policy: { maximumStatusAgeSeconds: 300 } });
  assert.equal(result.status, "revoked");
});
