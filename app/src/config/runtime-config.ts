import { parseStrictJson } from "../../../src/sdk/strict-json.mjs";

export const RUNTIME_CONFIG_SCHEMA = "hiri:real-holder-preview-runtime-config:v1" as const;
export const RHP_RELEASE_ID = "real-holder-preview" as const;
export const RHP_CANONICAL_ORIGIN = "https://hiri-protocol.org" as const;

export const PREVIEW_CAPABILITIES = [
  "authority-abandonment",
  "disposable-holder-authority",
  "ephemeral-self-assertions",
  "local-clipboard-presentation-delivery",
  "local-file-presentation-delivery",
  "local-file-request-ingress",
  "local-paste-request-ingress",
  "persistent-self-assertions",
  "presentation-signing",
  "same-device-rotation"
] as const;

export type PreviewCapability = (typeof PREVIEW_CAPABILITIES)[number];

export type RuntimeConfig = Readonly<{
  schema: typeof RUNTIME_CONFIG_SCHEMA;
  releaseId: typeof RHP_RELEASE_ID;
  canonicalOrigin: typeof RHP_CANONICAL_ORIGIN;
  artifactResolverOrigins: readonly string[];
  issuerAuthoritativeCurrentHeadOrigins: readonly string[];
  remoteResourceOrigins: readonly string[];
  presentationDeliveryOrigins: readonly string[];
  resourceManifestSha256: string;
  identityAnchorSetVersion: string;
  policyVersion: string;
  supportedCapabilities: readonly PreviewCapability[];
  capabilityEvidence: Readonly<{
    sha256: string;
    notAfter: string;
  }>;
}>;

export type RuntimeConfigErrorCode =
  | "RHP_CONFIG_INVALID"
  | "RHP_CONFIG_SECRET_MEMBER"
  | "RHP_CONFIG_OPEN_CAPABILITY";

export class RuntimeConfigError extends TypeError {
  readonly code: RuntimeConfigErrorCode;

  constructor(code: RuntimeConfigErrorCode, message: string) {
    super(message);
    this.name = "RuntimeConfigError";
    this.code = code;
  }
}

export type RuntimeConfigAssessmentCode =
  | "RHP_CONFIG_MISSING"
  | "RHP_CONFIG_INVALID"
  | "RHP_CLOCK_INVALID"
  | "RHP_CAPABILITY_EVIDENCE_EXPIRED"
  | "RHP_CAPABILITY_NOT_ENABLED"
  | "RHP_CONFIG_ELIGIBLE";

type AssessmentMetadata = Readonly<{
  checkedAt: string;
  clockBasis: "caller-supplied-browser-protocol-time";
  clockTamperResistant: false;
  networkCheckPerformed: false;
}>;

export type RuntimeConfigAssessment =
  | (AssessmentMetadata & Readonly<{
      disposition: "inspect-only";
      code: Exclude<RuntimeConfigAssessmentCode, "RHP_CONFIG_ELIGIBLE">;
    }>)
  | (AssessmentMetadata & Readonly<{
      disposition: "configuration-eligible";
      code: "RHP_CONFIG_ELIGIBLE";
      config: RuntimeConfig;
    }>);

const ROOT_MEMBERS = [
  "schema",
  "releaseId",
  "canonicalOrigin",
  "artifactResolverOrigins",
  "issuerAuthoritativeCurrentHeadOrigins",
  "remoteResourceOrigins",
  "presentationDeliveryOrigins",
  "resourceManifestSha256",
  "identityAnchorSetVersion",
  "policyVersion",
  "supportedCapabilities",
  "capabilityEvidence"
] as const;
const EVIDENCE_MEMBERS = ["sha256", "notAfter"] as const;
const HASH = /^sha256:([0-9a-f]{64})$/u;
const VERSION = /^[a-z0-9](?:[a-z0-9._-]{0,127})$/u;
const UTC_SECONDS = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/u;
const PLACEHOLDER_VERSION = /(?:change|example|placeholder|replace|sample|synthetic|tbd|test|todo)/iu;
const SECRET_MEMBER = /(?:authorization|client.?secret|cookie|credential|password|private.?key|session|token)/iu;

function invalid(message: string): never {
  throw new RuntimeConfigError("RHP_CONFIG_INVALID", message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function closedRecord(
  value: unknown,
  allowed: readonly string[],
  label: string
): Record<string, unknown> {
  if (!isRecord(value)) invalid(`${label} must be a plain object`);
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) invalid(`${label} contains unknown member: ${key}`);
  }
  for (const key of allowed) {
    if (!Object.hasOwn(value, key)) invalid(`${label} is missing member: ${key}`);
  }
  return value;
}

function rejectSecretMembers(value: unknown, seen = new WeakSet<object>()): void {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) invalid("runtime configuration must be an acyclic JSON value");
  seen.add(value);
  if (Array.isArray(value)) {
    for (const child of value) rejectSecretMembers(child, seen);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_MEMBER.test(key)) {
      throw new RuntimeConfigError(
        "RHP_CONFIG_SECRET_MEMBER",
        `runtime configuration contains a prohibited secret-bearing member: ${key}`
      );
    }
    rejectSecretMembers(child, seen);
  }
}

function exactString(value: unknown, expected: string, label: string): string {
  if (value !== expected) invalid(`${label} must be ${expected}`);
  return expected;
}

function version(value: unknown, label: string): string {
  if (typeof value !== "string" || !VERSION.test(value) || PLACEHOLDER_VERSION.test(value)) {
    invalid(`${label} must be a non-placeholder immutable version identifier`);
  }
  return value;
}

function sha256(value: unknown, label: string): string {
  if (typeof value !== "string") invalid(`${label} must be a SHA-256 identifier`);
  const match = HASH.exec(value);
  if (!match || /^(.)\1{63}$/u.test(match[1])) {
    invalid(`${label} must be sha256: followed by 64 non-placeholder lowercase hexadecimal digits`);
  }
  return value;
}

function protocolTimestamp(value: unknown, label: string): number {
  if (typeof value !== "string") invalid(`${label} must use YYYY-MM-DDTHH:mm:ssZ`);
  const match = UTC_SECONDS.exec(value);
  if (!match) invalid(`${label} must use YYYY-MM-DDTHH:mm:ssZ`);
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number);
  const milliseconds = Date.UTC(year, month - 1, day, hour, minute, second);
  const canonical = new Date(milliseconds).toISOString().replace(".000Z", "Z");
  if (!Number.isFinite(milliseconds) || canonical !== value) invalid(`${label} is not a valid protocol timestamp`);
  return milliseconds;
}

function exactHttpsOrigin(value: unknown, label: string): string {
  if (typeof value !== "string") invalid(`${label} must be an exact HTTPS origin`);
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    invalid(`${label} must be an exact HTTPS origin`);
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.origin !== value ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    parsed.hostname.includes("*") ||
    /(?:^|\.)(?:example|invalid|localhost|test)$/iu.test(parsed.hostname) ||
    /(?:placeholder|synthetic)/iu.test(parsed.hostname) ||
    /^\[?[\da-f:.]+\]?$/iu.test(parsed.hostname)
  ) invalid(`${label} must be an exact non-placeholder HTTPS origin without credentials, path, or alternate port`);
  return value;
}

function emptyOriginSet(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value)) invalid(`${label} must be an array`);
  for (const item of value) exactHttpsOrigin(item, `${label} entry`);
  if (value.length > 0) {
    throw new RuntimeConfigError(
      "RHP_CONFIG_OPEN_CAPABILITY",
      `${label} must remain empty under RHP-DR-002 D2-A`
    );
  }
  return Object.freeze([] as string[]);
}

function capabilitySet(value: unknown): readonly PreviewCapability[] {
  if (!Array.isArray(value)) invalid("supportedCapabilities must be an array");
  const result: PreviewCapability[] = [];
  for (const item of value) {
    if (typeof item !== "string" || !(PREVIEW_CAPABILITIES as readonly string[]).includes(item)) {
      throw new RuntimeConfigError(
        "RHP_CONFIG_OPEN_CAPABILITY",
        `supportedCapabilities contains an unavailable or open capability: ${String(item)}`
      );
    }
    result.push(item as PreviewCapability);
  }
  if (new Set(result).size !== result.length) invalid("supportedCapabilities contains a duplicate");
  const sorted = [...result].sort();
  if (sorted.some((item, index) => item !== result[index])) {
    invalid("supportedCapabilities must use deterministic lexical order");
  }
  return Object.freeze(result);
}

export function parseRuntimeConfig(value: unknown): RuntimeConfig {
  rejectSecretMembers(value);
  const root = closedRecord(value, ROOT_MEMBERS, "runtime configuration");
  const evidence = closedRecord(root.capabilityEvidence, EVIDENCE_MEMBERS, "capabilityEvidence");
  const canonicalOrigin = exactHttpsOrigin(root.canonicalOrigin, "canonicalOrigin");
  exactString(canonicalOrigin, RHP_CANONICAL_ORIGIN, "canonicalOrigin");

  return Object.freeze({
    schema: exactString(root.schema, RUNTIME_CONFIG_SCHEMA, "schema") as typeof RUNTIME_CONFIG_SCHEMA,
    releaseId: exactString(root.releaseId, RHP_RELEASE_ID, "releaseId") as typeof RHP_RELEASE_ID,
    canonicalOrigin: canonicalOrigin as typeof RHP_CANONICAL_ORIGIN,
    artifactResolverOrigins: emptyOriginSet(root.artifactResolverOrigins, "artifactResolverOrigins"),
    issuerAuthoritativeCurrentHeadOrigins: emptyOriginSet(
      root.issuerAuthoritativeCurrentHeadOrigins,
      "issuerAuthoritativeCurrentHeadOrigins"
    ),
    remoteResourceOrigins: emptyOriginSet(root.remoteResourceOrigins, "remoteResourceOrigins"),
    presentationDeliveryOrigins: emptyOriginSet(
      root.presentationDeliveryOrigins,
      "presentationDeliveryOrigins"
    ),
    resourceManifestSha256: sha256(root.resourceManifestSha256, "resourceManifestSha256"),
    identityAnchorSetVersion: version(root.identityAnchorSetVersion, "identityAnchorSetVersion"),
    policyVersion: version(root.policyVersion, "policyVersion"),
    supportedCapabilities: capabilitySet(root.supportedCapabilities),
    capabilityEvidence: Object.freeze({
      sha256: sha256(evidence.sha256, "capabilityEvidence.sha256"),
      notAfter: typeof evidence.notAfter === "string" && protocolTimestamp(evidence.notAfter, "capabilityEvidence.notAfter") >= 0
        ? evidence.notAfter
        : invalid("capabilityEvidence.notAfter is invalid")
    })
  });
}

export function parseRuntimeConfigJson(text: string): RuntimeConfig {
  const value = parseStrictJson(text, {
    maximumBytes: 32 * 1024,
    maximumDepth: 8,
    maximumStringLength: 2 * 1024
  });
  return parseRuntimeConfig(value);
}

function metadata(checkedAt: string): AssessmentMetadata {
  return Object.freeze({
    checkedAt,
    clockBasis: "caller-supplied-browser-protocol-time",
    clockTamperResistant: false,
    networkCheckPerformed: false
  });
}

function inspectOnly(code: Exclude<RuntimeConfigAssessmentCode, "RHP_CONFIG_ELIGIBLE">, checkedAt: string): RuntimeConfigAssessment {
  return Object.freeze({ disposition: "inspect-only", code, ...metadata(checkedAt) });
}

/**
 * Evaluates only the packaged-configuration precondition. "configuration-eligible"
 * is not release authorization: origin, resource, browser, artifact, and operation
 * gates must still pass. The caller supplies protocol time explicitly; a browser
 * clock is a correctness input and is not represented as tamper-resistant.
 */
export function assessRuntimeConfig(
  value: unknown,
  options: Readonly<{ now: string; capability?: string }>
): RuntimeConfigAssessment {
  let now: number;
  try {
    now = protocolTimestamp(options.now, "now");
  } catch {
    return inspectOnly("RHP_CLOCK_INVALID", typeof options.now === "string" ? options.now : "");
  }
  if (value === undefined || value === null) return inspectOnly("RHP_CONFIG_MISSING", options.now);

  let config: RuntimeConfig;
  try {
    config = parseRuntimeConfig(value);
  } catch {
    return inspectOnly("RHP_CONFIG_INVALID", options.now);
  }

  if (now >= protocolTimestamp(config.capabilityEvidence.notAfter, "capabilityEvidence.notAfter")) {
    return inspectOnly("RHP_CAPABILITY_EVIDENCE_EXPIRED", options.now);
  }

  if (
    (options.capability !== undefined && !config.supportedCapabilities.includes(options.capability as PreviewCapability)) ||
    (options.capability === undefined && config.supportedCapabilities.length === 0)
  ) return inspectOnly("RHP_CAPABILITY_NOT_ENABLED", options.now);

  return Object.freeze({
    disposition: "configuration-eligible",
    code: "RHP_CONFIG_ELIGIBLE",
    config,
    ...metadata(options.now)
  });
}
