import { jcsBytes } from "./canonical.mjs";
import { sha256Identifier } from "./proof.mjs";
import { assertClosedObject, parseAbsoluteUri, parseSha256Identifier, parseUtcSeconds } from "./scalars.mjs";

export const PACKAGE_LIMITS = Object.freeze({ packageBytes: 10 * 1024 * 1024, artifacts: 128, jsonDepth: 64, stringLength: 1024 * 1024, chainDepth: 1024 });

function boundedLimits(input = {}) {
  const limits = { ...PACKAGE_LIMITS, ...input };
  for (const key of Object.keys(PACKAGE_LIMITS)) {
    if (!Number.isInteger(limits[key]) || limits[key] < 0 || limits[key] > PACKAGE_LIMITS[key]) throw new RangeError(`${key} exceeds Passport-Core limit`);
  }
  return limits;
}

function inspect(value, limits, depth = 0) {
  if (depth > limits.jsonDepth) throw new RangeError("JSON depth limit exceeded");
  if (typeof value === "string" && new TextEncoder().encode(value).length > limits.stringLength) throw new RangeError("string length limit exceeded");
  if (value && typeof value === "object") for (const child of Object.values(value)) inspect(child, limits, depth + 1);
}

function declaredHash(artifact) { return artifact.manifestHash ?? artifact.contentHash ?? artifact.schemaHash; }

export function validatePresentationPackage(packageValue, configuredLimits = {}) {
  const limits = boundedLimits(configuredLimits);
  assertClosedObject(packageValue, ["protocol", "type", "presentation", "artifacts"], ["protocol", "type", "presentation", "artifacts"], "Presentation Package");
  if (packageValue.protocol !== "hiri-passport/2.0" || packageValue.type !== "PassportPresentationPackage") throw new TypeError("invalid Presentation Package fixed value");
  if (!packageValue.presentation || typeof packageValue.presentation !== "object" || Array.isArray(packageValue.presentation)) throw new TypeError("package presentation is required");
  if (!Array.isArray(packageValue.artifacts) || packageValue.artifacts.length > limits.artifacts) throw new RangeError("artifact count limit exceeded");
  if (jcsBytes(packageValue).length > limits.packageBytes) throw new RangeError("package byte limit exceeded");
  inspect(packageValue, limits);
  const hashes = new Map();
  for (const artifact of packageValue.artifacts) {
    const allowed = artifact.kind === "hiriManifest" ? ["kind", "manifestHash", "value"] : artifact.kind === "jsonContent" ? ["kind", "contentHash", "canonicalization", "value"] : artifact.kind === "jsonSchema" ? ["kind", "schema", "schemaHash", "canonicalization", "value"] : [];
    if (!allowed.length) throw new TypeError("unsupported package artifact kind");
    assertClosedObject(artifact, allowed, allowed, "package artifact");
    const hash = declaredHash(artifact); parseSha256Identifier(hash);
    if (artifact.kind !== "hiriManifest" && artifact.canonicalization !== "JCS") throw new TypeError("JSON artifact must use JCS");
    if (artifact.kind === "jsonSchema") parseAbsoluteUri(artifact.schema);
    const bytes = jcsBytes(artifact.value); const previous = hashes.get(hash);
    if (previous && !previous.every((byte, index) => byte === bytes[index]) || previous && previous.length !== bytes.length) throw new TypeError("duplicate artifact hash has byte-distinct values");
    hashes.set(hash, bytes);
  }
  return Object.freeze({ result: "valid", limits, artifactCount: packageValue.artifacts.length });
}

export async function verifyReferencedArtifact(ref, candidates, ports) {
  parseSha256Identifier(ref.hash);
  const matching = candidates.filter((candidate) => declaredHash(candidate.artifact ?? candidate) === ref.hash);
  if (!matching.length) return { result: "unknown", error: "ARTIFACT_MISSING", ref };
  let firstBytes;
  for (const candidate of matching) {
    const artifact = candidate.artifact ?? candidate; const bytes = jcsBytes(artifact.value);
    const actual = await sha256Identifier(bytes, ports.sha256);
    if (actual !== ref.hash) return { result: "invalid", error: "ARTIFACT_HASH_MISMATCH", ref };
    if (firstBytes && (firstBytes.length !== bytes.length || !firstBytes.every((byte, index) => byte === bytes[index]))) return { result: "invalid", error: "ARTIFACT_HASH_MISMATCH", ref };
    firstBytes = bytes;
  }
  const candidate = matching[0];
  return { result: "valid", artifact: (candidate.artifact ?? candidate).value, provenance: candidate.provenance ?? { source: "package", retrievedAt: null, transportAuthenticated: false } };
}

export async function resolvePackageArtifacts(packageValue, resolver, ports) {
  validatePresentationPackage(packageValue);
  const candidates = packageValue.artifacts.map((artifact) => ({ artifact, provenance: { source: "package", retrievedAt: null, transportAuthenticated: false } }));
  const refs = (packageValue.presentation.credentialPresentations ?? []).flatMap((item) => [{ kind: "hiriManifest", hash: item.credentialRef.manifestHash }, { kind: "jsonContent", hash: item.credentialRef.contentHash }]);
  const results = [];
  for (const ref of refs) {
    let result = await verifyReferencedArtifact(ref, candidates, ports);
    if (result.result === "unknown" && resolver?.resolve) {
      const resolved = await resolver.resolve(ref);
      if (resolved) result = await verifyReferencedArtifact(ref, [resolved], ports);
    }
    results.push({ ref, ...result });
  }
  return results;
}
