import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { jcsBytes } from "../src/core/canonical.mjs";
import { parseStrictJson } from "../src/sdk/strict-json.mjs";

function usage(message) {
  if (message) console.error(message);
  console.error("Usage: node scripts/verify-rhp-independent-review-record.mjs --record <path> --verification-report <path> --findings <path> --semantic-assessment <path>");
  process.exit(2);
}
const values = process.argv.slice(2); const options = {};
for (let index = 0; index < values.length; index += 2) {
  if (!["--record", "--verification-report", "--findings", "--semantic-assessment"].includes(values[index]) || !values[index + 1]) usage("invalid arguments");
  options[values[index].slice(2).replace(/-([a-z])/gu, (_m, c) => c.toUpperCase())] = values[index + 1];
}
if (!options.record || !options.verificationReport || !options.findings || !options.semanticAssessment) usage("all four evidence paths are required");
const hash = bytes => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const parse = bytes => parseStrictJson(bytes.toString("utf8"), { maximumBytes: 2 * 1024 * 1024, maximumDepth: 64, maximumStringLength: 1024 * 1024 });
const recordBytes = readFileSync(options.record); const record = parse(recordBytes);
const reportBytes = readFileSync(options.verificationReport); const report = parse(reportBytes);
const findingsBytes = readFileSync(options.findings); const findings = parse(findingsBytes);
const semanticBytes = readFileSync(options.semanticAssessment); const semantic = parse(semanticBytes);
if (record.schema !== "hiri:rhp-independent-resource-review:v1" || !["approve", "changes-required", "reject"].includes(record.decision) || record.productionApprovalGranted !== false) throw new Error("invalid review record root");
if (report.schema !== "hiri:rhp-independent-resource-verification:v1" || report.disposition !== "mechanically-verified" || report.productionApproved !== false || report.checks?.some(check => check.result !== "pass")) throw new Error("invalid verification report");
if (findings.schema !== "hiri:rhp-independent-review-findings:v1" || semantic.schema !== "hiri:rhp-independent-semantic-assessment:v1") throw new Error("invalid findings or semantic assessment root");
if (record.candidateCommit !== report.candidateCommit || record.manifestHash !== report.manifestHash || record.verificationReport?.sha256 !== hash(reportBytes) || record.verificationReport?.toolSha256 !== report.tool?.sha256) throw new Error("review record/report binding mismatch");
if (record.findingsFileSha256 !== hash(findingsBytes) || record.semanticAssessmentFileSha256 !== hash(semanticBytes) ||
  !Buffer.from(jcsBytes(record.findings)).equals(Buffer.from(jcsBytes(findings.findings))) ||
  !Buffer.from(jcsBytes(record.semanticAssessment)).equals(Buffer.from(jcsBytes(semantic.assessments)))) throw new Error("review record/findings/semantic binding mismatch");
const metadataBytes = execFileSync("git", ["show", `${record.candidateCommit}:resources/preview/rhp-2026-07/candidate-metadata.json`], { encoding: null, maxBuffer: 16 * 1024 * 1024 });
const metadata = parse(metadataBytes);
if (metadata.manifest?.sha256 !== record.manifestHash || metadata.sourceCommit !== record.sourceCommit || JSON.stringify(metadata.responsibleAuthor) !== JSON.stringify(record.responsibleAuthor)) throw new Error("review record/candidate binding mismatch");
if (record.reviewer?.name?.toLocaleLowerCase() === record.responsibleAuthor?.name?.toLocaleLowerCase() || record.reviewer?.contact?.toLocaleLowerCase() === record.responsibleAuthor?.contact?.toLocaleLowerCase()) throw new Error("reviewer is not independent of the responsible author");
if (!record.attestations || Object.values(record.attestations).some(value => value !== true)) throw new Error("reviewer attestations are incomplete");
const openBlocking = record.findings?.filter(finding => finding.severity === "blocking" && finding.status === "open") ?? [];
if (record.decision === "approve" && (openBlocking.length || record.semanticAssessment?.some(item => item.conclusion !== "acceptable"))) throw new Error("approval record contains unresolved blocking material");
console.log(`Independent review record verified: ${options.record}`);
console.log(`Decision: ${record.decision}`);
console.log(`Candidate commit: ${record.candidateCommit}`);
console.log(`Manifest SHA-256: ${record.manifestHash}`);
console.log(`Review record SHA-256: ${hash(recordBytes)}`);
console.log("Content and byte bindings passed. The owner must authenticate the delivery channel and separately sign the resource-set approval.");
