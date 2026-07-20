// @vitest-environment node
import { readFile } from "node:fs/promises"; import { describe, expect, it } from "vitest";
describe("Pages artifact checker", () => { it("checks the manifest, worker, icons, source maps, and remote runtime assets", async () => { const source = await readFile("scripts/check-pages-artifact.mjs", "utf8"); for (const marker of ["manifest.webmanifest", "service-worker.js", ".map", "remote runtime asset"]) expect(source).toContain(marker); }); });
