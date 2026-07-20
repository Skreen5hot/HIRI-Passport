import { jcsBytes } from "../core/canonical.mjs";
import { verifyMethodAuthorization } from "../core/authority.mjs";
import { signDomainSeparated, verifyDomainSeparated } from "../core/proof.mjs";
import { assertClosedObject, parseRandomId, parseNonce, parseUtcSeconds, parseVerificationMethod, unicodeScalarLength } from "../core/scalars.mjs";

const PROOF = ["type", "canonicalization", "created", "verificationMethod", "proofPurpose", "proofValue"];

export function validateBvpEnvelope(message, type, now, skew = 0) {
  if (!Number.isInteger(skew) || skew < 0 || skew > 120) throw new RangeError("messageClockSkew must be from 0 through 120 seconds");
  if (!message || typeof message !== "object" || Array.isArray(message)) throw new TypeError("BVP message must be an object");
  if (message.protocol !== "hiri-bvp/3.0") throw new TypeError("unsupported BVP protocol");
  if (message.type !== type) throw new TypeError("unsupported BVP message type");
  parseRandomId(message.sessionId); parseRandomId(message.challengeId); parseNonce(message.nonce);
  assertClosedObject(message.proof, PROOF, PROOF, "BVP proof");
  if (message.proof.type !== "Ed25519Signature2020" || message.proof.canonicalization !== "JCS" || message.proof.proofPurpose !== "authentication") throw new TypeError("unsupported BVP proof suite");
  parseVerificationMethod(message.proof.verificationMethod);
  const created = parseUtcSeconds(message.createdAt); const expires = parseUtcSeconds(message.expiresAt); parseUtcSeconds(message.proof.created);
  if (message.proof.created !== message.createdAt || created >= expires) throw new TypeError("invalid BVP message time ordering");
  const evaluation = typeof now === "number" ? now : parseUtcSeconds(now);
  if (created > evaluation + skew * 1000) throw new RangeError("BVP message not yet valid");
  if (expires < evaluation - skew * 1000) throw new RangeError("BVP message expired");
  if (jcsBytes(message).length > 65_536) throw new RangeError("BVP message resource limit exceeded");
  return { result: "valid", createdAt: created, expiresAt: expires, messageClockSkewSeconds: skew };
}

export function validateBvpString(value, { uri = false, jurisdiction = false } = {}) {
  const maximum = uri ? 2048 : jurisdiction ? 64 : 128;
  if (typeof value !== "string" || unicodeScalarLength(value) < 1 || unicodeScalarLength(value) > maximum) throw new RangeError("BVP string limit exceeded"); return value;
}

export async function signBvpMessage(domain, message, ports) {
  const copy = structuredClone(message); copy.proof.proofValue = await signDomainSeparated(domain, copy, copy.proof.verificationMethod, ports.ed25519); return copy;
}

export async function verifyBvpMessage(domain, message, authorityEvidence, ports) {
  const authorization = verifyMethodAuthorization({ authority: authorityEvidence?.authority, method: message.proof.verificationMethod, at: message.createdAt, lifecycleEvidence: authorityEvidence?.lifecycleEvidence });
  if (authorization.result !== "valid") return { result: authorization.result, signature: "unknown", methodAuthorization: authorization.methodAuthorization };
  const valid = await verifyDomainSeparated(domain, message, message.proof, ports.ed25519);
  return { result: valid ? "valid" : "invalid", signature: valid ? "valid" : "invalid", methodAuthorization: "valid" };
}
