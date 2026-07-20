import type { CredentialRecord, PrivacyEvent } from "../types";

const hash = (char: string) => `sha256:${char.repeat(64)}`;

export const DEMO_CREDENTIALS: CredentialRecord[] = [
  {
    recordId: "local-license-01",
    title: "Professional Engineer",
    issuer: "New York Licensing Board (synthetic)",
    credentialType: "ProfessionalLicenseCredential",
    provenance: "direct-issuer",
    status: "active",
    cryptography: "valid",
    issuerIdentity: "valid",
    policy: "not-evaluated",
    updatedAt: "2026-07-20T12:02:00Z",
    publicContent: true,
    claims: { "License number": "SYN-PE-123456", Jurisdiction: "US-NY", Discipline: "Civil" },
    manifestHash: hash("a"), contentHash: hash("b"), schema: "https://synthetic.invalid/schemas/license/v1", schemaHash: hash("c")
  },
  {
    recordId: "local-membership-02",
    title: "Open Source Maintainer",
    issuer: "Example Verification Service (synthetic)",
    credentialType: "PublicRoleCredential",
    provenance: "bvs",
    status: "unknown",
    cryptography: "valid",
    issuerIdentity: "unknown",
    policy: "not-evaluated",
    updatedAt: "2026-07-18T09:10:00Z",
    publicContent: true,
    claims: { Project: "Example Commons", Role: "Maintainer" },
    manifestHash: hash("d"), contentHash: hash("e"), schema: "https://synthetic.invalid/schemas/public-role/v1", schemaHash: hash("f")
  },
  {
    recordId: "local-note-03",
    title: "Preferred name",
    issuer: "You",
    credentialType: "PreferredNameAssertion",
    provenance: "self-asserted-persistent",
    status: "unknown",
    cryptography: "valid",
    issuerIdentity: "not-applicable",
    policy: "not-evaluated",
    updatedAt: "2026-07-15T16:20:00Z",
    publicContent: false,
    claims: { "Preferred name": "Alex" },
    manifestHash: hash("1"), contentHash: hash("2"), schema: "https://synthetic.invalid/schemas/name/v1", schemaHash: hash("3")
  }
];

export const DEMO_HISTORY: PrivacyEvent[] = [{ id: "history-1", verifier: "Example permit portal (synthetic)", purpose: "Confirm an active engineering license", disclosed: ["Professional Engineer"], at: "2026-07-20T14:11:00Z", delivery: "delivered" }];

export const DEMO_REQUEST = JSON.stringify({
  protocol: "hiri-passport/2.0", type: "DisclosureRequest", requestId: "ABEiM0RVZneImaq7zN3u_w",
  verifier: { authority: "key:ed25519:zSyntheticVerifier", display: { name: "Example Permit Portal", domain: "permit.synthetic.invalid" } },
  credentialRequests: [{ requestItemId: "EBESExQVFhcYGRobHB0eHw", credentialType: "ProfessionalLicenseCredential", required: true, purpose: "Confirm an active engineering license", acceptedDisclosureModes: ["public"], fields: [{ path: "/claims/licenseNumber", required: true, purpose: "Match the public registration" }] }],
  selfAssertionRequests: [], nonce: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8", createdAt: "2026-07-20T12:00:00Z", expiresAt: "2026-07-20T12:10:00Z"
}, null, 2);
