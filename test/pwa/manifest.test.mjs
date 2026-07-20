// @vitest-environment node
import { readFile } from "node:fs/promises"; import { describe, expect, it } from "vitest";
describe("web manifest", () => { it("uses relative Pages-safe URLs and required PNG sizes", async () => { const manifest = JSON.parse(await readFile("app/public/manifest.webmanifest", "utf8")); expect(manifest.start_url).toBe("./#/"); expect(manifest.scope).toBe("./"); expect(manifest.icons.map(icon => icon.sizes)).toEqual(["192x192", "512x512", "512x512"]); }); });
