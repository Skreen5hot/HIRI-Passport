import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { jcsBytes } from "../src/core/canonical.mjs";
import {
  buildManifest,
  DESCRIPTOR_PATH,
  KIT_VERSION,
  loadSourceSet,
  MANIFEST_PATH,
  METADATA_PATH,
  sha256,
  TRACEABILITY_PATH,
  VECTOR_PATH
} from "./lib/rhp-resource-kit.mjs";

function usage(message) {
  if (message) console.error(message);
  console.error("Usage: node scripts/prepare-rhp-resource-candidate.mjs --source-commit <full commit> --created-at <YYYY-MM-DDTHH:mm:ssZ> --author-name <name> --author-contact <durable contact> [--output-dir <directory>] [--force]");
  process.exit(2);
}

function argumentsOf(values) {
  const result = { outputDir: "resources/preview/rhp-2026-07", force: false };
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    if (name === "--force") { result.force = true; continue; }
    if (!["--source-commit", "--created-at", "--author-name", "--author-contact", "--output-dir"].includes(name)) usage(`Unknown argument: ${name}`);
    const value = values[index + 1];
    if (!value || value.startsWith("--")) usage(`Missing value for ${name}`);
    result[name.slice(2).replace(/-([a-z])/gu, (_match, letter) => letter.toUpperCase())] = value;
    index += 1;
  }
  for (const name of ["sourceCommit", "createdAt", "authorName", "authorContact"]) if (!result[name]) usage(`--${name.replace(/[A-Z]/gu, letter => `-${letter.toLowerCase()}`)} is required`);
  if (result.authorName.trim().length < 2 || result.authorContact.trim().length < 3) usage("author name and durable contact must identify the responsible human author");
  return result;
}

function git(args, encoding = "utf8") {
  try {
    return execFileSync("git", args, { encoding, maxBuffer: 16 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`git ${args.join(" ")} failed: ${error.stderr?.toString().trim() || error.message}`);
  }
}

const options = argumentsOf(process.argv.slice(2));
const sourceCommit = git(["rev-parse", "--verify", `${options.sourceCommit}^{commit}`]).trim();
if (sourceCommit !== options.sourceCommit) throw new Error(`--source-commit must be the full commit identifier: ${sourceCommit}`);
const head = git(["rev-parse", "HEAD"]).trim();
if (head !== sourceCommit) throw new Error(`check out the source commit before preparing the candidate; HEAD is ${head}`);
if (git(["status", "--porcelain", "--untracked-files=no"]).trim()) throw new Error("tracked worktree changes exist; commit or remove them before candidate preparation");

const readCommitBytes = path => git(["show", `${sourceCommit}:${path.replaceAll("\\", "/")}`], null);
const sourceSet = loadSourceSet(readCommitBytes);
const vectorBytes = readCommitBytes(VECTOR_PATH);
const traceabilityBytes = readCommitBytes(TRACEABILITY_PATH);
const generatorBytes = readCommitBytes("scripts/prepare-rhp-resource-candidate.mjs");
const verifierBytes = readCommitBytes("scripts/verify-rhp-resource-candidate.mjs");
const prepared = buildManifest(sourceSet, { sourceCommit, createdAt: options.createdAt });

const manifestOutput = join(options.outputDir, basename(MANIFEST_PATH));
const metadataOutput = join(options.outputDir, basename(METADATA_PATH));
for (const path of [manifestOutput, metadataOutput]) if (existsSync(path) && !options.force) throw new Error(`${path} exists; use --force only to intentionally replace an unsigned candidate`);

const metadata = {
  approvalRecord: sourceSet.descriptor.approvalRecord,
  authoringAssistance: ["OpenAI Codex"],
  candidateReady: false,
  classification: "resource review candidate",
  createdAt: options.createdAt,
  generator: {
    path: "scripts/prepare-rhp-resource-candidate.mjs",
    sha256: sha256(generatorBytes),
    version: KIT_VERSION
  },
  independentVerifier: {
    path: "scripts/verify-rhp-resource-candidate.mjs",
    sha256: sha256(verifierBytes)
  },
  manifest: {
    path: MANIFEST_PATH,
    resourceCount: sourceSet.resources.length,
    sha256: prepared.sha256
  },
  releaseId: sourceSet.descriptor.releaseId,
  resourceSetDescriptor: { path: DESCRIPTOR_PATH, sha256: sha256(sourceSet.descriptorBytes) },
  responsibleAuthor: { contact: options.authorContact.trim(), name: options.authorName.trim() },
  schema: "hiri:rhp-resource-candidate-metadata:v1",
  sourceCommit,
  traceability: { path: TRACEABILITY_PATH, sha256: sha256(traceabilityBytes) },
  vectors: { path: VECTOR_PATH, sha256: sha256(vectorBytes) }
};

mkdirSync(options.outputDir, { recursive: true });
writeFileSync(manifestOutput, prepared.bytes);
writeFileSync(metadataOutput, jcsBytes(metadata));
console.log(`Created ${manifestOutput}`);
console.log(`Created ${metadataOutput}`);
console.log(`Source commit: ${sourceCommit}`);
console.log(`Manifest SHA-256: ${prepared.sha256}`);
console.log(`Resource count: ${sourceSet.resources.length}`);
console.log("These files are an unsigned review candidate. Commit them without changing any source byte, then give the reviewer the candidate commit and manifest hash.");
