import test from "node:test";
import assert from "node:assert/strict";
import { deriveAuthority } from "../../src/core/authority.mjs";
import { validateCredentialClaim, preparePublicCredentialIssuance } from "../../src/core/credential.mjs";

// Core §8, Core §8.1, Core §8.2
const holder = deriveAuthority(new Uint8Array(32));
const issuer = deriveAuthority(new Uint8Array(32).fill(1));
const claim = {
  "@type": "hiri:passport:CredentialClaim",
  schema: "https://example.test/license-schema",
  schemaHash: "sha256:" + "0".repeat(64),
  credentialType: "ProfessionalLicenseCredential",
  subjectHolderAuthority: holder,
  claims: { licenseNumber: "PE-1" },
  issuanceDate: "2026-07-20T00:00:00Z",
  status: { state: "active", effectiveAt: "2026-07-20T00:00:00Z" }
};

test("Credential Claim shape and future issuance are enforced", () => {
  assert.equal(validateCredentialClaim(claim).result, "valid");
  assert.equal(validateCredentialClaim(claim, { evaluationTime: "2026-07-19T00:00:00Z" }).error, "CREDENTIAL_NOT_YET_VALID");
  assert.equal(validateCredentialClaim({ ...claim, subjectHolderAuthority: "bad" }).result, "invalid");
});

test("public issuance requires explicit authorization and random URI", async () => {
  assert.equal((await preparePublicCredentialIssuance({ issuerAuthority: issuer, content: claim, publicPublicationAuthorized: false }, {})).result, "prohibited");
  const prepared = await preparePublicCredentialIssuance({ issuerAuthority: issuer, content: claim, publicPublicationAuthorized: true }, { randomBytes: async () => new Uint8Array(16) });
  assert.match(prepared.uri, /\/data\/credential-/);
  assert.equal(prepared.result, "prepared");
});
