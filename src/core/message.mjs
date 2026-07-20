import { verifyMethodAuthorization } from "./authority.mjs";
import { domainSeparatedBytes, signDomainSeparated, verifyDomainSeparated } from "./proof.mjs";
import {
  assertClosedObject,
  parseRandomId,
  parseNonce,
  parseUtcSeconds,
  parseVerificationMethod
} from "./scalars.mjs";

const PROOF_MEMBERS = ["type", "canonicalization", "created", "verificationMethod", "proofPurpose", "proofValue"];

function parametersOf(parameters = {}) {
  const messageClockSkewSeconds = parameters.messageClockSkewSeconds ?? parameters.messageClockSkew ?? 0;
  const credentialIssuanceToleranceSeconds = parameters.credentialIssuanceToleranceSeconds ?? parameters.credentialIssuanceTolerance ?? 0;
  for (const [label, value, maximum] of [
    ["messageClockSkewSeconds", messageClockSkewSeconds, 120],
    ["credentialIssuanceToleranceSeconds", credentialIssuanceToleranceSeconds, 300]
  ]) {
    if (!Number.isInteger(value) || value < 0 || value > maximum) throw new RangeError(`${label} must be an integer from 0 through ${maximum}`);
  }
  return Object.freeze({ messageClockSkewSeconds, credentialIssuanceToleranceSeconds });
}

export function validateMessageEnvelope(message, expectedType, now, parameters = {}) {
  if (!message || typeof message !== "object" || Array.isArray(message)) throw new TypeError("message must be an object");
  if (message.protocol !== "hiri-passport/2.0") throw new TypeError("unsupported Passport protocol");
  if (message.type !== expectedType) throw new TypeError("unexpected Passport message type");
  const idMember = expectedType === "DisclosureRequest" ? "requestId" : "presentationId";
  parseRandomId(message[idMember]);
  if (expectedType === "DisclosureRequest") parseNonce(message.nonce);
  assertClosedObject(message.proof, PROOF_MEMBERS, PROOF_MEMBERS, "proof");
  if (message.proof.type !== "Ed25519Signature2020" || message.proof.canonicalization !== "JCS" || message.proof.proofPurpose !== "authentication") {
    throw new TypeError("unsupported Passport proof suite");
  }
  parseVerificationMethod(message.proof.verificationMethod);
  const createdAt = parseUtcSeconds(message.createdAt);
  const expiresAt = parseUtcSeconds(message.expiresAt);
  parseUtcSeconds(message.proof.created);
  if (message.proof.created !== message.createdAt) throw new TypeError("proof.created must equal createdAt");
  if (createdAt >= expiresAt) throw new TypeError("message creation must precede expiry");
  const used = parametersOf(parameters);
  const evaluationTime = typeof now === "number" ? now : parseUtcSeconds(now);
  const skew = used.messageClockSkewSeconds * 1000;
  if (createdAt > evaluationTime + skew) throw new RangeError("message is not yet valid");
  if (expiresAt < evaluationTime - skew) throw new RangeError("message has expired");
  return Object.freeze({ createdAt, expiresAt, parameters: used });
}

export function passportSigningBytes(domain, message) {
  return domainSeparatedBytes(domain, message);
}

export async function signPassportMessage(domain, message, ports) {
  const copy = structuredClone(message);
  copy.proof.proofValue = await signDomainSeparated(domain, copy, copy.proof.verificationMethod, ports.ed25519);
  return copy;
}

export async function verifyPassportMessage(domain, message, authorityEvidence, ports) {
  const authority = authorityEvidence?.authority;
  const authorization = verifyMethodAuthorization({
    authority,
    method: message?.proof?.verificationMethod,
    at: message?.createdAt,
    lifecycleEvidence: authorityEvidence?.lifecycleEvidence
  });
  if (authorization.result !== "valid") return { result: authorization.result, signature: "unknown", authorization };
  const valid = await verifyDomainSeparated(domain, message, message.proof, ports.ed25519);
  return { result: valid ? "valid" : "invalid", signature: valid ? "valid" : "invalid", authorization };
}
