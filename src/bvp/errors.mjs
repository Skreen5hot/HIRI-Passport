const rows = [
  ["BVP_MESSAGE_MALFORMED", "invalid"], ["BVP_UNSUPPORTED_PROTOCOL", "invalid"], ["BVP_UNKNOWN_MEMBER", "invalid"], ["BVP_ID_INVALID", "invalid"], ["BVP_NONCE_INVALID", "invalid"], ["BVP_RESOURCE_LIMIT", "invalid"], ["BVP_MESSAGE_EXPIRED", "invalid"], ["BVP_MESSAGE_NOT_YET_VALID", "invalid"], ["BVP_LIFETIME_EXCEEDED", "invalid"], ["BVP_SIGNATURE_INVALID", "invalid"], ["BVP_METHOD_UNAUTHORIZED", "invalid"], ["BVP_CHALLENGE_MISMATCH", "invalid"], ["BVP_INTENT_UNAUTHORIZED", "invalid"], ["BVP_REPLAY", "invalid"], ["BVP_SOURCE_EVIDENCE_INVALID", "issuance-prohibited"], ["BVP_SOURCE_EVIDENCE_UNKNOWN", "issuance-prohibited"], ["BVP_PROFILE_HASH_MISMATCH", "invalid"], ["BVP_PROFILE_UNAVAILABLE", "unknown"], ["BVP_EVIDENCE_INCONSISTENT", "invalid"], ["BVP_UNTRUSTED_ISSUER", "untrusted"], ["BVP_PUBLICATION_NOT_AUTHORIZED", "issuance-prohibited"]
];

export const BVP_ERROR_REGISTRY = Object.freeze(Object.fromEntries(rows.map(([code, transition]) => [code, Object.freeze({ code, transition })])));

export function bvpError(code, path = "", details = {}) {
  if (!Object.hasOwn(BVP_ERROR_REGISTRY, code) && !/^[a-z0-9][a-z0-9.-]*:[A-Z0-9_]+$/u.test(code)) throw new TypeError(`unknown BVP error: ${code}`);
  const safe = {}; for (const key of ["phase", "intentId", "presentationItemId"]) if (typeof details[key] === "string" && details[key].length <= 128) safe[key] = details[key];
  return Object.freeze({ code, path, ...safe });
}

export function applyBvpTransition(input, error) {
  const result = structuredClone(input ?? {}); result.errors = [...(result.errors ?? []), error];
  const transition = BVP_ERROR_REGISTRY[error.code]?.transition;
  if (transition === "untrusted") result.issuerTrust = "untrusted";
  else if (transition === "issuance-prohibited") { result.issuance = "prohibited"; if (error.code.endsWith("UNKNOWN")) result.sourceEvidence = "unknown"; else result.sourceEvidence = "invalid"; }
  else if (transition === "unknown") result.evidenceProfile = "unknown";
  else result.result = "invalid";
  return result;
}
