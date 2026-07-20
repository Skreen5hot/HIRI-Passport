import { resolveArtifact } from "./artifact-resolver";
export async function resolveCurrentHead(url: string, now: string, configuredAuthority: Set<string>, signal?: AbortSignal) { const candidate = await resolveArtifact(url, now, signal); candidate.provenance.issuerAuthoritative = configuredAuthority.has(new URL(url).origin); return candidate; }
