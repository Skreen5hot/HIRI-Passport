import { parseAbsoluteUri, parseSha256Identifier, parseUtcSeconds } from "./scalars.mjs";

export function validateCoreBvsEvidence(credential, profileRegistry) {
  const evidence = credential?.evidence;
  if (!evidence || evidence.type !== "hiri:passport:BvsEvidence") return { result: "invalid", error: "BVP_EVIDENCE_INCONSISTENT" };
  for (const name of ["evidenceProfile", "evidenceProfileHash", "sourceProvider", "sourceVerificationMethod", "verifiedAt", "adapterId", "adapterVersion"]) {
    if (!Object.hasOwn(evidence, name)) return { result: "invalid", error: "BVP_EVIDENCE_INCONSISTENT" };
  }
  try {
    parseAbsoluteUri(evidence.evidenceProfile);
    parseSha256Identifier(evidence.evidenceProfileHash);
    parseUtcSeconds(evidence.verifiedAt);
  } catch {
    return { result: "invalid", error: "BVP_EVIDENCE_INCONSISTENT" };
  }
  const profile = profileRegistry?.get?.(evidence.evidenceProfile, evidence.evidenceProfileHash);
  if (!profile) return { result: "unknown", error: "BVP_PROFILE_UNAVAILABLE" };
  if (profile.hash !== evidence.evidenceProfileHash) return { result: "invalid", error: "BVP_PROFILE_HASH_MISMATCH" };
  if (evidence.holderBinding && !profile.definesHolderBinding) return { result: "unknown", error: "BVP_PROFILE_UNAVAILABLE" };
  return { result: "valid", evidence };
}

export function createBvsTrustKey({ bvsAuthority, evidence, credential }) {
  return Object.freeze([
    bvsAuthority,
    evidence.sourceProvider,
    evidence.sourceVerificationMethod,
    credential.schema,
    evidence.jurisdiction ?? "",
    evidence.adapterVersion
  ]);
}

export function classifyBvsTrust(input, policy) {
  const key = createBvsTrustKey(input);
  const decision = policy?.evaluate?.(key, input);
  if (decision === true) return { issuerTrust: "trusted", key };
  if (decision === false) return { issuerTrust: "untrusted", key };
  return { issuerTrust: "unknown", key };
}
