import {
  assessRuntimeConfig,
  type RuntimeConfig,
  type RuntimeConfigAssessmentCode
} from "../config/runtime-config";

export const SENSITIVE_ORIGIN_OPERATIONS = [
  "authority-abandonment",
  "credential-import",
  "database-access",
  "key-creation",
  "local-delivery",
  "presentation-signing",
  "resolver-use",
  "same-device-rotation"
] as const;

export type SensitiveOriginOperation = (typeof SENSITIVE_ORIGIN_OPERATIONS)[number];

export type OriginContext = Readonly<{
  url: string;
  basePath: string;
  isTopLevel: boolean;
  redirectCount: number;
  migrationSourceOrigin?: string;
}>;

export type OriginPolicyInput = Readonly<{
  runtimeConfig: unknown;
  now: string;
  capability?: string;
  context: OriginContext;
  profile: "production" | "automated-test";
  automatedTest?: Readonly<{
    expectedOrigin: string;
    stateKind: "generated-non-authoritative";
  }>;
}>;

export type OriginPolicyBlockCode =
  | "RHP_ORIGIN_CONFIG_BLOCKED"
  | "RHP_ORIGIN_CONTEXT_INVALID"
  | "RHP_ORIGIN_PROJECT_PAGES_FORBIDDEN"
  | "RHP_ORIGIN_EMBEDDED_CONTEXT"
  | "RHP_ORIGIN_REDIRECT_REFUSED"
  | "RHP_ORIGIN_BASE_PATH_MISMATCH"
  | "RHP_ORIGIN_PATH_MISMATCH"
  | "RHP_ORIGIN_MISMATCH"
  | "RHP_ORIGIN_MIGRATION_REFUSED"
  | "RHP_ORIGIN_TEST_PROFILE_INVALID"
  | "RHP_ORIGIN_AUTOMATED_TEST_ONLY";

type OriginDecisionMetadata = Readonly<{
  mayInitializeSensitiveState: boolean;
  mayUseGeneratedTestState: boolean;
}>;

export type BlockedOriginDecision = OriginDecisionMetadata & Readonly<{
  disposition: "blocked";
  code: OriginPolicyBlockCode;
  runtimeConfigCode?: RuntimeConfigAssessmentCode;
}>;

export type OriginPolicyDecision =
  | BlockedOriginDecision
  | (OriginDecisionMetadata & Readonly<{
      disposition: "origin-eligible";
      code: "RHP_ORIGIN_ELIGIBLE";
      runtimeConfig: RuntimeConfig;
    }>)
  | (OriginDecisionMetadata & Readonly<{
      disposition: "automated-test-only";
      code: "RHP_ORIGIN_AUTOMATED_TEST_ONLY";
      runtimeConfig: RuntimeConfig;
    }>);

export class OriginPolicyError extends Error {
  readonly code: OriginPolicyBlockCode;
  readonly operation: SensitiveOriginOperation;

  constructor(code: OriginPolicyBlockCode, operation: SensitiveOriginOperation) {
    super(`Origin policy blocked ${operation}: ${code}`);
    this.name = "OriginPolicyError";
    this.code = code;
    this.operation = operation;
  }
}

function blocked(
  code: OriginPolicyBlockCode,
  runtimeConfigCode?: RuntimeConfigAssessmentCode
): BlockedOriginDecision {
  return Object.freeze({
    disposition: "blocked",
    code,
    mayInitializeSensitiveState: false,
    mayUseGeneratedTestState: false,
    ...(runtimeConfigCode ? { runtimeConfigCode } : {})
  });
}

function parseContextUrl(value: string): URL | null {
  try {
    const parsed = new URL(value);
    if (parsed.username || parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isProjectPagesOrigin(url: URL): boolean {
  return url.hostname.toLowerCase().endsWith(".github.io");
}

function isExactLoopbackOrigin(url: URL, expectedOrigin: string): boolean {
  if (url.origin !== expectedOrigin) return false;
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
}

function contextPrecondition(input: OriginPolicyInput, url: URL): BlockedOriginDecision | null {
  if (input.context.migrationSourceOrigin !== undefined) {
    return blocked("RHP_ORIGIN_MIGRATION_REFUSED");
  }
  if (isProjectPagesOrigin(url)) return blocked("RHP_ORIGIN_PROJECT_PAGES_FORBIDDEN");
  if (!input.context.isTopLevel) return blocked("RHP_ORIGIN_EMBEDDED_CONTEXT");
  if (!Number.isSafeInteger(input.context.redirectCount) || input.context.redirectCount < 0) {
    return blocked("RHP_ORIGIN_CONTEXT_INVALID");
  }
  if (input.context.redirectCount !== 0) return blocked("RHP_ORIGIN_REDIRECT_REFUSED");
  if (input.context.basePath !== "/") return blocked("RHP_ORIGIN_BASE_PATH_MISMATCH");
  if (url.pathname !== "/" || url.search !== "") return blocked("RHP_ORIGIN_PATH_MISMATCH");
  return null;
}

/**
 * Pure pre-initialization policy. It reads no storage, keys, input files, or
 * network resources. A passing result is only the origin/configuration gate;
 * later resource, browser, artifact, and operation gates remain mandatory.
 */
export function evaluateOriginPolicy(input: OriginPolicyInput): OriginPolicyDecision {
  if (input.profile !== "production" && input.profile !== "automated-test") {
    return blocked("RHP_ORIGIN_CONTEXT_INVALID");
  }
  const url = parseContextUrl(input.context.url);
  if (!url) return blocked("RHP_ORIGIN_CONTEXT_INVALID");

  const contextBlock = contextPrecondition(input, url);
  if (contextBlock) return contextBlock;

  const configAssessment = assessRuntimeConfig(input.runtimeConfig, {
    now: input.now,
    capability: input.capability
  });
  if (configAssessment.disposition !== "configuration-eligible") {
    return blocked("RHP_ORIGIN_CONFIG_BLOCKED", configAssessment.code);
  }

  if (input.profile === "automated-test") {
    if (
      !input.automatedTest ||
      input.automatedTest.stateKind !== "generated-non-authoritative" ||
      !isExactLoopbackOrigin(url, input.automatedTest.expectedOrigin)
    ) return blocked("RHP_ORIGIN_TEST_PROFILE_INVALID");

    return Object.freeze({
      disposition: "automated-test-only",
      code: "RHP_ORIGIN_AUTOMATED_TEST_ONLY",
      runtimeConfig: configAssessment.config,
      mayInitializeSensitiveState: false,
      mayUseGeneratedTestState: true
    });
  }

  if (input.automatedTest !== undefined) return blocked("RHP_ORIGIN_TEST_PROFILE_INVALID");
  if (url.protocol !== "https:" || url.origin !== configAssessment.config.canonicalOrigin) {
    return blocked("RHP_ORIGIN_MISMATCH");
  }

  return Object.freeze({
    disposition: "origin-eligible",
    code: "RHP_ORIGIN_ELIGIBLE",
    runtimeConfig: configAssessment.config,
    mayInitializeSensitiveState: true,
    mayUseGeneratedTestState: false
  });
}

/** Re-evaluates the policy at the call site before one sensitive operation. */
export function requireOriginEligibility(
  input: OriginPolicyInput,
  operation: SensitiveOriginOperation
): RuntimeConfig {
  const decision = evaluateOriginPolicy(input);
  if (decision.disposition !== "origin-eligible") {
    const code = decision.disposition === "blocked" ? decision.code : "RHP_ORIGIN_AUTOMATED_TEST_ONLY";
    throw new OriginPolicyError(code, operation);
  }
  return decision.runtimeConfig;
}

export function captureBrowserOriginContext(
  windowRef: Window = window,
  basePath: string = import.meta.env.BASE_URL
): OriginContext {
  let isTopLevel = false;
  try {
    isTopLevel = windowRef.self === windowRef.top;
  } catch {
    isTopLevel = false;
  }
  const navigation = windowRef.performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return Object.freeze({
    url: windowRef.location.href,
    basePath,
    isTopLevel,
    redirectCount: navigation?.redirectCount ?? -1
  });
}
