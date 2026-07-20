export type ResolverCandidate = { artifact: unknown; provenance: { source: string; retrievedAt: string; transportAuthenticated: boolean; issuerAuthoritative: boolean } };
export async function resolveArtifact(url: string, now: string, signal?: AbortSignal): Promise<ResolverCandidate> {
  const target = new URL(url); if (target.protocol !== "https:") throw new TypeError("resolver must use HTTPS");
  const response = await fetch(target, { signal, redirect: "error", credentials: "omit", headers: { accept: "application/json" } });
  if (!response.ok) throw new Error("resolver unavailable");
  const text = await response.text(); if (new TextEncoder().encode(text).length > 10 * 1024 * 1024) throw new RangeError("resolver response exceeds limit");
  return { artifact: JSON.parse(text), provenance: { source: target.href, retrievedAt: now, transportAuthenticated: true, issuerAuthoritative: false } };
}
