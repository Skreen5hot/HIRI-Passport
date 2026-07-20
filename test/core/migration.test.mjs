import test from "node:test";
import assert from "node:assert/strict";
import { classifyLegacyArtifact, planLegacyMigration } from "../../src/core/migration.mjs";

test("legacy artifacts cannot be relabeled as v2", () => {
  assert.equal(classifyLegacyArtifact({ uri: "/passport/main", slots: [] }).classification, "legacy");
  assert.equal(planLegacyMigration({ "@type": "hiri:AttestationManifest", kind: "credential" }).action, "issuer-reissue-required");
  assert.equal(planLegacyMigration({ algorithm: "P-256", notes: "mine" }).authoritativeLegacyEvidence, false);
});
