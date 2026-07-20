import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

const DEFAULT_PATH = "RHP-DR-001-Real-Holder-Preview-Decision-Record-FINAL.md";
const ALLOWED_MECHANISMS = new Set(["gpg-signed-git-tag", "gpg-detached", "smime-detached", "controlled-e-signature"]);

function usage(message) {
  if (message) console.error(message);
  console.error("Usage: node scripts/create-rhp-approval-evidence.mjs --commit <commit> --mechanism <mechanism> --signer <public identity> [--path <decision path>] [--output <json path>] [--force]");
  process.exit(2);
}

function parseArguments(values) {
  const result = { path: DEFAULT_PATH, output: "RHP-DR-001-Approval-Evidence.json", force: false };
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    if (name === "--force") {
      result.force = true;
      continue;
    }
    if (!["--commit", "--mechanism", "--signer", "--path", "--output"].includes(name)) usage(`Unknown argument: ${name}`);
    const value = values[index + 1];
    if (!value || value.startsWith("--")) usage(`Missing value for ${name}`);
    result[name.slice(2)] = value;
    index += 1;
  }
  if (!result.commit) usage("--commit is required");
  if (!ALLOWED_MECHANISMS.has(result.mechanism)) usage(`--mechanism must be one of: ${[...ALLOWED_MECHANISMS].join(", ")}`);
  if (!result.signer) usage("--signer is required");
  return result;
}

function captureGit(args, encoding = "utf8") {
  try {
    return execFileSync("git", args, { encoding, maxBuffer: 16 * 1024 * 1024 });
  } catch (error) {
    const detail = error.stderr?.toString().trim() || error.message;
    throw new Error(`git ${args.join(" ")} failed: ${detail}`);
  }
}

function requiredMatch(text, expression, label) {
  const match = text.match(expression);
  if (!match) throw new Error(`Decision record is missing ${label}`);
  return match[1].trim();
}

function parseOptionSummary(value) {
  const options = {};
  for (const match of value.matchAll(/D([1-6]):\s*([A-D])/gu)) options[`D${match[1]}`] = match[2];
  if (Object.keys(options).length !== 6) throw new Error("Decision record option summary must contain D1 through D6");
  return options;
}

function assertSignableRecord(text) {
  if (!text.includes("**Status:** FINAL SIGNING COPY — NOT EFFECTIVE")) throw new Error("Decision record is not the final signing copy");
  if (/^- \[ \]/gmu.test(text) || /^- \[\]/gmu.test(text)) throw new Error("Decision record still contains an unselected or malformed option");
  if (/_{3,}/gu.test(text)) throw new Error("Decision record still contains an uncompleted blank field");
  if (!text.includes("https://hiri-protocol.org/notices/")) throw new Error("Decision record does not identify the approved public notice channel");
  if (!text.includes("docs/rhp/manual-expiry-and-emergency-control.md")) throw new Error("Decision record does not identify the manual expiry control procedure");
}

const options = parseArguments(process.argv.slice(2));
const commit = captureGit(["rev-parse", "--verify", `${options.commit}^{commit}`]).trim();
const canonicalPath = options.path.replaceAll("\\", "/");
const bytes = captureGit(["show", `${commit}:${canonicalPath}`], null);
const decision = bytes.toString("utf8");
assertSignableRecord(decision);

const recordId = requiredMatch(decision, /^\*\*Record ID:\*\*\s*(.+)$/mu, "record ID");
const revision = requiredMatch(decision, /^\*\*Revision:\*\*\s*(.+)$/mu, "revision");
const approverName = requiredMatch(decision, /^\*\*Approver:\*\*\s*(.+)$/mu, "approver name");
const approvalDate = requiredMatch(decision, /^\*\*Approval date:\*\*\s*(\d{4}-\d{2}-\d{2})$/mu, "ISO approval date");
const reviewDate = requiredMatch(decision, /^\*\*Mandatory review date:\*\*\s*(\d{4}-\d{2}-\d{2})$/mu, "ISO review date");
const role = requiredMatch(decision, /^\| Role \|\s*(.+?)\s*\|$/mu, "approver role");
const optionSummary = requiredMatch(decision, /^\| Approved option summary \|\s*(.+?)\s*\|$/mu, "approved option summary");
if (Date.parse(`${reviewDate}T00:00:00Z`) <= Date.parse(`${approvalDate}T00:00:00Z`)) throw new Error("Review date must be later than approval date");
if (!/^- \[X\] \*\*A\.\*\* All preview authorities/mu.test(decision)) throw new Error("Exit disposition A is not selected");

const evidence = {
  schema: "hiri:rhp-approval-evidence:v1",
  recordId,
  revision,
  canonicalPath,
  decisionCommit: commit,
  fileSha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
  approver: { name: approverName, role },
  approvedOptions: { ...parseOptionSummary(optionSummary), exitDisposition: "A" },
  approvalDate,
  reviewDate,
  signatureMechanism: options.mechanism,
  signerIdentity: options.signer
};

if (existsSync(options.output) && !options.force) throw new Error(`${options.output} already exists; use --force only when intentionally replacing unsigned evidence`);
writeFileSync(options.output, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", flag: "w" });
console.log(`Created ${options.output}`);
console.log(`Decision commit: ${commit}`);
console.log(`Decision SHA-256: ${evidence.fileSha256}`);
console.log("The evidence is not effective until its external signature verifies.");
