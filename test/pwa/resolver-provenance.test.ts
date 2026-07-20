// @vitest-environment node
import { describe, expect, it } from "vitest"; import { resolveArtifact } from "../../app/src/adapters/artifact-resolver";
describe("resolver provenance", () => { it("rejects non-HTTPS artifact sources", async () => { await expect(resolveArtifact("http://resolver.invalid/a", "2026-07-20T00:00:00Z")).rejects.toThrow(/HTTPS/u); }); });
