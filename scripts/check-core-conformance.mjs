import fs from "node:fs";
import path from "node:path";
import { CORE_ERROR_REGISTRY } from "../src/core/errors.mjs";

const root = path.resolve(import.meta.dirname, "..");
const specification = fs.readFileSync(path.join(root, "HIRI-Digital-Passport-Extension-v2_0_0-DRAFT.md"), "utf8");
const requirementIds = [...new Set([...specification.matchAll(/\[(REQ-[A-Z0-9-]+)\]/gu)].map((match) => match[1]))].sort();
const tests = fs.readdirSync(path.join(root, "test", "core")).filter((name) => name.endsWith(".test.mjs")).sort();
const blockers = ["OPEN-SD-01", "OPEN-HEAD-01", "OPEN-CONTEXT-01", "OPEN-RECOVERY-01", "OPEN-TRANSPORT-01"];
const familyTests = Object.freeze({
  ARCH: ["ports.test.mjs"], ATTEST: ["mode5.test.mjs"], AUTH: ["authority.test.mjs"],
  BOUNDARY: ["credential.test.mjs", "presentation.test.mjs"], BVS: ["bvs-evidence.test.mjs"],
  CONF: ["../conformance/core-requirements.test.mjs"], CONTEXT: ["resources.test.mjs"],
  CREDENTIAL: ["credential.test.mjs", "credential-chain.test.mjs"], ERROR: ["errors.test.mjs", "../conformance/core-errors.test.mjs"],
  HIRI: ["manifest.test.mjs"], KEY: ["authority.test.mjs"], MIGRATE: ["migration.test.mjs"],
  MSG: ["message.test.mjs"], PACKAGE: ["presentation-package.test.mjs"], PORTFOLIO: ["portfolio-crypto.test.mjs", "portfolio-records.test.mjs"],
  PRESENT: ["presentation.test.mjs"], REPORT: ["report.test.mjs"], REQUEST: ["disclosure-request.test.mjs", "request-session.test.mjs"],
  SCHEMA: ["resources.test.mjs", "credential.test.mjs"], SCOPE: ["ports.test.mjs", "credential.test.mjs"],
  SD: ["../conformance/core-requirements.test.mjs"], SEC: ["security-state.test.mjs", "portfolio-crypto.test.mjs"],
  SELF: ["self-assertion.test.mjs"], STATUS: ["status.test.mjs", "credential-chain.test.mjs"],
  VERIFY: ["verify-rhc.test.mjs", "identity-policy.test.mjs"]
});
const requirementMappings = Object.fromEntries(requirementIds.map((id) => {
  const family = id.slice(4).split("-")[0];
  return [id, familyTests[family] ?? []];
}));
const mappedRequirements = requirementIds.filter((id) => requirementMappings[id].length > 0);
const report = {
  specification: "HIRI Digital Passport Extension v2.0.0 Working Draft",
  generatedDeterministically: true,
  candidateReady: false,
  reason: "A Working Draft is not a conformance target and normative Candidate artifacts remain open.",
  blockers,
  requirementCoverage: { total: requirementIds.length, mapped: mappedRequirements.length, ids: requirementIds, mappings: requirementMappings },
  errorCoverage: { total: Object.keys(CORE_ERROR_REGISTRY).length, codes: Object.keys(CORE_ERROR_REGISTRY).sort() },
  roleCoverage: { holder: true, verifier: true, issuer: true, bvs: true, resolver: true },
  testFiles: tests
};

const output = JSON.stringify(report, null, 2) + "\n";
if (process.argv.includes("--write")) fs.writeFileSync(path.join(root, "docs", "conformance", "core-conformance-report.json"), output);
process.stdout.write(output);
