import { jcsBytes } from "../core/canonical.mjs";
import { sha256Identifier } from "../core/proof.mjs";
import { parseAbsoluteUri, parseSha256Identifier, parseUtcSeconds } from "../core/scalars.mjs";

const REQUIRED = ["id", "version", "hash", "sourceProvider", "sourceVerificationMethod", "jurisdictions", "inputSchema", "outputSchema", "references", "procedure", "sourceResponseValidation", "subjectBinding", "freshness", "replay", "errors", "minimization", "retention", "supportedClaims", "inferenceLimits", "adversarialTests"];
const registry = new Map();

export async function validateAdapterProfile(profile, canonicalBytes = jcsBytes(profile), crypto) {
  if (!profile || typeof profile !== "object" || REQUIRED.some((name) => !Object.hasOwn(profile, name))) return { result: "invalid", error: "BVP_MESSAGE_MALFORMED" };
  try { parseAbsoluteUri(profile.id); parseSha256Identifier(profile.hash); if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u.test(profile.version)) throw new TypeError(); for (const name of ["sourceProvider", "sourceVerificationMethod", "procedure", "sourceResponseValidation", "subjectBinding", "freshness", "replay", "errors", "minimization", "retention", "inferenceLimits"]) if (typeof profile[name] !== "string" || !profile[name].length) throw new TypeError(); for (const name of ["jurisdictions", "references", "supportedClaims", "adversarialTests"]) if (!Array.isArray(profile[name]) || !profile[name].length) throw new TypeError(); parseAbsoluteUri(profile.inputSchema); parseAbsoluteUri(profile.outputSchema); } catch { return { result: "invalid", error: "BVP_MESSAGE_MALFORMED" }; }
  if (!crypto?.digest) return { result: "unknown", error: "BVP_PROFILE_UNAVAILABLE" };
  const actual = await sha256Identifier(canonicalBytes, crypto); return actual === profile.hash ? { result: "valid", profile } : { result: "invalid", error: "BVP_PROFILE_HASH_MISMATCH" };
}

export function registerAdapterProfile(profile) { const key = `${profile.id}\u0000${profile.version}`; const existing = registry.get(key); if (existing && existing.hash !== profile.hash) throw new Error("adapter profile substitution"); registry.set(key, structuredClone(profile)); return key; }

export function evaluateAdapterLifecycle(id, version, implementationVersion, at, policy = {}) {
  parseAbsoluteUri(id); parseUtcSeconds(at);
  const profile = registry.get(`${id}\u0000${version}`); if (!profile) return { result: "unknown", error: "BVP_PROFILE_UNAVAILABLE" };
  const disabled = (policy.disabledAdapters ?? []).some((entry) => entry.id === id && entry.version === version && (!entry.implementationVersion || entry.implementationVersion === implementationVersion));
  return { result: disabled ? "rejected" : "valid", profile, implementationVersion, historicalEvidenceRewritten: false };
}
