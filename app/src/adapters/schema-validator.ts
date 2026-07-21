import { bytesEqual, jcsBytes } from "../../../src/core/canonical.mjs";
import { parseAbsoluteUri, parseSha256Identifier } from "../../../src/core/scalars.mjs";

export const JSON_SCHEMA_2020_12 = "https://json-schema.org/draft/2020-12/schema" as const;

export type SchemaValidationLimits = Readonly<{
  maximumBytes?: number;
  maximumDepth?: number;
  maximumStringLength?: number;
  maximumNodes?: number;
  maximumArrayLength?: number;
  maximumObjectMembers?: number;
}>;

export type CompiledDraft202012Validator = Readonly<{
  id: string;
  sha256: string;
  schemaBytes: Uint8Array;
  validate(value: unknown): boolean;
}>;

export type Draft202012SchemaValidator = Readonly<{
  has(id: string, sha256: string): boolean;
  validate(value: unknown, schema: unknown): boolean;
}>;

export type SchemaInspectionErrorCode =
  | "RHP_SCHEMA_INVALID"
  | "RHP_SCHEMA_OPEN_SHAPE"
  | "RHP_SCHEMA_REFERENCE_PROHIBITED"
  | "RHP_SCHEMA_FORMAT_UNAVAILABLE"
  | "RHP_SCHEMA_LIMIT_EXCEEDED";

const SAFE_MESSAGES = Object.freeze<Record<SchemaInspectionErrorCode, string>>({
  RHP_SCHEMA_INVALID: "The project preview schema is invalid.",
  RHP_SCHEMA_OPEN_SHAPE: "The project preview schema permits an open object shape.",
  RHP_SCHEMA_REFERENCE_PROHIBITED: "The project preview schema contains a prohibited external reference.",
  RHP_SCHEMA_FORMAT_UNAVAILABLE: "The project preview schema uses an unreviewed format assertion.",
  RHP_SCHEMA_LIMIT_EXCEEDED: "The project preview schema exceeds a processing limit."
});

export class SchemaInspectionError extends Error {
  readonly code: SchemaInspectionErrorCode;

  constructor(code: SchemaInspectionErrorCode, options?: ErrorOptions) {
    super(SAFE_MESSAGES[code], options);
    this.name = "SchemaInspectionError";
    this.code = code;
  }
}

type EffectiveLimits = Required<SchemaValidationLimits>;

const DEFAULT_LIMITS = Object.freeze({
  maximumBytes: 10 * 1024 * 1024,
  maximumDepth: 64,
  maximumStringLength: 1024 * 1024,
  maximumNodes: 100_000,
  maximumArrayLength: 10_000,
  maximumObjectMembers: 10_000
} satisfies EffectiveLimits);

function object(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

function limits(value: SchemaValidationLimits = {}): EffectiveLimits {
  const result = { ...DEFAULT_LIMITS, ...value };
  if (Object.values(result).some(item => !Number.isSafeInteger(item) || item < 1) ||
    result.maximumDepth > 128 || result.maximumBytes > 10 * 1024 * 1024 ||
    result.maximumStringLength > 1024 * 1024 || result.maximumNodes > 1_000_000 ||
    result.maximumArrayLength > 100_000 || result.maximumObjectMembers > 100_000) {
    throw new SchemaInspectionError("RHP_SCHEMA_LIMIT_EXCEEDED");
  }
  return Object.freeze(result);
}

function requireSchemaRoot(value: unknown): Record<string, unknown> {
  if (!object(value) || value.$schema !== JSON_SCHEMA_2020_12 || typeof value.$id !== "string") {
    throw new SchemaInspectionError("RHP_SCHEMA_INVALID");
  }
  try {
    parseAbsoluteUri(value.$id, { allowFragment: false });
  } catch (error) {
    throw new SchemaInspectionError("RHP_SCHEMA_INVALID", { cause: error });
  }
  return value;
}

function scanSchema(
  value: unknown,
  effective: EffectiveLimits,
  state: { nodes: number },
  root: boolean,
  depth: number
): void {
  state.nodes += 1;
  if (state.nodes > effective.maximumNodes || depth > effective.maximumDepth) {
    throw new SchemaInspectionError("RHP_SCHEMA_LIMIT_EXCEEDED");
  }
  if (typeof value === "string") {
    if ([...value].length > effective.maximumStringLength) {
      throw new SchemaInspectionError("RHP_SCHEMA_LIMIT_EXCEEDED");
    }
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    if (value.length > effective.maximumArrayLength) throw new SchemaInspectionError("RHP_SCHEMA_LIMIT_EXCEEDED");
    for (const child of value) scanSchema(child, effective, state, false, depth + 1);
    return;
  }
  if (!object(value) || Object.keys(value).length > effective.maximumObjectMembers) {
    throw new SchemaInspectionError("RHP_SCHEMA_INVALID");
  }
  if (!root && (Object.hasOwn(value, "$id") || Object.hasOwn(value, "$schema"))) {
    throw new SchemaInspectionError("RHP_SCHEMA_REFERENCE_PROHIBITED");
  }
  for (const keyword of ["$ref", "$dynamicRef", "$recursiveRef"] as const) {
    if (Object.hasOwn(value, keyword) && (typeof value[keyword] !== "string" || !value[keyword].startsWith("#"))) {
      throw new SchemaInspectionError("RHP_SCHEMA_REFERENCE_PROHIBITED");
    }
  }
  if (Object.hasOwn(value, "format")) {
    // Format semantics require separately reviewed standalone implementations.
    // Never let Ajv silently treat an unavailable format as annotation-only.
    throw new SchemaInspectionError("RHP_SCHEMA_FORMAT_UNAVAILABLE");
  }
  const describesObject = value.type === "object" || Object.hasOwn(value, "properties") ||
    Object.hasOwn(value, "patternProperties") || Object.hasOwn(value, "required") ||
    Object.hasOwn(value, "dependentRequired") || Object.hasOwn(value, "dependentSchemas");
  if (describesObject) {
    const additional = value.additionalProperties;
    const unevaluated = value.unevaluatedProperties;
    if (additional !== false && unevaluated !== false) {
      throw new SchemaInspectionError("RHP_SCHEMA_OPEN_SHAPE");
    }
    if (additional !== undefined && additional !== false) {
      throw new SchemaInspectionError("RHP_SCHEMA_OPEN_SHAPE");
    }
  }
  for (const keyword of [
    "additionalProperties", "contains", "contentSchema", "else", "if", "items", "not", "propertyNames", "then",
    "unevaluatedItems", "unevaluatedProperties"
  ] as const) {
    const child = value[keyword];
    if (child && typeof child === "object") scanSchema(child, effective, state, false, depth + 1);
  }
  for (const keyword of ["allOf", "anyOf", "oneOf", "prefixItems"] as const) {
    const children = value[keyword];
    if (Array.isArray(children)) for (const child of children) scanSchema(child, effective, state, false, depth + 1);
  }
  for (const keyword of ["$defs", "definitions", "dependentSchemas", "patternProperties", "properties"] as const) {
    const children = value[keyword];
    if (object(children)) for (const child of Object.values(children)) scanSchema(child, effective, state, false, depth + 1);
  }
}

function scanInstance(
  value: unknown,
  effective: EffectiveLimits,
  state: { nodes: number; seen: WeakSet<object> },
  depth: number
): void {
  state.nodes += 1;
  if (state.nodes > effective.maximumNodes || depth > effective.maximumDepth) {
    throw new SchemaInspectionError("RHP_SCHEMA_LIMIT_EXCEEDED");
  }
  if (typeof value === "string") {
    if ([...value].length > effective.maximumStringLength) {
      throw new SchemaInspectionError("RHP_SCHEMA_LIMIT_EXCEEDED");
    }
    return;
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new SchemaInspectionError("RHP_SCHEMA_INVALID");
    if (!["boolean", "number", "undefined"].includes(typeof value) && value !== null) {
      throw new SchemaInspectionError("RHP_SCHEMA_INVALID");
    }
    if (value === undefined) throw new SchemaInspectionError("RHP_SCHEMA_INVALID");
    return;
  }
  if (state.seen.has(value)) throw new SchemaInspectionError("RHP_SCHEMA_INVALID");
  state.seen.add(value);
  if (Array.isArray(value)) {
    if (value.length > effective.maximumArrayLength) throw new SchemaInspectionError("RHP_SCHEMA_LIMIT_EXCEEDED");
    for (const child of value) scanInstance(child, effective, state, depth + 1);
  } else {
    if (!object(value) || Object.keys(value).length > effective.maximumObjectMembers) {
      throw new SchemaInspectionError("RHP_SCHEMA_INVALID");
    }
    for (const child of Object.values(value)) scanInstance(child, effective, state, depth + 1);
  }
  state.seen.delete(value);
}

export function inspectDraft202012Schema(schema: unknown, configuredLimits: SchemaValidationLimits = {}): void {
  const effective = limits(configuredLimits);
  requireSchemaRoot(schema);
  try {
    if (jcsBytes(schema, { maxDepth: effective.maximumDepth, maxStringLength: effective.maximumStringLength }).length >
      effective.maximumBytes) throw new SchemaInspectionError("RHP_SCHEMA_LIMIT_EXCEEDED");
  } catch (error) {
    if (error instanceof SchemaInspectionError) throw error;
    throw new SchemaInspectionError("RHP_SCHEMA_INVALID", { cause: error });
  }
  scanSchema(schema, effective, { nodes: 0 }, true, 0);
}

/**
 * Composes build-time Ajv 2020-12 standalone validators. Runtime compilation
 * is intentionally absent so production CSP never needs `unsafe-eval`.
 */
export function createDraft202012SchemaValidator(
  validators: readonly CompiledDraft202012Validator[],
  configuredLimits: SchemaValidationLimits = {}
): Draft202012SchemaValidator {
  const effective = limits(configuredLimits);
  const byId = new Map<string, CompiledDraft202012Validator>();
  for (const validator of validators) {
    if (!validator || typeof validator.id !== "string" || typeof validator.validate !== "function" ||
      !(validator.schemaBytes instanceof Uint8Array)) throw new SchemaInspectionError("RHP_SCHEMA_INVALID");
    try {
      parseAbsoluteUri(validator.id, { allowFragment: false });
      parseSha256Identifier(validator.sha256);
    } catch (error) {
      throw new SchemaInspectionError("RHP_SCHEMA_INVALID", { cause: error });
    }
    if (byId.has(validator.id)) throw new SchemaInspectionError("RHP_SCHEMA_INVALID");
    let schema: unknown;
    try {
      schema = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(validator.schemaBytes)) as unknown;
    } catch (error) {
      throw new SchemaInspectionError("RHP_SCHEMA_INVALID", { cause: error });
    }
    inspectDraft202012Schema(schema, effective);
    if ((schema as Record<string, unknown>).$id !== validator.id ||
      !bytesEqual(validator.schemaBytes, jcsBytes(schema))) throw new SchemaInspectionError("RHP_SCHEMA_INVALID");
    byId.set(validator.id, Object.freeze({ ...validator, schemaBytes: new Uint8Array(validator.schemaBytes) }));
  }

  return Object.freeze({
    has: (id: string, sha256: string) => byId.get(id)?.sha256 === sha256,
    validate: (value: unknown, schema: unknown): boolean => {
      try {
        inspectDraft202012Schema(schema, effective);
        const root = schema as Record<string, unknown>;
        const validator = byId.get(root.$id as string);
        if (!validator || !bytesEqual(validator.schemaBytes, jcsBytes(schema))) return false;
        scanInstance(value, effective, { nodes: 0, seen: new WeakSet() }, 0);
        if (jcsBytes(value, { maxDepth: effective.maximumDepth, maxStringLength: effective.maximumStringLength }).length >
          effective.maximumBytes) return false;
        return validator.validate(value) === true;
      } catch {
        return false;
      }
    }
  });
}
