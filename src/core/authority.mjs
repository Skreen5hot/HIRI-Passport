import {
  decodeBase58Btc,
  encodeBase58Btc,
  methodAuthority,
  parseEd25519Authority,
  parseUtcSeconds,
  parseVerificationMethod
} from "./scalars.mjs";

export function deriveAuthority(publicKey) {
  if (!(publicKey instanceof Uint8Array) || publicKey.length !== 32) {
    throw new TypeError("Ed25519 public key must be exactly 32 bytes");
  }
  return `key:ed25519:${encodeBase58Btc(publicKey)}`;
}

export function validateAuthority(value) {
  parseEd25519Authority(value);
  return Object.freeze({ authority: value, genesisPublicKey: decodeBase58Btc(value.slice("key:ed25519:".length), 32) });
}

function time(value) {
  return typeof value === "number" ? value : parseUtcSeconds(value);
}

export function verifyMethodAuthorization({ authority, method, at, lifecycleEvidence }) {
  try {
    validateAuthority(authority);
    parseVerificationMethod(method);
  } catch (error) {
    return { result: "invalid", methodAuthorization: "invalid", keyState: "invalid", reason: error.message };
  }
  if (methodAuthority(method) !== authority) {
    return { result: "invalid", methodAuthorization: "invalid", keyState: "invalid", reason: "method authority mismatch" };
  }
  if (!lifecycleEvidence || lifecycleEvidence.result === "unknown") {
    return { result: "unknown", methodAuthorization: "unknown", keyState: "unknown" };
  }
  if (lifecycleEvidence.result !== "valid" || lifecycleEvidence.authority !== authority) {
    return { result: "invalid", methodAuthorization: "invalid", keyState: "invalid" };
  }
  if (lifecycleEvidence.genesisPublicKey) {
    try {
      if (deriveAuthority(lifecycleEvidence.genesisPublicKey) !== authority) {
        return { result: "invalid", methodAuthorization: "invalid", keyState: "invalid", reason: "genesis derivation mismatch" };
      }
    } catch {
      return { result: "invalid", methodAuthorization: "invalid", keyState: "invalid", reason: "invalid genesis key" };
    }
  }
  const evaluationTime = time(at);
  const record = (lifecycleEvidence.methods ?? []).find((candidate) => candidate.id === method);
  if (!record) return { result: "invalid", methodAuthorization: "invalid", keyState: "invalid", reason: "method not authorized" };
  const authorizedFrom = record.authorizedFrom == null ? Number.NEGATIVE_INFINITY : time(record.authorizedFrom);
  const revokedAt = record.revokedAt == null ? Number.POSITIVE_INFINITY : time(record.revokedAt);
  if (evaluationTime < authorizedFrom || evaluationTime >= revokedAt) {
    return { result: "invalid", methodAuthorization: "invalid", keyState: "invalid", reason: "method inactive at verification time" };
  }
  for (const boundary of [lifecycleEvidence.compromisedAt, lifecycleEvidence.manifestsInvalidAfter]) {
    if (boundary != null && evaluationTime >= time(boundary)) {
      return { result: "invalid", methodAuthorization: "valid", keyState: "invalid", reason: "lifecycle invalidation applies" };
    }
  }
  return { result: "valid", methodAuthorization: "valid", keyState: "valid", authority, method };
}

export function evaluateKeyState(input) {
  return verifyMethodAuthorization(input).keyState;
}

export function verifyRoutineRotation({ authority, successorAuthority, previousSignatureValid, successorSignatureValid }) {
  validateAuthority(authority);
  validateAuthority(successorAuthority);
  if (authority !== successorAuthority) return { result: "invalid", reason: "routine rotation changed authority" };
  if (previousSignatureValid !== true || successorSignatureValid !== true) return { result: "invalid", reason: "dual-signature rotation required" };
  return { result: "valid", authority };
}
