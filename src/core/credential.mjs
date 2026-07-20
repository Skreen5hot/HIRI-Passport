import { jcsBytes } from "./canonical.mjs";
import { encodeBase64Url, parseAbsoluteUri, parseEd25519Authority, parseSha256Identifier, parseUtcSeconds } from "./scalars.mjs";
import { verifyPassportManifest } from "./manifest.mjs";
import { validateWithPinnedSchema } from "./resources.mjs";

function credentialAuthority(uri) {
  const prefix = "hiri://";
  if (typeof uri !== "string" || !uri.startsWith(prefix) || !uri.includes("/data/credential-")) throw new TypeError("invalid credential URI");
  const authority = uri.slice(prefix.length, uri.indexOf("/data/credential-"));
  parseEd25519Authority(authority);
  return authority;
}

export function validateCredentialClaim(content, parameters = {}) {
  if (!content || typeof content !== "object" || Array.isArray(content) || content["@type"] !== "hiri:passport:CredentialClaim") {
    return { result: "invalid", error: "CREDENTIAL_SCHEMA_INVALID" };
  }
  for (const name of ["schema", "schemaHash", "credentialType", "subjectHolderAuthority", "claims", "issuanceDate", "status"]) {
    if (!Object.hasOwn(content, name)) return { result: "invalid", error: "CREDENTIAL_SCHEMA_INVALID" };
  }
  try {
    parseAbsoluteUri(content.schema);
    parseSha256Identifier(content.schemaHash);
    parseEd25519Authority(content.subjectHolderAuthority);
    const issuance = parseUtcSeconds(content.issuanceDate);
    if (typeof content.credentialType !== "string" || !content.credentialType.length || !content.claims || typeof content.claims !== "object" || Array.isArray(content.claims)) throw new TypeError("claim shape");
    if (content.validUntil != null && parseUtcSeconds(content.validUntil) <= issuance) throw new TypeError("validUntil");
    if (content.statusId != null && (typeof content.statusId !== "string" || !content.statusId.length)) throw new TypeError("statusId");
    if (!content.status || !["active", "suspended", "revoked", "superseded"].includes(content.status.state)) throw new TypeError("status");
    if (parseUtcSeconds(content.status.effectiveAt) < issuance || content.status.effectiveAt !== content.issuanceDate) {
      if (parameters.genesis !== false) throw new TypeError("genesis effective time");
    }
    const evaluationTime = parameters.evaluationTime == null ? null : (typeof parameters.evaluationTime === "number" ? parameters.evaluationTime : parseUtcSeconds(parameters.evaluationTime));
    const tolerance = parameters.credentialIssuanceToleranceSeconds ?? 0;
    if (evaluationTime != null && issuance > evaluationTime + tolerance * 1000) {
      return { result: "invalid", error: "CREDENTIAL_NOT_YET_VALID", status: "unknown" };
    }
  } catch {
    return { result: "invalid", error: "CREDENTIAL_SCHEMA_INVALID" };
  }
  return { result: "valid", content };
}

export async function verifyDirectIssuerCredential({ manifest, content, schemaRegistry }, parameters, ports) {
  const manifestResult = await verifyPassportManifest({ manifest, content, evaluationTime: parameters?.evaluationTime }, ports);
  if (manifestResult.result !== "valid") return manifestResult;
  let issuer;
  try {
    issuer = credentialAuthority(manifest["@id"]);
  } catch {
    return { result: "invalid", error: "HIRI_MANIFEST_INVALID" };
  }
  if (manifestResult.authority !== issuer) return { result: "invalid", error: "SIGNATURE_METHOD_UNAUTHORIZED" };
  const claimResult = validateCredentialClaim(content, parameters);
  if (claimResult.result !== "valid") return claimResult;
  const schemaResult = await validateWithPinnedSchema(content, content.schema, content.schemaHash, parameters?.schemaLimits, schemaRegistry);
  if (schemaResult.result !== "valid") return schemaResult;
  return { result: "valid", issuerAuthority: issuer, subjectHolderAuthority: content.subjectHolderAuthority, manifestHash: manifestResult.manifestHash, contentHash: manifestResult.contentHash, content };
}

export async function preparePublicCredentialIssuance({ issuerAuthority, content, publicPublicationAuthorized }, ports) {
  parseEd25519Authority(issuerAuthority);
  if (publicPublicationAuthorized !== true) return { result: "prohibited", error: "PUBLICATION_NOT_AUTHORIZED" };
  const validation = validateCredentialClaim(content, { genesis: true });
  if (validation.result !== "valid") return validation;
  const idBytes = await ports.randomBytes(16);
  if (!(idBytes instanceof Uint8Array) || idBytes.length !== 16) throw new TypeError("random credential identifier must be 16 bytes");
  return { result: "prepared", uri: `hiri://${issuerAuthority}/data/credential-${encodeBase64Url(idBytes)}`, content: structuredClone(content), canonicalContent: jcsBytes(content) };
}
