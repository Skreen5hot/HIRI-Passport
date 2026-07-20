// @vitest-environment node
import { readFile } from "node:fs/promises"; import { describe, expect, it } from "vitest";
describe("service worker policy", () => { it("does not cache POST or opaque responses", async () => { const source = await readFile("app/src/pwa/cache-policy.ts", "utf8"); expect(source).toContain('request.method !== "GET"'); expect(source).toContain('response.type !== "opaque"'); }); });
