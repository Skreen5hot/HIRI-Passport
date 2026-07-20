import { verifyPassportManifest } from "./manifest.mjs";

export async function verifyMode5Attestation({ attestorManifest, subjectManifest, subjectContent }, ports) {
  if (!attestorManifest || attestorManifest["@type"] !== "hiri:AttestationManifest") return { result: "invalid", error: "HIRI_MANIFEST_INVALID" };
  if (Object.hasOwn(attestorManifest, "hiri:content") || attestorManifest["hiri:privacy"]?.mode !== "attestation") return { result: "invalid", error: "HIRI_MANIFEST_INVALID" };
  if (!/^hiri:\/\/[^/]+\/data\/attestation-[^/]+$/u.test(attestorManifest["@id"] ?? "")) return { result: "invalid", error: "HIRI_MANIFEST_INVALID" };
  if (typeof ports?.hiriVerifier?.verifyAttestation !== "function") return { result: "unknown", error: "ARTIFACT_MISSING" };
  const attestor = await ports.hiriVerifier.verifyAttestation({ manifest: attestorManifest, pinnedVersion: "1.4.1" });
  if (attestor?.result !== "valid") return { result: attestor?.result === "invalid" ? "invalid" : "unknown", error: attestor?.error ?? "ARTIFACT_MISSING" };
  if (!subjectManifest) return { result: "unknown", error: "ARTIFACT_MISSING" };
  const subject = await verifyPassportManifest({ manifest: subjectManifest, content: subjectContent }, ports);
  if (subject.result !== "valid") return { result: subject.result, error: subject.error };
  if (attestor.subjectManifestHash !== subject.manifestHash) return { result: "invalid", error: "ARTIFACT_HASH_MISMATCH" };
  return { result: "valid", attestor, subject };
}
