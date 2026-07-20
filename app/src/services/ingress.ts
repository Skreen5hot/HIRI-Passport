import { parseStrictJson } from "../../../src/sdk/strict-json.mjs";

export type IngressProvenance = { source: "paste" | "file" | "url" | "qr" | "deep-link"; receivedAt: string; transportAuthenticated: boolean; originalBytes: Uint8Array };
export type IngressEnvelope = ReturnType<typeof ingestText>;

export function ingestText(text: string, source: IngressProvenance["source"], now: string) {
  const bytes = new TextEncoder().encode(text);
  return { value: parseStrictJson(text), provenance: { source, receivedAt: now, transportAuthenticated: source === "url" && location.protocol === "https:", originalBytes: bytes } satisfies IngressProvenance };
}

export function parseIngressJson(text: string, source: IngressProvenance["source"], now = new Date().toISOString()) {
  return ingestText(text, source, now);
}
