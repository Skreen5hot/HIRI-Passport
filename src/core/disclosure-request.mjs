import { validateMessageEnvelope, passportSigningBytes, signPassportMessage } from "./message.mjs";
import {
  assertClosedObject,
  assertPlainText,
  decodeBase58Btc,
  methodAuthority,
  parseAbsoluteUri,
  parseClaimPointer,
  parseEd25519Authority,
  parseRandomId,
  parseSha256Identifier,
  unicodeScalarLength
} from "./scalars.mjs";

export const DISCLOSURE_REQUEST_DOMAIN = "HIRI-PASSPORT-DISCLOSURE-REQUEST-V2";

const ROOT = ["protocol", "type", "requestId", "verifier", "credentialRequests", "selfAssertionRequests", "nonce", "createdAt", "expiresAt", "keyAgreement", "proof"];
const CREDENTIAL = ["requestItemId", "schema", "schemaHash", "credentialType", "acceptedDisclosureModes", "required", "purpose", "fields"];
const FIELD = ["path", "required", "purpose"];
const SELF = ["requestItemId", "schema", "schemaHash", "path", "purpose", "required"];

function assertBoolean(value, label) { if (typeof value !== "boolean") throw new TypeError(`${label} must be Boolean`); }
function tuple(parts) { return JSON.stringify(parts); }

export function validateDisclosureRequest(request, now, parameters = {}, _ports = {}) {
  assertClosedObject(request, ROOT, ROOT.filter((member) => member !== "keyAgreement"), "Disclosure Request");
  const envelope = validateMessageEnvelope(request, "DisclosureRequest", now, parameters);
  assertClosedObject(request.verifier, ["authority", "verificationMethod", "display"], ["authority", "verificationMethod"], "verifier");
  parseEd25519Authority(request.verifier.authority);
  if (methodAuthority(request.verifier.verificationMethod) !== request.verifier.authority || request.verifier.verificationMethod !== request.proof.verificationMethod) throw new TypeError("verifier method binding mismatch");
  if (request.verifier.display) {
    assertClosedObject(request.verifier.display, ["name", "domain"], ["name"], "verifier.display");
    assertPlainText(request.verifier.display.name, 1, 128, "display name");
    if (request.verifier.display.domain != null && (!/^(?=.{1,253}$)[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/u.test(request.verifier.display.domain) || request.verifier.display.domain.includes(".."))) throw new TypeError("display domain must be lowercase DNS text");
  }
  if (!Array.isArray(request.credentialRequests) || !Array.isArray(request.selfAssertionRequests)) throw new TypeError("request item collections must be arrays");
  const itemCount = request.credentialRequests.length + request.selfAssertionRequests.length;
  if (itemCount < 1 || itemCount > 64) throw new RangeError("request must contain 1 through 64 items");
  const ids = new Set();
  const tuples = new Set();
  for (const item of request.credentialRequests) {
    assertClosedObject(item, CREDENTIAL, CREDENTIAL, "credential request");
    parseRandomId(item.requestItemId); parseAbsoluteUri(item.schema); parseSha256Identifier(item.schemaHash);
    if (typeof item.credentialType !== "string" || unicodeScalarLength(item.credentialType) < 1) throw new TypeError("credentialType is required");
    if (!Array.isArray(item.acceptedDisclosureModes) || item.acceptedDisclosureModes.length !== 1 || item.acceptedDisclosureModes[0] !== "public") throw new TypeError("Passport-Core permits only public disclosure");
    assertBoolean(item.required, "credential required"); assertPlainText(item.purpose, 1, 512, "purpose");
    if (!Array.isArray(item.fields) || item.fields.length < 1 || item.fields.length > 64) throw new RangeError("credential request must contain 1 through 64 fields");
    for (const field of item.fields) {
      assertClosedObject(field, FIELD, FIELD, "credential field"); parseClaimPointer(field.path); assertBoolean(field.required, "field required"); assertPlainText(field.purpose, 1, 512, "purpose");
      const key = tuple([item.schema, item.schemaHash, item.credentialType, field.path]); if (tuples.has(key)) throw new TypeError("duplicate credential request tuple"); tuples.add(key);
    }
    if (ids.has(item.requestItemId)) throw new TypeError("duplicate requestItemId"); ids.add(item.requestItemId);
  }
  for (const item of request.selfAssertionRequests) {
    assertClosedObject(item, SELF, SELF, "self-assertion request");
    parseRandomId(item.requestItemId); parseAbsoluteUri(item.schema); parseSha256Identifier(item.schemaHash); parseClaimPointer(item.path); assertPlainText(item.purpose, 1, 512, "purpose"); assertBoolean(item.required, "self assertion required");
    const key = tuple([item.schema, item.schemaHash, item.path]); if (tuples.has(key)) throw new TypeError("duplicate self-assertion request tuple"); tuples.add(key);
    if (ids.has(item.requestItemId)) throw new TypeError("duplicate requestItemId"); ids.add(item.requestItemId);
  }
  if (envelope.expiresAt - envelope.createdAt > 15 * 60 * 1000) throw new RangeError("request lifetime exceeds 15 minutes");
  if (request.keyAgreement) {
    assertClosedObject(request.keyAgreement, ["id", "type", "publicKeyMultibase"], ["id", "type", "publicKeyMultibase"], "keyAgreement");
    if (request.keyAgreement.type !== "X25519KeyAgreementKey2020") throw new TypeError("unsupported key agreement type");
    parseAbsoluteUri(request.keyAgreement.id, { allowFragment: true }); decodeBase58Btc(request.keyAgreement.publicKeyMultibase, 32);
  }
  return Object.freeze({ result: "valid", ...envelope, requestItemIds: Object.freeze([...ids]) });
}

export function requestSigningBytes(request) { return passportSigningBytes(DISCLOSURE_REQUEST_DOMAIN, request); }
export function signDisclosureRequest(request, ports) { return signPassportMessage(DISCLOSURE_REQUEST_DOMAIN, request, ports); }
