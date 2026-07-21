import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { platform, tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";

const workspace = resolve(process.cwd());
const temporary = mkdtempSync(join(tmpdir(), "hiri-rhp-resource-kit-"));
process.env.GIT_CONFIG_GLOBAL = platform() === "win32" ? "NUL" : "/dev/null";
process.env.GIT_CONFIG_NOSYSTEM = "1";
function run(file, args, options = {}) {
  return execFileSync(file, args, { cwd: temporary, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, ...options });
}

try {
  for (const path of ["src", "scripts", "resources", "docs", ".gitignore"]) cpSync(join(workspace, path), join(temporary, path), { recursive: true });
  symlinkSync(join(workspace, "node_modules"), join(temporary, "node_modules"), "junction");
  run("git", ["init"]);
  run("git", ["config", "user.name", "RHP kit self-test"]);
  run("git", ["config", "user.email", "rhp-kit@hiri-protocol.org"]);
  run("git", ["config", "core.autocrlf", "false"]);
  run("git", ["add", "."]);
  run("git", ["-c", "commit.gpgsign=false", "commit", "-m", "RHP resource source"]);
  const sourceCommit = run("git", ["rev-parse", "HEAD"]).trim();
  run(process.execPath, ["scripts/preflight-rhp-resource-sources.mjs"]);
  const generation = run(process.execPath, [
    "scripts/prepare-rhp-resource-candidate.mjs",
    "--source-commit", sourceCommit,
    "--created-at", "2026-07-21T12:00:00Z",
    "--author-name", "RHP Kit Responsible Author",
    "--author-contact", "resource-author@hiri-protocol.org"
  ]);
  const manifestHash = generation.match(/Manifest SHA-256: (sha256:[0-9a-f]{64})/u)?.[1];
  if (!manifestHash) throw new Error("candidate generator did not print a manifest hash");
  run("git", ["add", "resources/preview/rhp-2026-07/resource-manifest.json", "resources/preview/rhp-2026-07/candidate-metadata.json"]);
  run("git", ["-c", "commit.gpgsign=false", "commit", "-m", "RHP resource candidate"]);
  const candidateCommit = run("git", ["rev-parse", "HEAD"]).trim();
  const verification = run(process.execPath, [
    "scripts/verify-rhp-resource-candidate.mjs",
    "--candidate-commit", candidateCommit,
    "--manifest-hash", manifestHash
  ]);
  if (!verification.includes("Independent mechanical verification passed") || !existsSync(join(temporary, "review-output/rhp-resource-verification-report.json"))) {
    throw new Error("candidate verifier did not produce its passing evidence report");
  }
  const report = JSON.parse(readFileSync(join(temporary, "review-output/rhp-resource-verification-report.json"), "utf8"));
  if (report.candidateCommit !== candidateCommit || report.manifestHash !== manifestHash || report.checks.some(check => check.result !== "pass")) {
    throw new Error("candidate report is not bound to the self-test candidate");
  }
  const findingsPath = join(temporary, "review-output/findings.json");
  const semanticPath = join(temporary, "review-output/semantic-assessment.json");
  writeFileSync(findingsPath, JSON.stringify({ schema: "hiri:rhp-independent-review-findings:v1", findings: [] }));
  writeFileSync(semanticPath, JSON.stringify({
    schema: "hiri:rhp-independent-semantic-assessment:v1",
    assessments: [
      ["SEM-01-SCOPE", "The release scope remains limited to the two holder self-assertion paths and all external trust paths remain disabled."],
      ["SEM-02-CONTEXT", "The context is descriptive, contains no remote dependency, and does not replace the declared JCS signing rule."],
      ["SEM-03-CLAIMS", "The label and value claim shape is a narrow complete-public project profile with explicit size and control limits."],
      ["SEM-04-PORTFOLIO", "The project portfolio record keeps its identifier private and separates local display metadata from assertion evidence."],
      ["SEM-05-PACKAGE", "Package values are treated as opaque only until the separately pinned presentation and artifact validators run."],
      ["SEM-06-CONFIG-TRUST", "The profile and both configurations keep identity, policy, resolver, head, resource, and delivery sets empty."]
    ].map(([id, analysis]) => ({ id, conclusion: "acceptable", analysis, evidence: ["docs/rhp/independent-resource-review/REQUIREMENT-TRACEABILITY.md"] }))
  }));
  const recordCreation = run(process.execPath, [
    "scripts/create-rhp-independent-review-record.mjs",
    "--candidate-commit", candidateCommit,
    "--manifest-hash", manifestHash,
    "--verification-report", "review-output/rhp-resource-verification-report.json",
    "--findings", "review-output/findings.json",
    "--semantic-assessment", "review-output/semantic-assessment.json",
    "--reviewer-name", "RHP Kit Independent Reviewer",
    "--reviewer-affiliation", "Independent self-test role",
    "--reviewer-contact", "resource-reviewer@hiri-protocol.org",
    "--reviewed-at", "2026-07-21T13:00:00Z",
    "--independence-basis", "Separate self-test identity with no authorship or reporting relationship.",
    "--qualification-summary", "Self-test exercises JSON Schema, JCS, digest, and HIRI evidence bindings.",
    "--decision", "approve",
    "--confirm-not-author",
    "--confirm-no-reporting-conflict",
    "--confirm-no-financial-conflict",
    "--confirm-schema-competence",
    "--confirm-hiri-competence",
    "--confirm-working-drafts-reviewed"
  ]);
  if (!recordCreation.includes("Review record SHA-256")) throw new Error("review record was not created");
  const recordVerification = run(process.execPath, [
    "scripts/verify-rhp-independent-review-record.mjs",
    "--record", "review-output/rhp-independent-review-record.json",
    "--verification-report", "review-output/rhp-resource-verification-report.json",
    "--findings", "review-output/findings.json",
    "--semantic-assessment", "review-output/semantic-assessment.json"
  ]);
  if (!recordVerification.includes("Independent review record verified")) throw new Error("review record did not verify");
  console.log(`RHP resource review kit end-to-end self-test passed: ${report.checks.length} independent checks and review-record binding.`);
} finally {
  const resolvedTemporary = resolve(temporary);
  const resolvedSystemTemp = resolve(tmpdir());
  const relativeTemporary = relative(resolvedSystemTemp, resolvedTemporary);
  if (!relativeTemporary || relativeTemporary.startsWith("..") || relativeTemporary.includes("/") || relativeTemporary.includes("\\") || !basename(resolvedTemporary).startsWith("hiri-rhp-resource-kit-")) {
    throw new Error(`refusing to remove unexpected self-test path: ${resolvedTemporary}`);
  }
  rmSync(resolvedTemporary, { force: true, recursive: true });
}
