// @vitest-environment node
import { readFile } from "node:fs/promises"; import { describe, expect, it } from "vitest";
describe("synthetic fixtures", () => { it("are explicitly synthetic and deterministic", async () => { const valid = await readFile("test/fixtures/pwa/valid.json", "utf8"); expect(valid).toMatch(/synthetic/i); expect(valid).not.toMatch(/BEGIN PRIVATE KEY/u); }); });
