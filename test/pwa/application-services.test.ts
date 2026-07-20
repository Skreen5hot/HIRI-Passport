// @vitest-environment node
import { describe, expect, it } from "vitest"; import { createPresentationBytes } from "../../app/src/services/presentation-service";
describe("application services", () => { it("bounds a presentation expiry to five minutes", async () => { const before = Date.now(); const result = await createPresentationBytes({ requestId: "r", nonce: "n", verifierAuthority: "v", selectedItemIds: [], expiresAt: new Date(before + 3_600_000).toISOString() }, "holder"); expect(Date.parse(result.presentation.expiresAt)).toBeLessThanOrEqual(before + 300_100); }); });
