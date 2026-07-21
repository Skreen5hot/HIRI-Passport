import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { jcsBytes } from "../src/core/canonical.mjs";
import { parseStrictJson } from "../src/sdk/strict-json.mjs";

const METADATA_PATH = "resources/preview/rhp-2026-07/candidate-metadata.json";
const SEMANTIC_IDS = ["SEM-01-SCOPE", "SEM-02-CONTEXT", "SEM-03-CLAIMS", "SEM-04-PORTFOLIO", "SEM-05-PACKAGE", "SEM-06-CONFIG-TRUST"];

function usage(message) {
  if (message) console.error(message);
  console.error("Usage: node scripts/create-rhp-independent-review-record.mjs --candidate-commit <full commit> --manifest-hash <sha256:...> --verification-report <path> --findings <path> --semantic-assessment <path> --reviewer-name <name> --reviewer-affiliation <affiliation or independent> --reviewer-contact <durable contact> --reviewed-at <YYYY-MM-DDTHH:mm:ssZ> --independence-basis <text> --qualification-summary <text> --decision <approve|changes-required|reject> --confirm-not-author --confirm-no-reporting-conflict --confirm-no-financial-conflict --confirm-schema-competence --confirm-hiri-competence --confirm-working-drafts-reviewed [--output <path>] [--force]");
  process.exit(2);
}

function args(values) {
  const result = { output: "review-output/rhp-independent-review-record.json", force: false };
  const flags = new Set(["--confirm-not-author", "--confirm-no-reporting-conflict", "--confirm-no-financial-conflict", "--confirm-schema-competence", "--confirm-hiri-competence", "--confirm-working-drafts-reviewed", "--force"]);
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    if (flags.has(name)) { result[name.slice(2).replace(/-([a-z])/gu, (_m, c) => c.toUpperCase())] = true; continue; }
    if (!["--candidate-commit", "--manifest-hash", "--verification-report", "--findings", "--semantic-assessment", "--reviewer-name", "--reviewer-affiliation", "--reviewer-contact", "--reviewed-at", "--independence-basis", "--qualification-summary", "--decision", "--output"].includes(name)) usage(`Unknown argument: ${name}`);
    const value = values[index + 1]; if (!value || value.startsWith("--")) usage(`Missing value for ${name}`);
    result[name.slice(2).replace(/-([a-z])/gu, (_m, c) => c.toUpperCase())] = value; index += 1;
  }
  for (const name of ["candidateCommit", "manifestHash", "verificationReport", "findings", "semanticAssessment", "reviewerName", "reviewerAffiliation", "reviewerContact", "reviewedAt", "independenceBasis", "qualificationSummary", "decision"]) if (!result[name]) usage(`missing required value: ${name}`);
  for (const name of ["confirmNotAuthor", "confirmNoReportingConflict", "confirmNoFinancialConflict", "confirmSchemaCompetence", "confirmHiriCompetence", "confirmWorkingDraftsReviewed"]) if (result[name] !== true) usage(`missing required truthful confirmation: ${name}`);
  if (!["approve", "changes-required", "reject"].includes(result.decision)) usage("--decision is invalid");
  return result;
}

function git(arguments_, encoding = "utf8") {
  try { return execFileSync("git", arguments_, { encoding, maxBuffer: 16 * 1024 * 1024 }); }
  catch (error) { throw new Error(`git ${arguments_.join(" ")} failed: ${error.stderr?.toString().trim() || error.message}`); }
}
function hash(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }
function json(bytes, label) {
  try { return parseStrictJson(Buffer.from(bytes).toString("utf8"), { maximumBytes: 2 * 1024 * 1024, maximumDepth: 64, maximumStringLength: 1024 * 1024 }); }
  catch (error) { throw new Error(`${label} is invalid strict JSON: ${error.message}`); }
}
function text(value, label, minimum = 2) { if (typeof value !== "string" || value.trim().length < minimum) throw new Error(`${label} is incomplete`); return value.trim(); }

const options = args(process.argv.slice(2));
const candidateCommit = git(["rev-parse", "--verify", `${options.candidateCommit}^{commit}`]).trim();
if (candidateCommit !== options.candidateCommit || git(["rev-parse", "HEAD"]).trim() !== candidateCommit) throw new Error("candidate commit must be full and checked out at HEAD");
if (!/^sha256:[0-9a-f]{64}$/u.test(options.manifestHash)) throw new Error("manifest hash is invalid");
const metadata = json(git(["show", `${candidateCommit}:${METADATA_PATH}`], null), "candidate metadata");
if (metadata.manifest?.sha256 !== options.manifestHash) throw new Error("candidate metadata does not match the manifest hash");

const reportBytes = readFileSync(options.verificationReport);
const report = json(reportBytes, "verification report");
if (report.schema !== "hiri:rhp-independent-resource-verification:v1" || report.candidateCommit !== candidateCommit || report.manifestHash !== options.manifestHash ||
  report.disposition !== "mechanically-verified" || report.productionApproved !== false || !Array.isArray(report.checks) || report.checks.some(check => check.result !== "pass")) {
  throw new Error("verification report does not prove a complete passing run for this candidate");
}

const findingsBytes = readFileSync(options.findings);
const findingDocument = json(findingsBytes, "findings");
if (findingDocument.schema !== "hiri:rhp-independent-review-findings:v1" || !Array.isArray(findingDocument.findings)) throw new Error("findings file has an invalid root");
const findingIds = new Set();
for (const finding of findingDocument.findings) {
  if (!finding || typeof finding !== "object" || typeof finding.id !== "string" || findingIds.has(finding.id) ||
    !["blocking", "non-blocking"].includes(finding.severity) || !["open", "resolved"].includes(finding.status)) throw new Error(`invalid or duplicate finding: ${String(finding?.id)}`);
  for (const field of ["requirement", "resourceId", "description", "evidence", "recommendedResolution"]) text(finding[field], `finding ${finding.id} ${field}`, 3);
  findingIds.add(finding.id);
}

const semanticBytes = readFileSync(options.semanticAssessment);
const semantic = json(semanticBytes, "semantic assessment");
if (semantic.schema !== "hiri:rhp-independent-semantic-assessment:v1" || !Array.isArray(semantic.assessments) || semantic.assessments.length !== SEMANTIC_IDS.length) throw new Error("semantic assessment has an invalid root or count");
for (let index = 0; index < SEMANTIC_IDS.length; index += 1) {
  const assessment = semantic.assessments[index];
  if (assessment.id !== SEMANTIC_IDS[index] || !["acceptable", "blocking-finding"].includes(assessment.conclusion) || text(assessment.analysis, `${assessment.id} analysis`, 40).length < 40 ||
    !Array.isArray(assessment.evidence) || assessment.evidence.length < 1 || assessment.evidence.some(item => typeof item !== "string" || item.trim().length < 3)) throw new Error(`semantic assessment is incomplete: ${SEMANTIC_IDS[index]}`);
  if (assessment.conclusion === "blocking-finding" && (!findingIds.has(assessment.findingId) || !findingDocument.findings.some(finding => finding.id === assessment.findingId && finding.severity === "blocking" && finding.status === "open"))) {
    throw new Error(`${assessment.id} must name its open blocking finding`);
  }
  if (assessment.conclusion === "acceptable" && typeof assessment.findingId === "string" && assessment.findingId.trim().length > 0) {
    throw new Error(`${assessment.id} is acceptable and must not name a findingId`);
  }
}

const reviewer = { affiliation: text(options.reviewerAffiliation, "reviewer affiliation"), contact: text(options.reviewerContact, "reviewer contact"), name: text(options.reviewerName, "reviewer name") };
const author = metadata.responsibleAuthor;
if (reviewer.name.toLocaleLowerCase() === author.name.toLocaleLowerCase() || reviewer.contact.toLocaleLowerCase() === author.contact.toLocaleLowerCase()) throw new Error("reviewer is the responsible author and is not independent");
if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(options.reviewedAt) || new Date(options.reviewedAt).toISOString().replace(".000Z", "Z") !== options.reviewedAt) throw new Error("reviewed-at must be a valid UTC-seconds timestamp");
const openBlocking = findingDocument.findings.filter(finding => finding.severity === "blocking" && finding.status === "open");
if (options.decision === "approve" && (openBlocking.length || semantic.assessments.some(item => item.conclusion !== "acceptable"))) throw new Error("approval is prohibited while a blocking finding or unacceptable semantic assessment remains");

const record = {
  attestations: {
    hiriWorkingDraftReviewed: true,
    noFinancialConflict: true,
    noReportingConflict: true,
    notByteAuthor: true,
    qualifiedForHiriSemanticReview: true,
    qualifiedForJsonSchemaJcsSha256Review: true
  },
  candidateCommit,
  decision: options.decision,
  findings: findingDocument.findings,
  findingsFileSha256: hash(findingsBytes),
  independenceBasis: text(options.independenceBasis, "independence basis", 20),
  manifestHash: options.manifestHash,
  productionApprovalGranted: false,
  qualificationSummary: text(options.qualificationSummary, "qualification summary", 20),
  releaseId: "real-holder-preview",
  responsibleAuthor: author,
  reviewedAt: options.reviewedAt,
  reviewer,
  schema: "hiri:rhp-independent-resource-review:v1",
  semanticAssessment: semantic.assessments,
  semanticAssessmentFileSha256: hash(semanticBytes),
  sourceCommit: metadata.sourceCommit,
  verificationReport: { sha256: hash(reportBytes), toolSha256: report.tool.sha256 }
};
if (existsSync(options.output) && !options.force) throw new Error(`${options.output} exists; use --force only when intentionally replacing a local unsigned review record`);
const bytes = jcsBytes(record);
writeFileSync(options.output, bytes);
console.log(`Created ${options.output}`);
console.log(`Decision: ${record.decision}`);
console.log(`Candidate commit: ${candidateCommit}`);
console.log(`Manifest SHA-256: ${options.manifestHash}`);
console.log(`Review record SHA-256: ${hash(bytes)}`);
console.log("Return the record and verification report to the owner through the agreed authenticated channel. This record does not grant production approval.");
