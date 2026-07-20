export const PASSPORT_PROTOCOL = "hiri-passport/2.0";
export const DISCLOSURE_REQUEST_TYPE = "DisclosureRequest";
export const PASSPORT_PRESENTATION_TYPE = "PassportPresentation";
export const PRESENTATION_PACKAGE_TYPE = "PassportPresentationPackage";
export const VERIFICATION_REPORT_TYPE = "PassportVerificationReport";

export const PROOF_TYPE = "Ed25519Signature2020";
export const CANONICALIZATION = "JCS";
export const PROOF_PURPOSE_AUTHENTICATION = "authentication";
export const PROOF_PURPOSE_ASSERTION = "assertionMethod";

export const EVIDENCE_RESULTS = Object.freeze(["valid", "invalid", "unknown", "not-applicable"]);
export const CREDENTIAL_STATES = Object.freeze(["active", "suspended", "revoked", "superseded"]);
export const STATUS_RESULTS = Object.freeze(["active", "suspended", "revoked", "superseded", "expired", "unknown"]);
export const POLICY_RESULTS = Object.freeze(["accepted", "rejected", "not-evaluated"]);
export const PROVENANCE = Object.freeze([
  "direct-issuer",
  "bvs",
  "self-asserted-persistent",
  "self-asserted-ephemeral"
]);

export const REQUEST_SIGNATURE_DOMAIN = "HIRI-PASSPORT-DISCLOSURE-REQUEST-V2";
export const PRESENTATION_SIGNATURE_DOMAIN = "HIRI-PASSPORT-PRESENTATION-V2";

export const CORE_LIMITS = Object.freeze({
  maxMessageClockSkewSeconds: 120,
  defaultCredentialIssuanceToleranceSeconds: 0,
  maxCredentialIssuanceToleranceSeconds: 300,
  maxRequestLifetimeSeconds: 15 * 60,
  maxPresentationLifetimeSeconds: 5 * 60,
  maxRequestItems: 64,
  maxFieldsPerCredentialRequest: 64,
  maxRecipients: 64,
  maxPackageBytes: 10 * 1024 * 1024,
  maxArtifacts: 128,
  maxJsonDepth: 64,
  maxStringLength: 1024 * 1024,
  maxChainDepth: 1024
});
