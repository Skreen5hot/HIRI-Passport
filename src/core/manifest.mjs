import { CANONICALIZATION, PROOF_TYPE } from "./constants.mjs";
import { parseUtcSeconds } from "./scalars.mjs";

function result(state, details = {}) {
  return Object.freeze({ result: state, ...details });
}

export async function verifyPassportManifest({ manifest, content, evaluationTime }, ports) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return result("invalid", { error: "HIRI_MANIFEST_INVALID" });
  if (manifest["@type"] !== "hiri:ResolutionManifest") return result("invalid", { error: "HIRI_MANIFEST_INVALID" });
  if (!/^(?:0|[1-9]\d*)$/u.test(manifest["hiri:version"] ?? "")) return result("invalid", { error: "HIRI_MANIFEST_INVALID" });
  const contentDeclaration = manifest["hiri:content"];
  const signature = manifest["hiri:signature"];
  if (!contentDeclaration || !signature || contentDeclaration.canonicalization !== signature.canonicalization) {
    return result("invalid", { error: "HIRI_MANIFEST_INVALID" });
  }
  if (contentDeclaration.canonicalization !== CANONICALIZATION || contentDeclaration.addressing !== "raw-sha256" || signature.type !== PROOF_TYPE) {
    return result("invalid", { error: "HIRI_MANIFEST_INVALID" });
  }
  try {
    parseUtcSeconds(signature.created);
  } catch {
    return result("invalid", { error: "HIRI_MANIFEST_INVALID" });
  }
  if (typeof ports?.hiriVerifier?.verifyManifest !== "function") return result("unknown", { error: "KEY_STATE_UNKNOWN" });
  const upstream = await ports.hiriVerifier.verifyManifest({ manifest, content, evaluationTime, pinnedVersion: "3.1.1" });
  if (!upstream || upstream.result === "unknown") return result("unknown", { error: upstream?.error ?? "KEY_STATE_UNKNOWN" });
  if (upstream.result !== "valid") return result("invalid", { error: upstream.error ?? "HIRI_MANIFEST_INVALID" });
  if (manifest["hiri:version"] !== "0" && upstream.chain !== "valid") return result("invalid", { error: "HIRI_CHAIN_INVALID" });
  return result("valid", {
    authority: upstream.authority,
    manifestHash: upstream.manifestHash,
    contentHash: contentDeclaration.hash,
    keyState: upstream.keyState ?? "valid",
    chain: upstream.chain ?? "valid"
  });
}

export function assertResolutionManifestEnvelope(manifest, forbiddenClass) {
  if (manifest?.["@type"] !== "hiri:ResolutionManifest") {
    throw new TypeError(`${forbiddenClass ?? "artifact"} must use hiri:ResolutionManifest`);
  }
  return manifest;
}
