const entries = [
  ["MESSAGE_MALFORMED", "R/H", "Affected phase result = invalid"],
  ["UNSUPPORTED_PROTOCOL", "R/H", "Affected phase result = invalid"],
  ["UNKNOWN_MEMBER", "R/H", "Affected phase result = invalid"],
  ["IDENTIFIER_INVALID", "R/H", "Identifier check and affected phase result = invalid"],
  ["NONCE_INVALID", "R", "Request nonce check and Phase R result = invalid"],
  ["MESSAGE_NOT_YET_VALID", "R/H", "Freshness and affected phase result = invalid"],
  ["MESSAGE_EXPIRED", "R/H", "Freshness and affected phase result = invalid"],
  ["LIFETIME_EXCEEDED", "R/H", "Freshness and affected phase result = invalid"],
  ["SIGNATURE_INVALID", "R/H/C", "Signature and affected result = invalid"],
  ["SIGNATURE_METHOD_UNAUTHORIZED", "R/H/C", "Method authorization and affected result = invalid"],
  ["KEY_STATE_UNKNOWN", "R/H/C", "Key state and dependent result = unknown unless invalid"],
  ["REQUEST_REPLAYED", "R", "Replay and Phase R result = invalid"],
  ["REQUEST_BINDING_MISMATCH", "R", "Presentation binding and Phase R result = invalid"],
  ["REQUIRED_ITEM_MISSING", "R", "Required items and Phase R result = invalid"],
  ["UNREQUESTED_DISCLOSURE", "R", "Requested items and Phase R result = invalid"],
  ["ARTIFACT_MISSING", "C", "Artifact check and credential result = unknown"],
  ["ARTIFACT_HASH_MISMATCH", "C", "Artifact integrity and credential result = invalid"],
  ["HIRI_MANIFEST_INVALID", "C", "Artifact integrity and credential result = invalid"],
  ["HIRI_CHAIN_INVALID", "C", "Chain and credential result = invalid; status = unknown"],
  ["CREDENTIAL_SCHEMA_INVALID", "C", "Schema validation and credential result = invalid"],
  ["CREDENTIAL_NOT_YET_VALID", "C", "Temporal validity = invalid; status = unknown"],
  ["SUBJECT_BINDING_MISMATCH", "C", "Subject binding and credential result = invalid"],
  ["CREDENTIAL_NOT_IN_CURRENT_CHAIN", "C", "Status = unknown; artifact checks unchanged"],
  ["STATUS_TRANSITION_INVALID", "C", "Status = unknown; status-chain check = invalid"],
  ["CURRENT_HEAD_UNKNOWN", "C", "Status = unknown; cryptographic result unchanged"],
  ["DISCLOSURE_MODE_UNSUPPORTED", "R/C", "Disclosure check and containing result = unknown"],
  ["PROVENANCE_MISMATCH", "C/I", "Provenance and credential result = invalid"],
  ["ISSUER_IDENTITY_UNKNOWN", "I", "Issuer identity = unknown; signature unchanged"],
  ["BVS_POLICY_UNTRUSTED", "I/P", "Issuer trust = untrusted; policy evaluates evidence"],
  ["RESOURCE_LIMIT_EXCEEDED", "Any", "Affected branch result = unknown; independent evidence unchanged"],
  ["POLICY_REJECTED", "P", "Policy result = rejected; evidence unchanged"]
];

export const CORE_ERROR_REGISTRY = Object.freeze(Object.fromEntries(entries.map(([code, phase, transition]) => [code, Object.freeze({ code, phase, transition })])));

export function protocolError(code, path = "", details = {}) {
  if (!Object.hasOwn(CORE_ERROR_REGISTRY, code) && !/^[a-z0-9][a-z0-9.-]*:[A-Z0-9_]+$/u.test(code)) {
    throw new TypeError(`unknown or non-namespaced protocol error: ${code}`);
  }
  const safe = {};
  for (const key of ["phase", "presentationItemId", "artifactRef"]) {
    if (typeof details[key] === "string" && details[key].length <= 256) safe[key] = details[key];
  }
  return Object.freeze({ code, path, ...safe });
}

function affectedCredential(report, error) {
  if (!Array.isArray(report.credentials)) report.credentials = [];
  if (error.presentationItemId) {
    const found = report.credentials.find((item) => item.presentationItemId === error.presentationItemId);
    if (found) return found;
  }
  if (!report.credentials[0]) report.credentials.push({ result: "unknown", status: "unknown" });
  return report.credentials[0];
}

function setUnlessInvalid(target, field, value) {
  if (target[field] !== "invalid") target[field] = value;
}

export function applyErrorTransition(input, error) {
  const report = structuredClone(input ?? {});
  report.errors = [...(report.errors ?? []), error];
  const code = error.code;
  const phase = error.phase;
  if (["POLICY_REJECTED"].includes(code)) {
    report.policy ??= {};
    report.policy.result = "rejected";
    return report;
  }
  if (code === "ISSUER_IDENTITY_UNKNOWN") {
    affectedCredential(report, error).issuerIdentity = "unknown";
    return report;
  }
  if (code === "BVS_POLICY_UNTRUSTED") {
    affectedCredential(report, error).issuerTrust = "untrusted";
    return report;
  }
  const credentialCodes = new Set(entries.filter(([, p]) => p.includes("C") || p.includes("I")).map(([c]) => c));
  if (credentialCodes.has(code) && !["UNSUPPORTED_PROTOCOL", "MESSAGE_MALFORMED", "UNKNOWN_MEMBER"].includes(code)) {
    const credential = affectedCredential(report, error);
    if (["ARTIFACT_MISSING", "CREDENTIAL_NOT_IN_CURRENT_CHAIN", "CURRENT_HEAD_UNKNOWN", "DISCLOSURE_MODE_UNSUPPORTED", "RESOURCE_LIMIT_EXCEEDED"].includes(code)) {
      setUnlessInvalid(credential, "result", "unknown");
    } else {
      credential.result = "invalid";
    }
    if (["HIRI_CHAIN_INVALID", "CREDENTIAL_NOT_YET_VALID", "CREDENTIAL_NOT_IN_CURRENT_CHAIN", "STATUS_TRANSITION_INVALID", "CURRENT_HEAD_UNKNOWN"].includes(code)) credential.status = "unknown";
    return report;
  }
  const targetName = phase === "H" || error.phase === "H" ? "holder" : "request";
  report[targetName] ??= {};
  if (code === "KEY_STATE_UNKNOWN" || code === "RESOURCE_LIMIT_EXCEEDED" || code === "DISCLOSURE_MODE_UNSUPPORTED") {
    setUnlessInvalid(report[targetName], "result", "unknown");
  } else {
    report[targetName].result = "invalid";
  }
  return report;
}

export function selectProtocolError(codes) {
  const unique = [...new Set(codes)];
  if (unique.length > 1) return unique.filter((code) => code !== "MESSAGE_MALFORMED");
  return unique;
}
