import { jcsBytes } from "../core/canonical.mjs";
import { domainSeparatedBytes, sha256Identifier } from "../core/proof.mjs";
import { assertClosedObject, methodAuthority, parseEd25519Authority, parseRandomId, parseSha256Identifier, parseUtcSeconds } from "../core/scalars.mjs";
import { signBvpMessage, validateBvpEnvelope, verifyBvpMessage } from "./message.mjs";

export const RESPONSE_DOMAIN = "HIRI-BVP-HOLDER-BINDING-RESPONSE-V3";
const ROOT = ["protocol", "type", "sessionId", "challengeId", "challengeHash", "bvsAuthority", "holder", "authorizedIntentIds", "nonce", "createdAt", "expiresAt", "proof"];

export async function createHolderBindingResponse(challenge, authorizedIntentIds, holderMethod, ports) {
  const known = new Set(challenge.intents.map((intent) => intent.intentId)); if (!Array.isArray(authorizedIntentIds) || !authorizedIntentIds.length || new Set(authorizedIntentIds).size !== authorizedIntentIds.length || authorizedIntentIds.some((id) => !known.has(id))) throw new TypeError("authorized intents must be a non-empty subset");
  if (methodAuthority(holderMethod) !== challenge.holderAuthority) throw new TypeError("holder method binding mismatch");
  const createdAt = ports.clock(); const maximum = Math.min(parseUtcSeconds(challenge.expiresAt), parseUtcSeconds(createdAt) + 5 * 60 * 1000); const expiresAt = new Date(maximum).toISOString().replace(".000Z", "Z");
  const challengeHash = await sha256Identifier(jcsBytes(challenge), ports.sha256);
  const response = { protocol: "hiri-bvp/3.0", type: "BvsHolderBindingResponse", sessionId: challenge.sessionId, challengeId: challenge.challengeId, challengeHash, bvsAuthority: challenge.bvs.authority, holder: { authority: challenge.holderAuthority, verificationMethod: holderMethod }, authorizedIntentIds: [...authorizedIntentIds], nonce: challenge.nonce, createdAt, expiresAt, proof: { type: "Ed25519Signature2020", canonicalization: "JCS", created: createdAt, verificationMethod: holderMethod, proofPurpose: "authentication", proofValue: "z1" } };
  return signBvpMessage(RESPONSE_DOMAIN, response, ports);
}

export async function validateHolderBindingResponse(challenge, response, now, skew = 0, ports = {}) {
  assertClosedObject(response, ROOT, ROOT, "holder-binding response"); const envelope = validateBvpEnvelope(response, "BvsHolderBindingResponse", now, skew);
  for (const name of ["sessionId", "challengeId", "nonce"]) if (response[name] !== challenge[name]) return { result: "invalid", error: "BVP_CHALLENGE_MISMATCH" };
  if (response.bvsAuthority !== challenge.bvs.authority) return { result: "invalid", error: "BVP_CHALLENGE_MISMATCH" };
  const expectedHash = await sha256Identifier(jcsBytes(challenge), ports.sha256); parseSha256Identifier(response.challengeHash); if (response.challengeHash !== expectedHash) return { result: "invalid", error: "BVP_CHALLENGE_MISMATCH" };
  assertClosedObject(response.holder, ["authority", "verificationMethod"], ["authority", "verificationMethod"], "holder"); parseEd25519Authority(response.holder.authority);
  if (response.holder.authority !== challenge.holderAuthority || methodAuthority(response.holder.verificationMethod) !== response.holder.authority || response.holder.verificationMethod !== response.proof.verificationMethod) return { result: "invalid", error: "BVP_METHOD_UNAUTHORIZED" };
  const known = new Set(challenge.intents.map((intent) => intent.intentId)); if (!Array.isArray(response.authorizedIntentIds) || !response.authorizedIntentIds.length || new Set(response.authorizedIntentIds).size !== response.authorizedIntentIds.length || response.authorizedIntentIds.some((id) => { try { parseRandomId(id); } catch { return true; } return !known.has(id); })) return { result: "invalid", error: "BVP_INTENT_UNAUTHORIZED" };
  if (envelope.expiresAt > Math.min(parseUtcSeconds(challenge.expiresAt), envelope.createdAt + 5 * 60 * 1000) || envelope.createdAt < parseUtcSeconds(challenge.createdAt) - skew * 1000 || parseUtcSeconds(challenge.expiresAt) < (typeof now === "number" ? now : parseUtcSeconds(now)) - skew * 1000) return { result: "invalid", error: "BVP_LIFETIME_EXCEEDED" };
  const lifecycleEvidence = ports.hiriVerifier?.getLifecycleEvidence ? await ports.hiriVerifier.getLifecycleEvidence(response.holder.authority, response.createdAt) : ports.lifecycleEvidence;
  const verification = await verifyBvpMessage(RESPONSE_DOMAIN, response, { authority: response.holder.authority, lifecycleEvidence }, ports);
  return { result: verification.result, signature: verification.signature, holderBinding: verification.result, authorizedIntentIds: [...response.authorizedIntentIds], messageClockSkewSeconds: skew };
}

export function responseSigningBytes(response) { return domainSeparatedBytes(RESPONSE_DOMAIN, response); }
