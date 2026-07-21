/**
 * Shape reserved for a future successor decision. No HeadEntry is accepted or
 * persisted by the Real Holder Preview's signed D2-A baseline.
 */
export type HeadEntry = Readonly<{
  id: string;
  version: number;
  manifestHash: string;
  source: string;
  retrievedAt: string;
  transportAuthenticated: boolean;
  issuerAuthoritative: boolean;
  rollbackExplanationVerified?: boolean;
}>;

export const HEAD_CACHE_UNAVAILABLE = Object.freeze({
  result: "unknown" as const,
  error: "CURRENT_HEAD_UNKNOWN" as const,
  code: "RHP_HEAD_CACHE_DISABLED" as const,
  cache: "not-consulted" as const,
  entry: null
});

export const HEAD_CACHE_WRITE_REJECTED = Object.freeze({
  result: "unavailable" as const,
  code: "RHP_HEAD_CACHE_DISABLED" as const,
  accepted: false as const,
  persisted: false as const
});

export type DisabledHeadCache = Readonly<{
  disposition: "disabled";
  code: "RHP_HEAD_CACHE_DISABLED";
  get(id: string): Promise<typeof HEAD_CACHE_UNAVAILABLE>;
  put(entry: HeadEntry): Promise<typeof HEAD_CACHE_WRITE_REJECTED>;
}>;

/**
 * Preserves a stable storage-facing interface while guaranteeing that the
 * approved empty current-head configuration cannot read or write IndexedDB.
 */
export function createHeadCache(): DisabledHeadCache {
  return Object.freeze({
    disposition: "disabled" as const,
    code: "RHP_HEAD_CACHE_DISABLED" as const,
    get: async (_id: string) => HEAD_CACHE_UNAVAILABLE,
    put: async (_entry: HeadEntry) => HEAD_CACHE_WRITE_REJECTED
  });
}
