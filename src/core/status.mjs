import { deriveIssuerState } from "./credential-chain.mjs";
import { parseUtcSeconds } from "./scalars.mjs";

function unknown(error, evidence) {
  return { result: "unknown", status: "unknown", error, evidence: evidence ? { headManifestHash: evidence.headManifestHash, headRetrievedAt: evidence.retrievedAt, source: evidence.source, freshnessSeconds: evidence.freshnessSeconds } : undefined };
}

export async function evaluateCredentialStatus({ presented, currentHeadEvidence, evaluationTime, policy = {}, parameters = {} }, _ports = {}) {
  const now = typeof evaluationTime === "number" ? evaluationTime : parseUtcSeconds(evaluationTime);
  const evidence = currentHeadEvidence;
  if (!evidence || evidence.result !== "valid" || evidence.issuerAuthoritative !== true) return unknown("CURRENT_HEAD_UNKNOWN", evidence);
  let retrievedAt;
  try { retrievedAt = typeof evidence.retrievedAt === "number" ? evidence.retrievedAt : parseUtcSeconds(evidence.retrievedAt); } catch { return unknown("CURRENT_HEAD_UNKNOWN", evidence); }
  const freshnessSeconds = Math.max(0, Math.floor((now - retrievedAt) / 1000)); evidence.freshnessSeconds = freshnessSeconds;
  const maximumAge = policy.maximumStatusAgeSeconds;
  if (!Number.isInteger(maximumAge) || maximumAge < 0 || freshnessSeconds > maximumAge) return unknown("CURRENT_HEAD_UNKNOWN", evidence);
  if (evidence.signature !== "valid" || evidence.hashes !== "valid" || evidence.chainResult !== "valid" || evidence.keyState !== "valid") return unknown(evidence.chainResult === "invalid" ? "HIRI_CHAIN_INVALID" : "CURRENT_HEAD_UNKNOWN", evidence);
  const chain = evidence.chain;
  if (!Array.isArray(chain) || !chain.length) return unknown("CURRENT_HEAD_UNKNOWN", evidence);
  const presentedIndex = chain.findIndex((version) => version.manifestHash === presented.manifestHash);
  if (presentedIndex < 0) return unknown("CREDENTIAL_NOT_IN_CURRENT_CHAIN", evidence);
  const state = deriveIssuerState(chain, now, parameters.credentialIssuanceToleranceSeconds ?? 0);
  if (state.result !== "valid") return unknown(state.error, evidence);
  const head = chain.at(-1); const content = head.content;
  let status;
  if (state.issuerState === "revoked") status = "revoked";
  else if (state.issuerState === "suspended") status = "suspended";
  else if (content.validUntil && parseUtcSeconds(content.validUntil) <= now) status = "expired";
  else if (state.issuerState === "superseded" || presentedIndex !== chain.length - 1) status = "superseded";
  else if (state.issuerState === "active") status = "active";
  else return unknown("CURRENT_HEAD_UNKNOWN", evidence);
  return { result: "valid", status, issuerState: state.issuerState, evidence: { headManifestHash: evidence.headManifestHash ?? head.manifestHash, headRetrievedAt: evidence.retrievedAt, source: evidence.source, freshnessSeconds } };
}
