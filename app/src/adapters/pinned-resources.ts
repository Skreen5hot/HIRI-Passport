import { createPinnedResourceRegistry, loadPinnedResource } from "../../../src/core/resources.mjs";
export function createBrowserResourceRegistry(entries: unknown[], sha256: { digest(bytes: Uint8Array): Promise<Uint8Array> }, schemaValidator: (value: unknown, schema: unknown) => boolean) { return createPinnedResourceRegistry(entries, { sha256, schemaValidator }); }
export async function loadBrowserResource(registry: unknown, id: string, hash: string, kind: string) { return loadPinnedResource(registry, id, hash, kind); }
