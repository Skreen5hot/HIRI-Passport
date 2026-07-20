import { encodeBase64Url, parseAbsoluteUri, parseEd25519Authority, parseRandomId, parseSha256Identifier } from "./scalars.mjs";

export async function createPersistentSelfAssertion({ holderAuthority, content, publicPublicationAuthorized = false }, ports) {
  parseEd25519Authority(holderAuthority);
  if (content?.["@type"] !== "hiri:passport:SelfAssertion" || content.subjectHolderAuthority !== holderAuthority) throw new TypeError("invalid persistent self-assertion content");
  parseAbsoluteUri(content.schema);
  parseSha256Identifier(content.schemaHash);
  const id = encodeBase64Url(await ports.randomBytes(16));
  parseRandomId(id);
  return { uri: `hiri://${holderAuthority}/data/self-assertion-${id}`, publisher: holderAuthority, content: structuredClone(content), provenance: "self-asserted-persistent", published: publicPublicationAuthorized === true };
}

export function validatePersistentSelfAssertion(assertion, holderAuthority) {
  if (!assertion || assertion.publisher !== holderAuthority || assertion.content?.subjectHolderAuthority !== holderAuthority || assertion.provenance !== "self-asserted-persistent") return { result: "invalid", error: "SUBJECT_BINDING_MISMATCH" };
  if (assertion.envelopeType && assertion.envelopeType !== "hiri:ResolutionManifest") return { result: "invalid", error: "HIRI_MANIFEST_INVALID" };
  return { result: "valid", provenance: "self-asserted-persistent" };
}

export function validateEphemeralSelfAssertion(assertion, requestItem, presentation) {
  if (!assertion || assertion.provenance !== "self-asserted-ephemeral" || assertion.requestItemId !== requestItem?.requestItemId) return { result: "invalid", error: "PROVENANCE_MISMATCH" };
  if (assertion.schema !== requestItem.schema || assertion.schemaHash !== requestItem.schemaHash) return { result: "invalid", error: "CREDENTIAL_SCHEMA_INVALID" };
  if (presentation?.proof == null) return { result: "invalid", error: "SIGNATURE_INVALID" };
  return { result: "valid", provenance: "self-asserted-ephemeral" };
}
