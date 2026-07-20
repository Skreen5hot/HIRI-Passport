const LEGACY_TESTS = [
  ["legacy-portfolio-path", (value) => JSON.stringify(value).includes("/passport/main")],
  ["legacy-slots", (value) => Object.hasOwn(value ?? {}, "slots")],
  ["legacy-attestation-credential", (value) => value?.["@type"] === "hiri:AttestationManifest" && JSON.stringify(value).includes("credential")],
  ["legacy-hmac-token", (value) => /hmac/iu.test(JSON.stringify(value))],
  ["legacy-p256", (value) => /P-?256|secp256r1/iu.test(JSON.stringify(value))]
];

export function classifyLegacyArtifact(value) {
  if (!value || typeof value !== "object") return { classification: "not-an-artifact" };
  const matches = LEGACY_TESTS.filter(([, check]) => check(value)).map(([name]) => name);
  if (value.protocol === "hiri-passport/2.0" && !matches.length) return { classification: "v2" };
  return { classification: matches.length ? "legacy" : "unknown", indicators: matches };
}

export function planLegacyMigration(value) {
  const classification = classifyLegacyArtifact(value);
  if (classification.classification === "v2") return { action: "none", preserve: [] };
  const serialized = JSON.stringify(value);
  const issuerControlled = /credential|issuer/iu.test(serialized);
  return { action: issuerControlled ? "issuer-reissue-required" : "reconstruct-and-resign", authoritativeLegacyEvidence: false, preserve: ["local labels", "local notes"], prohibit: ["field renaming", "signature relabeling", "legacy hash trust"] };
}
