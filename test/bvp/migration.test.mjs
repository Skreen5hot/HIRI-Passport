import test from "node:test";
import assert from "node:assert/strict";
import { classifyLegacyBvpArtifact,planBvpMigration } from "../../src/bvp/migration.mjs";
test("BVP v2 evidence requires fresh v3 binding and issuance",()=>{const legacy={protocol:"hiri-bvp/2.0","@type":"hiri:AttestationManifest",trustLevel:2};assert.equal(classifyLegacyBvpArtifact(legacy).classification,"legacy");const plan=planBvpMigration(legacy);assert.equal(plan.action,"new-v3-holder-binding-and-reissue");assert.equal(plan.holderSelfMigrationAllowed,false);});
