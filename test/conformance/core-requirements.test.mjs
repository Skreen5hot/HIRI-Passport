import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

test("Core conformance harness reports every requirement without claiming Candidate readiness", () => {
  const report = JSON.parse(execFileSync(process.execPath, ["scripts/check-core-conformance.mjs"], { encoding: "utf8" }));
  assert.equal(report.requirementCoverage.total, report.requirementCoverage.mapped);
  assert.ok(Object.values(report.requirementCoverage.mappings).every((files) => files.length > 0));
  assert.equal(report.candidateReady, false);
  assert.ok(report.blockers.includes("OPEN-SD-01"));
});
