export type EvidenceState = "valid" | "invalid" | "unknown" | "not-applicable";
export type CredentialStatus = "active" | "suspended" | "revoked" | "expired" | "superseded" | "unknown";
export type PolicyState = "accepted" | "rejected" | "not-evaluated";
export type Provenance = "direct-issuer" | "bvs" | "self-asserted-persistent" | "self-asserted-ephemeral";

export type CredentialRecord = {
  recordId: string;
  title: string;
  issuer: string;
  credentialType: string;
  provenance: Provenance;
  status: CredentialStatus;
  cryptography: EvidenceState;
  issuerIdentity: EvidenceState;
  policy: PolicyState;
  updatedAt: string;
  publicContent: boolean;
  claims: Record<string, string>;
  manifestHash: string;
  contentHash: string;
  schema: string;
  schemaHash: string;
};

export type PrivacyEvent = { id: string; verifier: string; purpose: string; disclosed: string[]; at: string; delivery: "delivered" | "pending" | "failed" };
