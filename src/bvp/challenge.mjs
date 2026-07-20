import { validateAuthority } from "../core/authority.mjs";
import { domainSeparatedBytes } from "../core/proof.mjs";
import { encodeBase64Url, assertClosedObject, assertPlainText, methodAuthority, parseAbsoluteUri, parseEd25519Authority, parseRandomId, parseSha256Identifier, parseUtcSeconds } from "../core/scalars.mjs";
import { signBvpMessage, validateBvpEnvelope, validateBvpString, verifyBvpMessage } from "./message.mjs";

export const CHALLENGE_DOMAIN = "HIRI-BVP-HOLDER-BINDING-CHALLENGE-V3";
const ROOT = ["protocol", "type", "sessionId", "challengeId", "bvs", "holderAuthority", "intents", "nonce", "createdAt", "expiresAt", "proof"];
const INTENT = ["intentId", "schema", "schemaHash", "credentialType", "disclosureMode", "purpose", "sourceProvider", "sourceVerificationMethod", "evidenceProfile", "evidenceProfileHash", "adapterId", "adapterVersion", "adapterProfile", "adapterProfileHash", "jurisdiction"];

async function random(ports, length) { const bytes = await ports.randomBytes(length); if (!(bytes instanceof Uint8Array) || bytes.length !== length) throw new TypeError(`random source must return ${length} bytes`); return encodeBase64Url(bytes); }

function validateIntent(intent) {
  assertClosedObject(intent, INTENT, INTENT.filter((name) => name !== "jurisdiction"), "BVS intent"); parseRandomId(intent.intentId);
  for (const name of ["schema", "evidenceProfile", "adapterProfile"]) parseAbsoluteUri(intent[name], { maxScalars: 2048 });
  for (const name of ["schemaHash", "evidenceProfileHash", "adapterProfileHash"]) parseSha256Identifier(intent[name]);
  for (const name of ["credentialType", "sourceProvider", "sourceVerificationMethod", "adapterId", "adapterVersion"]) validateBvpString(intent[name]);
  if (intent.disclosureMode !== "public") throw new TypeError("BVP Core disclosure mode must be public"); assertPlainText(intent.purpose, 1, 512, "intent purpose"); if (intent.jurisdiction != null) validateBvpString(intent.jurisdiction, { jurisdiction: true });
}

export async function createBvsChallenge(input, ports) {
  validateAuthority(input.bvsAuthority); parseEd25519Authority(input.holderAuthority); if (methodAuthority(input.bvsMethod) !== input.bvsAuthority) throw new TypeError("BVS method binding mismatch");
  if (!Array.isArray(input.intents) || input.intents.length < 1 || input.intents.length > 16) throw new RangeError("challenge requires 1 through 16 intents");
  const intents = []; for (const source of input.intents) { const intent = { ...structuredClone(source), intentId: source.intentId ?? await random(ports, 16) }; validateIntent(intent); intents.push(intent); }
  const createdAt = input.createdAt ?? ports.clock(); const expiresAt = input.expiresAt ?? new Date(parseUtcSeconds(createdAt) + 5 * 60 * 1000).toISOString().replace(".000Z", "Z");
  const message = { protocol: "hiri-bvp/3.0", type: "BvsHolderBindingChallenge", sessionId: input.sessionId ?? await random(ports, 16), challengeId: input.challengeId ?? await random(ports, 16), bvs: { authority: input.bvsAuthority, verificationMethod: input.bvsMethod }, holderAuthority: input.holderAuthority, intents, nonce: input.nonce ?? await random(ports, 32), createdAt, expiresAt, proof: { type: "Ed25519Signature2020", canonicalization: "JCS", created: createdAt, verificationMethod: input.bvsMethod, proofPurpose: "authentication", proofValue: "z1" } };
  return signBvpMessage(CHALLENGE_DOMAIN, message, ports);
}

export async function validateBvsChallenge(challenge, now, skew = 0, ports = {}) {
  assertClosedObject(challenge, ROOT, ROOT, "BVS challenge"); const envelope = validateBvpEnvelope(challenge, "BvsHolderBindingChallenge", now, skew);
  assertClosedObject(challenge.bvs, ["authority", "verificationMethod"], ["authority", "verificationMethod"], "BVS identity"); parseEd25519Authority(challenge.bvs.authority); parseEd25519Authority(challenge.holderAuthority);
  if (methodAuthority(challenge.bvs.verificationMethod) !== challenge.bvs.authority || challenge.bvs.verificationMethod !== challenge.proof.verificationMethod) throw new TypeError("BVS method binding mismatch");
  if (!Array.isArray(challenge.intents) || challenge.intents.length < 1 || challenge.intents.length > 16) throw new RangeError("challenge requires 1 through 16 intents"); const ids = new Set(); for (const intent of challenge.intents) { validateIntent(intent); if (ids.has(intent.intentId)) throw new TypeError("duplicate intentId"); ids.add(intent.intentId); }
  if (envelope.expiresAt - envelope.createdAt > 5 * 60 * 1000) throw new RangeError("challenge lifetime exceeded");
  const lifecycleEvidence = ports.hiriVerifier?.getLifecycleEvidence ? await ports.hiriVerifier.getLifecycleEvidence(challenge.bvs.authority, challenge.createdAt) : ports.lifecycleEvidence;
  const verification = await verifyBvpMessage(CHALLENGE_DOMAIN, challenge, { authority: challenge.bvs.authority, lifecycleEvidence }, ports);
  return { result: verification.result, signature: verification.signature, methodAuthorization: verification.methodAuthorization, messageClockSkewSeconds: skew, identityHint: challenge.bvs, identityVerified: false };
}

export function challengeSigningBytes(challenge) { return domainSeparatedBytes(CHALLENGE_DOMAIN, challenge); }
