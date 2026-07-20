import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const path = process.argv[2] ?? "RHP-DR-001-Approval-Evidence.json";
const evidence = JSON.parse(readFileSync(path, "utf8"));
const requiredStrings = ["schema", "recordId", "revision", "canonicalPath", "decisionCommit", "fileSha256", "approvalDate", "reviewDate", "signatureMechanism", "signerIdentity"];
for (const name of requiredStrings) if (typeof evidence[name] !== "string" || evidence[name].length === 0) throw new Error(`Approval evidence has no ${name}`);
if (evidence.schema !== "hiri:rhp-approval-evidence:v1") throw new Error("Unsupported approval-evidence schema");
if (!/^sha256:[0-9a-f]{64}$/u.test(evidence.fileSha256)) throw new Error("Invalid SHA-256 identifier");
if (!/^[0-9a-f]{40,64}$/u.test(evidence.decisionCommit)) throw new Error("Invalid full decision commit identifier");
if (typeof evidence.approver?.name !== "string" || typeof evidence.approver?.role !== "string") throw new Error("Approval evidence has no approver identity or role");
for (const name of ["D1", "D2", "D3", "D4", "D5", "D6", "exitDisposition"]) if (typeof evidence.approvedOptions?.[name] !== "string") throw new Error(`Approval evidence has no ${name} selection`);

let bytes;
try {
  bytes = execFileSync("git", ["show", `${evidence.decisionCommit}:${evidence.canonicalPath}`], { encoding: null, maxBuffer: 16 * 1024 * 1024 });
} catch (error) {
  const detail = error.stderr?.toString().trim() || error.message;
  throw new Error(`Cannot read the committed decision record: ${detail}`);
}
const actual = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
if (actual !== evidence.fileSha256) throw new Error(`Decision SHA-256 mismatch: expected ${evidence.fileSha256}, got ${actual}`);
const decision = bytes.toString("utf8");
for (const value of [evidence.recordId, evidence.revision, evidence.approver.name, evidence.approvalDate, evidence.reviewDate]) if (!decision.includes(value)) throw new Error(`Committed decision record does not contain evidence value: ${value}`);

console.log(`Approval evidence content verified: ${path}`);
console.log(`Decision commit: ${evidence.decisionCommit}`);
console.log(`Decision SHA-256: ${actual}`);
console.log("Content verification passed. Verify the external tag, detached signature, or e-signature separately.");
