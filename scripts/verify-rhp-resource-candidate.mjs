import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { jcsBytes } from "../src/core/canonical.mjs";
import { validateDisclosureRequest } from "../src/core/disclosure-request.mjs";
import { validatePortfolioPlaintext } from "../src/core/portfolio-records.mjs";
import { validatePresentationPackage } from "../src/core/presentation-package.mjs";
import { validatePresentation } from "../src/core/presentation.mjs";
import { parseStrictJson } from "../src/sdk/strict-json.mjs";

const ROOT = "resources/preview/rhp-2026-07";
const DESCRIPTOR_PATH = `${ROOT}/resource-set.json`;
const MANIFEST_PATH = `${ROOT}/resource-manifest.json`;
const METADATA_PATH = `${ROOT}/candidate-metadata.json`;
const VECTOR_PATH = `${ROOT}/vectors/project-vectors-v1.json`;
const TRACEABILITY_PATH = "docs/rhp/independent-resource-review/REQUIREMENT-TRACEABILITY.md";
const NAMESPACE = "https://hiri-protocol.org/resources/preview/rhp-2026-07/";
const APPROVAL = "RHP-RESOURCE-APPROVAL-RHP-2026-07-1";
const PROHIBITED = /(?:\b(?:placeholder|replace[-_ ]?me|synthetic|tbd|todo)\b|hiri\.example|(?:^|\.)example\.(?:com|net|org)(?:\/|$)|\.(?:invalid|test)(?:\/|$)|localhost)/iu;

function usage(message) {
  if (message) console.error(message);
  console.error("Usage: node scripts/verify-rhp-resource-candidate.mjs --candidate-commit <full commit> --manifest-hash <sha256:...> [--report <path>] [--force]");
  process.exit(2);
}

function argumentsOf(values) {
  const result = { report: "review-output/rhp-resource-verification-report.json", force: false };
  for (let index = 0; index < values.length; index += 1) {
    const name = values[index];
    if (name === "--force") { result.force = true; continue; }
    if (!["--candidate-commit", "--manifest-hash", "--report"].includes(name)) usage(`Unknown argument: ${name}`);
    const value = values[index + 1];
    if (!value || value.startsWith("--")) usage(`Missing value for ${name}`);
    result[name.slice(2).replace(/-([a-z])/gu, (_match, letter) => letter.toUpperCase())] = value;
    index += 1;
  }
  if (!result.candidateCommit || !result.manifestHash) usage("--candidate-commit and --manifest-hash are required");
  return result;
}

function git(args, encoding = "utf8") {
  try {
    return execFileSync("git", args, { encoding, maxBuffer: 32 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`git ${args.join(" ")} failed: ${error.stderr?.toString().trim() || error.message}`);
  }
}

function digest(bytes) { return `sha256:${createHash("sha256").update(bytes).digest("hex")}`; }
function same(left, right) { return Buffer.from(left).equals(Buffer.from(right)); }
function exactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).sort().join("\0") !== [...expected].sort().join("\0")) {
    throw new Error(`${label} has an unexpected or missing member`);
  }
}
function strictJson(bytes, label, canonical = false) {
  const value = parseStrictJson(new TextDecoder("utf-8", { fatal: true }).decode(bytes), {
    maximumBytes: 2 * 1024 * 1024,
    maximumDepth: 64,
    maximumStringLength: 1024 * 1024
  });
  if (canonical && !same(bytes, jcsBytes(value))) throw new Error(`${label} is not exact JCS bytes`);
  return value;
}

function inspectSchemaIndependently(schema, id) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema) || schema.$schema !== "https://json-schema.org/draft/2020-12/schema" || schema.$id !== id) {
    throw new Error(`invalid Draft 2020-12 schema identity: ${id}`);
  }
  let count = 0;
  const walk = (node, root = false, depth = 0) => {
    count += 1;
    if (count > 100000 || depth > 64) throw new Error(`schema inspection limit exceeded: ${id}`);
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { for (const child of node) walk(child, false, depth + 1); return; }
    if (!root && (Object.hasOwn(node, "$id") || Object.hasOwn(node, "$schema"))) throw new Error(`nested schema identity is prohibited: ${id}`);
    for (const key of ["$ref", "$dynamicRef", "$recursiveRef"]) {
      if (Object.hasOwn(node, key) && (typeof node[key] !== "string" || !node[key].startsWith("#"))) throw new Error(`external reference is prohibited: ${id}`);
    }
    if (Object.hasOwn(node, "format")) throw new Error(`unreviewed format assertion is prohibited: ${id}`);
    const objectShape = node.type === "object" || Object.hasOwn(node, "properties") || Object.hasOwn(node, "patternProperties") || Object.hasOwn(node, "required");
    if (objectShape && node.additionalProperties !== false && node.unevaluatedProperties !== false) throw new Error(`open object shape is prohibited: ${id}`);
    for (const key of ["additionalProperties", "contains", "contentSchema", "else", "if", "items", "not", "propertyNames", "then", "unevaluatedItems", "unevaluatedProperties"]) {
      if (node[key] && typeof node[key] === "object") walk(node[key], false, depth + 1);
    }
    for (const key of ["allOf", "anyOf", "oneOf", "prefixItems"]) if (Array.isArray(node[key])) for (const child of node[key]) walk(child, false, depth + 1);
    for (const key of ["$defs", "definitions", "dependentSchemas", "patternProperties", "properties"]) {
      if (node[key] && typeof node[key] === "object" && !Array.isArray(node[key])) for (const child of Object.values(node[key])) walk(child, false, depth + 1);
    }
  };
  walk(schema, true, 0);
}

function scanResourceIndependently(value, label, depth = 0) {
  if (depth > 64) throw new Error(`resource depth exceeded: ${label}`);
  if (typeof value === "string") { if (PROHIBITED.test(value)) throw new Error(`prohibited draft/demo material: ${label}`); return; }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (PROHIBITED.test(key)) throw new Error(`prohibited resource member: ${label}`);
    if (["$ref", "$dynamicRef", "$recursiveRef"].includes(key) && (typeof child !== "string" || !child.startsWith("#"))) throw new Error(`external reference: ${label}`);
    if (key === "@import" || (key === "@context" && typeof child === "string")) throw new Error(`remote JSON-LD dependency: ${label}`);
    scanResourceIndependently(child, label, depth + 1);
  }
}

function replaceAtPointer(value, pointer, operation, replacement) {
  const copy = structuredClone(value);
  const tokens = pointer.split("/").slice(1).map(token => token.replaceAll("~1", "/").replaceAll("~0", "~"));
  let target = copy;
  if (operation === "append") {
    for (const token of tokens) target = target[Array.isArray(target) ? Number(token) : token];
    target.push(structuredClone(replacement));
    return copy;
  }
  for (const token of tokens.slice(0, -1)) target = target[Array.isArray(target) ? Number(token) : token];
  const key = tokens.at(-1);
  target[Array.isArray(target) ? Number(key) : key] = structuredClone(replacement);
  return copy;
}

function mutated(base, mutation) {
  if (["add", "replace", "append"].includes(mutation.operation)) return replaceAtPointer(base, mutation.pointer, mutation.operation, mutation.value);
  const copy = structuredClone(base);
  if (mutation.operation === "duplicateRequestItem") {
    copy.selfAssertionRequests.push(structuredClone(copy.selfAssertionRequests[0]));
    return copy;
  }
  if (mutation.operation === "addIssuerCredentialRequest") {
    copy.credentialRequests.push({
      requestItemId: "QEFCQ0RFRkdISUpLTE1OTw",
      schema: "https://hiri-protocol.org/resources/preview/rhp-2026-07/schemas/unaccepted-issuer-claim/v1",
      schemaHash: "sha256:233e949487f50ec603aad55fdd1c579e0aa6f978d79cc7892828106c4b727f37",
      credentialType: "IssuerCredential",
      acceptedDisclosureModes: ["public"],
      required: false,
      purpose: "Exercise the disabled issuer request path",
      fields: [{ path: "/claims/value", required: true, purpose: "Exercise the disabled path" }]
    });
    return copy;
  }
  throw new Error(`unsupported vector mutation: ${mutation.operation}`);
}

const options = argumentsOf(process.argv.slice(2));
if (!/^sha256:[0-9a-f]{64}$/u.test(options.manifestHash) || /^sha256:(.)\1{63}$/u.test(options.manifestHash)) usage("--manifest-hash is invalid");
const candidateCommit = git(["rev-parse", "--verify", `${options.candidateCommit}^{commit}`]).trim();
if (candidateCommit !== options.candidateCommit) throw new Error(`--candidate-commit must be the full identifier: ${candidateCommit}`);
if (git(["rev-parse", "HEAD"]).trim() !== candidateCommit) throw new Error("review must run with HEAD checked out at the exact candidate commit");
if (git(["status", "--porcelain", "--untracked-files=no"]).trim()) throw new Error("tracked worktree changes exist; review only a clean candidate checkout");
const readCandidate = path => git(["show", `${candidateCommit}:${path}`], null);
const checks = [];
const pass = (id, detail) => checks.push({ detail, id, result: "pass" });

const metadataBytes = readCandidate(METADATA_PATH);
const metadata = strictJson(metadataBytes, "candidate metadata", true);
exactKeys(metadata, ["approvalRecord", "authoringAssistance", "candidateReady", "classification", "createdAt", "generator", "independentVerifier", "manifest", "releaseId", "resourceSetDescriptor", "responsibleAuthor", "schema", "sourceCommit", "traceability", "vectors"], "candidate metadata");
if (metadata.schema !== "hiri:rhp-resource-candidate-metadata:v1" || metadata.classification !== "resource review candidate" || metadata.candidateReady !== false ||
  metadata.releaseId !== "real-holder-preview" || metadata.approvalRecord !== APPROVAL || typeof metadata.responsibleAuthor?.name !== "string" ||
  metadata.responsibleAuthor.name.trim().length < 2 || typeof metadata.responsibleAuthor?.contact !== "string" || metadata.responsibleAuthor.contact.trim().length < 3) {
  throw new Error("candidate metadata fixed values or responsible author are invalid");
}
pass("CHECK-01-CANDIDATE-IDENTITY", `candidate ${candidateCommit} names responsible author ${metadata.responsibleAuthor.name}`);

const sourceCommit = git(["rev-parse", "--verify", `${metadata.sourceCommit}^{commit}`]).trim();
try { git(["merge-base", "--is-ancestor", sourceCommit, candidateCommit]); } catch { throw new Error("sourceCommit is not an ancestor of candidateCommit"); }
const readSource = path => git(["show", `${sourceCommit}:${path}`], null);
pass("CHECK-02-SOURCE-ANCESTRY", `source ${sourceCommit} is an ancestor of the candidate`);

const descriptorBytes = readCandidate(DESCRIPTOR_PATH);
const descriptor = strictJson(descriptorBytes, "resource-set descriptor", false);
exactKeys(descriptor, ["approvalRecord", "generationScriptVersion", "manifestVersion", "namespace", "releaseId", "resources", "schema"], "resource-set descriptor");
if (descriptor.schema !== "hiri:rhp-resource-source-set:v1" || descriptor.namespace !== NAMESPACE || descriptor.releaseId !== "real-holder-preview" ||
  descriptor.approvalRecord !== APPROVAL || descriptor.generationScriptVersion !== "rhp-resource-kit-1" || !/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(descriptor.manifestVersion) ||
  !Array.isArray(descriptor.resources) || descriptor.resources.length < 1 || descriptor.resources.length > 128) throw new Error("invalid resource-set descriptor");
if (!same(descriptorBytes, readSource(DESCRIPTOR_PATH)) || digest(descriptorBytes) !== metadata.resourceSetDescriptor.sha256) throw new Error("resource-set descriptor differs from source or metadata digest");
pass("CHECK-03-DESCRIPTOR", `descriptor binds ${descriptor.resources.length} ordered resources`);

const manifestBytes = readCandidate(MANIFEST_PATH);
if (manifestBytes.length > 256 * 1024) throw new Error("resource manifest exceeds its byte limit");
if (digest(manifestBytes) !== options.manifestHash || metadata.manifest.sha256 !== options.manifestHash) throw new Error("manifest hash does not match the command, bytes, and metadata");
const manifest = strictJson(manifestBytes, "resource manifest", true);
exactKeys(manifest, ["approvalRecord", "candidateReady", "classification", "createdAt", "generationScriptVersion", "manifestVersion", "releaseId", "resourceCount", "resources", "schema", "sourceCommit"], "resource manifest");
if (manifest.schema !== "hiri-passport/project-preview-resource-manifest/1" || manifest.classification !== "project preview resource" || manifest.candidateReady !== false ||
  manifest.releaseId !== "real-holder-preview" || manifest.approvalRecord !== APPROVAL || manifest.sourceCommit !== sourceCommit ||
  manifest.manifestVersion !== descriptor.manifestVersion || manifest.generationScriptVersion !== descriptor.generationScriptVersion || manifest.createdAt !== metadata.createdAt ||
  metadata.manifest?.path !== MANIFEST_PATH || metadata.manifest?.resourceCount !== descriptor.resources.length ||
  !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(manifest.createdAt) || new Date(manifest.createdAt).toISOString().replace(".000Z", "Z") !== manifest.createdAt ||
  manifest.resourceCount !== descriptor.resources.length || !Array.isArray(manifest.resources) || manifest.resources.length !== manifest.resourceCount) throw new Error("resource manifest fixed values are invalid");
pass("CHECK-04-MANIFEST", `manifest ${options.manifestHash} is exact JCS and remains candidateReady false`);

const seenIds = new Set();
const seenPaths = new Set();
const resources = [];
let totalPackageBytes = manifestBytes.length;
for (let index = 0; index < descriptor.resources.length; index += 1) {
  const source = descriptor.resources[index];
  const entry = manifest.resources[index];
  exactKeys(source, ["bytesPath", "canonicalization", "id", "kind", "mediaType", "specification", "version"], `descriptor resource ${index}`);
  exactKeys(entry, ["approvalRecord", "bytesPath", "canonicalization", "id", "kind", "mediaType", "sha256", "specification", "version"], `manifest resource ${index}`);
  if (source.id !== entry.id || source.bytesPath !== entry.bytesPath || source.kind !== entry.kind || source.version !== entry.version ||
    source.canonicalization !== entry.canonicalization || source.mediaType !== entry.mediaType || source.specification !== entry.specification ||
    entry.approvalRecord !== APPROVAL || !entry.id.startsWith(NAMESPACE) || !["configuration", "context", "policy", "profile", "schema"].includes(entry.kind) ||
    !["application/json", "application/schema+json", "text/plain"].includes(entry.mediaType) || !/^[a-z0-9][a-z0-9._-]{0,127}$/u.test(entry.version) ||
    !entry.bytesPath.startsWith(`${ROOT}/`) || entry.canonicalization !== "JCS" || seenIds.has(entry.id) || seenPaths.has(entry.bytesPath)) {
    throw new Error(`descriptor/manifest mismatch or duplicate: ${entry.id}`);
  }
  seenIds.add(entry.id); seenPaths.add(entry.bytesPath);
  const candidateBytes = readCandidate(entry.bytesPath);
  totalPackageBytes += candidateBytes.length;
  if (candidateBytes.length > 2 * 1024 * 1024 || totalPackageBytes > 10 * 1024 * 1024) throw new Error(`resource package limit exceeded: ${entry.id}`);
  const sourceBytes = readSource(entry.bytesPath);
  if (!same(candidateBytes, sourceBytes)) throw new Error(`resource changed after source commit: ${entry.id}`);
  if (digest(candidateBytes) !== entry.sha256) throw new Error(`resource digest mismatch: ${entry.id}`);
  const value = strictJson(candidateBytes, entry.id, true);
  scanResourceIndependently(value, entry.id);
  if (entry.kind === "schema") inspectSchemaIndependently(value, entry.id);
  resources.push({ ...entry, bytes: candidateBytes, value });
}
const sortedIds = [...seenIds].sort();
if (sortedIds.some((id, index) => id !== manifest.resources[index].id)) throw new Error("manifest resource order is not deterministic");
const packagedKinds = new Set(resources.map(resource => resource.kind));
if (!["configuration", "context", "schema"].every(kind => packagedKinds.has(kind))) throw new Error("required resource kinds are absent");
pass("CHECK-05-RESOURCE-BYTES", `${resources.length} candidate resources equal source bytes and match manifest digests`);
pass("CHECK-06-RESOURCE-SAFETY", "all JSON is JCS, schemas are closed Draft 2020-12, and remote references/draft material are absent");

for (const binding of [
  [metadata.vectors, VECTOR_PATH], [metadata.traceability, TRACEABILITY_PATH],
  [metadata.generator, "scripts/prepare-rhp-resource-candidate.mjs"], [metadata.independentVerifier, "scripts/verify-rhp-resource-candidate.mjs"]
]) {
  if (binding[0].path !== binding[1] || digest(readCandidate(binding[1])) !== binding[0].sha256 || !same(readCandidate(binding[1]), readSource(binding[1]))) {
    throw new Error(`candidate evidence binding failed: ${binding[1]}`);
  }
}
const traceability = readCandidate(TRACEABILITY_PATH).toString("utf8");
for (const resource of resources) if (!traceability.includes(resource.id) || !traceability.includes(resource.specification)) throw new Error(`traceability does not map ${resource.id}`);
pass("CHECK-07-EVIDENCE-BINDING", "vectors, traceability, generator, and independent verifier equal source bytes and match metadata digests");

const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false, unicodeRegExp: true });
for (const resource of resources.filter(resource => resource.kind === "schema")) ajv.addSchema(resource.value);
for (const resource of resources.filter(resource => resource.kind === "schema")) if (typeof ajv.getSchema(resource.id) !== "function") throw new Error(`Ajv did not compile ${resource.id}`);
pass("CHECK-08-SCHEMA-COMPILATION", `${resources.filter(resource => resource.kind === "schema").length} schemas independently compiled with Ajv Draft 2020-12`);

const vectors = strictJson(readCandidate(VECTOR_PATH), "project vectors", false);
if (vectors.schema !== "hiri:rhp-project-test-vectors:v1" || vectors.classification !== "project test vector" || !Array.isArray(vectors.positive) || !Array.isArray(vectors.negative)) throw new Error("invalid project vector root");
const positives = new Map(vectors.positive.map(vector => [vector.id, vector]));
const resourceById = new Map(resources.map(resource => [resource.id, resource]));
const resolveValue = value => {
  if (Array.isArray(value)) return value.map(resolveValue);
  if (!value || typeof value !== "object") return value;
  if (Object.keys(value).length === 1 && typeof value.$resource === "string") {
    const resource = resourceById.get(value.$resource); if (!resource) throw new Error(`vector resource is absent: ${value.$resource}`); return structuredClone(resource.value);
  }
  if (Object.keys(value).length === 1 && typeof value.$vector === "string") {
    const vector = positives.get(value.$vector); if (!vector) throw new Error(`referenced vector is absent: ${value.$vector}`); return resolveValue(vector.value);
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, resolveValue(child)]));
};
const materialized = new Map();
for (const vector of vectors.positive) {
  if (materialized.has(vector.id) || !Array.isArray(vector.requirements) || vector.requirements.length < 1) throw new Error(`invalid positive vector: ${vector.id}`);
  const validate = ajv.getSchema(vector.schemaId);
  if (!validate) throw new Error(`positive vector schema is absent: ${vector.id}`);
  const value = resolveValue(vector.value);
  if (!validate(value)) throw new Error(`positive vector failed schema validation: ${vector.id}: ${ajv.errorsText(validate.errors)}`);
  materialized.set(vector.id, value);
}
const request = materialized.get("PV-REQUEST-001");
const presentation = materialized.get("PV-PRESENTATION-001");
validateDisclosureRequest(request, "2026-07-21T12:05:00Z");
validatePresentation(presentation, request, {}, { now: "2026-07-21T12:02:00Z" });
validatePresentationPackage(materialized.get("PV-PACKAGE-001"));
validatePortfolioPlaintext(materialized.get("PV-PORTFOLIO-001"), materialized.get("PV-PORTFOLIO-001").holderAuthority);
pass("CHECK-09-POSITIVE-VECTORS", `${vectors.positive.length} positive vectors pass schemas and composed Core validators`);

const expectFailure = (label, operation) => {
  let failed = false;
  try { operation(); } catch { failed = true; }
  if (!failed) throw new Error(`${label} unexpectedly succeeded`);
};
for (const vector of vectors.negative) {
  if (!Array.isArray(vector.mustFail) || !Array.isArray(vector.requirements) || vector.requirements.length < 1) throw new Error(`invalid adversarial vector: ${vector.id}`);
  if (vector.baseVectorId) {
    const baseVector = positives.get(vector.baseVectorId);
    const base = materialized.get(vector.baseVectorId);
    if (!baseVector || !base) throw new Error(`adversarial base is absent: ${vector.id}`);
    const value = mutated(base, vector.mutation);
    if (vector.mustFail.includes("schema")) {
      const validate = ajv.getSchema(baseVector.schemaId);
      if (validate(value)) throw new Error(`${vector.id} unexpectedly passed its schema`);
    }
    if (vector.mustFail.includes("core")) {
      expectFailure(vector.id, () => {
        if (base.type === "DisclosureRequest") validateDisclosureRequest(value, "2026-07-21T12:05:00Z");
        else if (base.type === "PassportPresentation") validatePresentation(value, request, {}, { now: "2026-07-21T12:02:00Z" });
        else throw new Error("no Core validator mapped");
      });
    }
    continue;
  }
  if (vector.mustFail.includes("strict-json") && vector.rawJson) expectFailure(vector.id, () => parseStrictJson(vector.rawJson));
  else if (vector.generator?.kind === "nestedArray") {
    let value = 0; for (let index = 0; index < vector.generator.depth; index += 1) value = [value];
    expectFailure(vector.id, () => parseStrictJson(JSON.stringify(value), { maximumDepth: 64 }));
  } else if (vector.generator?.kind === "string") {
    expectFailure(vector.id, () => parseStrictJson(JSON.stringify("a".repeat(vector.generator.utf8Bytes)), { maximumBytes: 2 * 1024 * 1024, maximumStringLength: 1024 * 1024 }));
  } else if (vector.generator?.kind === "resourceByteSubstitution") {
    const changed = Buffer.from(resources[0].bytes); changed[0] ^= 1;
    if (digest(changed) === resources[0].sha256) throw new Error(`${vector.id} substitution was not detected`);
  } else if (vector.generator?.kind === "externalSchemaReference") {
    const schema = structuredClone(resources.find(resource => resource.kind === "schema").value);
    schema.$ref = "https://hiri-protocol.org/resources/preview/rhp-2026-07/schemas/external/v1";
    expectFailure(vector.id, () => inspectSchemaIndependently(schema, schema.$id));
  } else throw new Error(`adversarial vector has no verifier: ${vector.id}`);
}
pass("CHECK-10-ADVERSARIAL-VECTORS", `${vectors.negative.length} adversarial vectors fail at every declared boundary`);

const report = {
  candidateCommit,
  checks,
  disposition: "mechanically-verified",
  manifestHash: options.manifestHash,
  productionApproved: false,
  releaseId: "real-holder-preview",
  resourceCount: resources.length,
  responsibleAuthor: metadata.responsibleAuthor,
  schema: "hiri:rhp-independent-resource-verification:v1",
  sourceCommit,
  tool: { path: "scripts/verify-rhp-resource-candidate.mjs", sha256: digest(readCandidate("scripts/verify-rhp-resource-candidate.mjs")) },
  vectorCount: { adversarial: vectors.negative.length, positive: vectors.positive.length }
};
if (existsSync(options.report) && !options.force) throw new Error(`${options.report} exists; use --force only to replace your local report for the same candidate`);
mkdirSync(dirname(options.report), { recursive: true });
const reportBytes = jcsBytes(report);
writeFileSync(options.report, reportBytes);
console.log(`Independent mechanical verification passed: ${checks.length} checks.`);
console.log(`Candidate commit: ${candidateCommit}`);
console.log(`Manifest SHA-256: ${options.manifestHash}`);
console.log(`Report: ${options.report}`);
console.log(`Report SHA-256: ${digest(reportBytes)}`);
console.log("This is not semantic approval. Complete the human checklist and create the independent review record.");
