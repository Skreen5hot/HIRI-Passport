import { passportSigningBytes, signPassportMessage, validateMessageEnvelope } from "./message.mjs";
import { validateEphemeralSelfAssertion } from "./self-assertion.mjs";
import { assertClosedObject, methodAuthority, parseAbsoluteUri, parseEd25519Authority, parseRandomId, parseSha256Identifier, parseUtcSeconds } from "./scalars.mjs";

export const PRESENTATION_DOMAIN = "HIRI-PASSPORT-PRESENTATION-V2";
const ROOT = ["protocol", "type", "presentationId", "holder", "requestBinding", "credentialPresentations", "selfAssertions", "createdAt", "expiresAt", "proof"];

async function randomId(ports) {
  const { encodeBase64Url } = await import("./scalars.mjs");
  const bytes = await ports.randomBytes(16);
  if (!(bytes instanceof Uint8Array) || bytes.length !== 16) throw new TypeError("random ID source must return 16 bytes");
  return encodeBase64Url(bytes);
}
function lookup(request) { return new Map([...request.credentialRequests, ...request.selfAssertionRequests].map((item) => [item.requestItemId, item])); }

function containsRecordId(value) {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(containsRecordId);
  return Object.hasOwn(value, "recordId") || Object.values(value).some(containsRecordId);
}

export async function createPresentation(authorization, input, ports) {
  if (authorization.consumedPresentation && authorization.consumedPresentation !== input.retransmit) throw new Error("authorization already consumed");
  const presentationId = await randomId(ports);
  const createdAt = input.createdAt;
  const maximum = Math.min(Date.parse(authorization.expiresAt), parseUtcSeconds(createdAt) + 5 * 60 * 1000);
  const expiresAt = input.expiresAt ?? new Date(maximum).toISOString().replace(".000Z", "Z");
  const items = [];
  for (const item of input.credentialPresentations ?? []) items.push({ ...item, presentationItemId: item.presentationItemId ?? await randomId(ports) });
  const assertions = [];
  for (const item of input.selfAssertions ?? []) assertions.push({ ...item, presentationItemId: item.presentationItemId ?? await randomId(ports) });
  const message = { protocol: "hiri-passport/2.0", type: "PassportPresentation", presentationId, holder: { authority: input.holderAuthority, verificationMethod: input.holderMethod }, requestBinding: { requestId: authorization.requestId, nonce: authorization.nonce, verifierAuthority: authorization.verifierAuthority }, credentialPresentations: items, selfAssertions: assertions, createdAt, expiresAt, proof: { type: "Ed25519Signature2020", canonicalization: "JCS", created: createdAt, verificationMethod: input.holderMethod, proofPurpose: "authentication", proofValue: "z1" } };
  return signPassportMessage(PRESENTATION_DOMAIN, message, ports);
}

export function validatePresentation(presentation, request, _ports = {}, parameters = {}) {
  assertClosedObject(presentation, ROOT, ROOT, "Passport Presentation");
  validateMessageEnvelope(presentation, "PassportPresentation", parameters.now ?? presentation.createdAt, parameters);
  assertClosedObject(presentation.holder, ["authority", "verificationMethod"], ["authority", "verificationMethod"], "holder");
  parseEd25519Authority(presentation.holder.authority);
  if (methodAuthority(presentation.holder.verificationMethod) !== presentation.holder.authority || presentation.holder.verificationMethod !== presentation.proof.verificationMethod) throw new TypeError("holder method binding mismatch");
  assertClosedObject(presentation.requestBinding, ["requestId", "nonce", "verifierAuthority"], ["requestId", "nonce", "verifierAuthority"], "requestBinding");
  if (presentation.requestBinding.requestId !== request.requestId || presentation.requestBinding.nonce !== request.nonce || presentation.requestBinding.verifierAuthority !== request.verifier.authority) throw new TypeError("request binding mismatch");
  if (parseUtcSeconds(presentation.expiresAt) > Math.min(parseUtcSeconds(request.expiresAt), parseUtcSeconds(presentation.createdAt) + 5 * 60 * 1000)) throw new RangeError("presentation lifetime exceeded");
  if (!Array.isArray(presentation.credentialPresentations) || !Array.isArray(presentation.selfAssertions)) throw new TypeError("presentation item collections must be arrays");
  if (containsRecordId(presentation)) throw new TypeError("portfolio record IDs are prohibited");
  const requested = lookup(request); const usedRequestIds = new Set(); const presentationIds = new Set();
  for (const item of presentation.credentialPresentations) {
    assertClosedObject(item, ["presentationItemId", "requestItemId", "provenance", "disclosureMode", "credentialRef"], ["presentationItemId", "requestItemId", "provenance", "disclosureMode", "credentialRef"], "credential presentation");
    parseRandomId(item.presentationItemId); parseRandomId(item.requestItemId);
    if (presentationIds.has(item.presentationItemId) || usedRequestIds.has(item.requestItemId)) throw new TypeError("duplicate presentation item"); presentationIds.add(item.presentationItemId); usedRequestIds.add(item.requestItemId);
    const wanted = requested.get(item.requestItemId); if (!wanted || !Object.hasOwn(wanted, "credentialType")) throw new TypeError("unrequested credential");
    if (!["direct-issuer", "bvs", "self-asserted-persistent"].includes(item.provenance) || item.disclosureMode !== "public" || !wanted.acceptedDisclosureModes.includes(item.disclosureMode)) throw new TypeError("unsupported disclosure or provenance");
    assertClosedObject(item.credentialRef, ["uri", "manifestHash", "contentHash"], ["uri", "manifestHash", "contentHash"], "credentialRef"); parseAbsoluteUri(item.credentialRef.uri); parseSha256Identifier(item.credentialRef.manifestHash); parseSha256Identifier(item.credentialRef.contentHash);
  }
  for (const item of presentation.selfAssertions) {
    parseRandomId(item.presentationItemId); if (presentationIds.has(item.presentationItemId) || usedRequestIds.has(item.requestItemId)) throw new TypeError("duplicate presentation item"); presentationIds.add(item.presentationItemId); usedRequestIds.add(item.requestItemId);
    const wanted = requested.get(item.requestItemId); if (!wanted || Object.hasOwn(wanted, "credentialType")) throw new TypeError("unrequested self assertion");
    const assertion = validateEphemeralSelfAssertion(item, wanted, presentation);
    if (assertion.result !== "valid") throw new TypeError(assertion.error);
  }
  for (const wanted of [...request.credentialRequests, ...request.selfAssertionRequests]) if (wanted.required && !usedRequestIds.has(wanted.requestItemId)) throw new TypeError("required request item missing");
  return { result: "valid", presentedRequestItemIds: [...usedRequestIds] };
}

export function presentationSigningBytes(presentation) { return passportSigningBytes(PRESENTATION_DOMAIN, presentation); }
