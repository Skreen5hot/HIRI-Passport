import { readFileSync } from "node:fs";
import Ajv2020 from "ajv/dist/2020.js";
import { validateDisclosureRequest } from "../src/core/disclosure-request.mjs";
import { validatePortfolioPlaintext } from "../src/core/portfolio-records.mjs";
import { validatePresentationPackage } from "../src/core/presentation-package.mjs";
import { validatePresentation } from "../src/core/presentation.mjs";
import { parseStrictJson } from "../src/sdk/strict-json.mjs";
import { inspectSchema, loadSourceSet, sha256, TRACEABILITY_PATH, VECTOR_PATH } from "./lib/rhp-resource-kit.mjs";

const sourceSet = loadSourceSet();
const traceability = readFileSync(TRACEABILITY_PATH, "utf8");
for (const entry of sourceSet.resources) {
  if (!traceability.includes(entry.id) || !traceability.includes(entry.specification)) {
    throw new Error(`traceability is missing the exact identifier or specification mapping for ${entry.id}`);
  }
}

const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false, unicodeRegExp: true });
for (const resource of sourceSet.resources.filter(resource => resource.kind === "schema")) ajv.addSchema(resource.value);
const vectors = JSON.parse(readFileSync(VECTOR_PATH, "utf8"));
if (vectors.schema !== "hiri:rhp-project-test-vectors:v1" || !Array.isArray(vectors.positive) || !Array.isArray(vectors.negative)) {
  throw new Error("project vector file has an invalid root");
}
const positiveDefinitions = new Map(vectors.positive.map(vector => [vector.id, vector]));
const resourceById = new Map(sourceSet.resources.map(resource => [resource.id, resource]));
const resolveValue = value => {
  if (Array.isArray(value)) return value.map(resolveValue);
  if (!value || typeof value !== "object") return value;
  if (Object.keys(value).length === 1 && typeof value.$resource === "string") return structuredClone(resourceById.get(value.$resource)?.value);
  if (Object.keys(value).length === 1 && typeof value.$vector === "string") return resolveValue(positiveDefinitions.get(value.$vector)?.value);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, resolveValue(child)]));
};
const positives = new Map();
const vectorIds = new Set();
for (const vector of vectors.positive) {
  if (typeof vector.id !== "string" || vectorIds.has(vector.id) || !Array.isArray(vector.requirements) || vector.requirements.length < 1) throw new Error(`invalid positive vector: ${String(vector.id)}`);
  vectorIds.add(vector.id);
  const validate = ajv.getSchema(vector.schemaId);
  const value = resolveValue(vector.value);
  if (!validate || !validate(value)) throw new Error(`positive vector failed: ${vector.id}: ${ajv.errorsText(validate?.errors)}`);
  positives.set(vector.id, value);
}
const request = positives.get("PV-REQUEST-001");
validateDisclosureRequest(request, "2026-07-21T12:05:00Z");
validatePresentation(positives.get("PV-PRESENTATION-001"), request, {}, { now: "2026-07-21T12:02:00Z" });
validatePresentationPackage(positives.get("PV-PACKAGE-001"));
validatePortfolioPlaintext(positives.get("PV-PORTFOLIO-001"), positives.get("PV-PORTFOLIO-001").holderAuthority);

function mutate(base, mutation) {
  const copy = structuredClone(base);
  if (mutation.operation === "duplicateRequestItem") { copy.selfAssertionRequests.push(structuredClone(copy.selfAssertionRequests[0])); return copy; }
  if (mutation.operation === "addIssuerCredentialRequest") {
    copy.credentialRequests.push({ requestItemId: "QEFCQ0RFRkdISUpLTE1OTw", schema: "https://hiri-protocol.org/resources/preview/rhp-2026-07/schemas/unaccepted-issuer-claim/v1", schemaHash: "sha256:233e949487f50ec603aad55fdd1c579e0aa6f978d79cc7892828106c4b727f37", credentialType: "IssuerCredential", acceptedDisclosureModes: ["public"], required: false, purpose: "Exercise the disabled issuer request path", fields: [{ path: "/claims/value", required: true, purpose: "Exercise the disabled path" }] });
    return copy;
  }
  const tokens = mutation.pointer.split("/").slice(1).map(token => token.replaceAll("~1", "/").replaceAll("~0", "~"));
  let target = copy;
  if (mutation.operation === "append") {
    for (const token of tokens) target = target[Array.isArray(target) ? Number(token) : token];
    target.push(structuredClone(mutation.value));
    return copy;
  }
  for (const token of tokens.slice(0, -1)) target = target[Array.isArray(target) ? Number(token) : token];
  const key = tokens.at(-1);
  target[Array.isArray(target) ? Number(key) : key] = structuredClone(mutation.value);
  return copy;
}
function mustThrow(id, operation) { let threw = false; try { operation(); } catch { threw = true; } if (!threw) throw new Error(`${id} unexpectedly succeeded`); }
for (const vector of vectors.negative) {
  if (vectorIds.has(vector.id) || !Array.isArray(vector.requirements) || vector.requirements.length < 1) throw new Error(`invalid adversarial vector: ${String(vector.id)}`);
  vectorIds.add(vector.id);
  if (vector.baseVectorId) {
    const definition = positiveDefinitions.get(vector.baseVectorId);
    const base = positives.get(vector.baseVectorId);
    const value = mutate(base, vector.mutation);
    if (vector.mustFail.includes("schema") && ajv.getSchema(definition.schemaId)(value)) throw new Error(`${vector.id} unexpectedly passed schema validation`);
    if (vector.mustFail.includes("core")) mustThrow(vector.id, () => {
      if (base.type === "DisclosureRequest") validateDisclosureRequest(value, "2026-07-21T12:05:00Z");
      else validatePresentation(value, request, {}, { now: "2026-07-21T12:02:00Z" });
    });
  } else if (vector.rawJson) mustThrow(vector.id, () => parseStrictJson(vector.rawJson));
  else if (vector.generator.kind === "nestedArray") {
    let value = 0; for (let index = 0; index < vector.generator.depth; index += 1) value = [value];
    mustThrow(vector.id, () => parseStrictJson(JSON.stringify(value), { maximumDepth: 64 }));
  } else if (vector.generator.kind === "string") {
    mustThrow(vector.id, () => parseStrictJson(JSON.stringify("a".repeat(vector.generator.utf8Bytes)), { maximumBytes: 2 * 1024 * 1024, maximumStringLength: 1024 * 1024 }));
  } else if (vector.generator.kind === "resourceByteSubstitution") {
    const bytes = new Uint8Array(sourceSet.resources[0].bytes); bytes[0] ^= 1;
    if (sha256(bytes) === sourceSet.resources[0].sha256) throw new Error(`${vector.id} did not change the digest`);
  } else if (vector.generator.kind === "externalSchemaReference") {
    const schema = structuredClone(sourceSet.resources.find(resource => resource.kind === "schema").value);
    schema.$ref = "https://hiri-protocol.org/resources/preview/rhp-2026-07/schemas/external/v1";
    mustThrow(vector.id, () => inspectSchema(schema, schema.$id));
  }
}

console.log(`RHP resource source preflight passed: ${sourceSet.resources.length} resources, ${vectors.positive.length} positive vectors, ${vectors.negative.length} adversarial vectors.`);
console.log(`Descriptor SHA-256: ${sha256(sourceSet.descriptorBytes)}`);
console.log(`Vector SHA-256: ${sha256(readFileSync(VECTOR_PATH))}`);
