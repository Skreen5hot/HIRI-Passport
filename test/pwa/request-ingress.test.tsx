// @vitest-environment node
import { describe, expect, it } from "vitest"; import { validateRequestIngress } from "../../app/src/services/request-service";
describe("request ingress", () => { it("blocks an expired request before consent", () => { const text = JSON.stringify({ protocol: "hiri-passport/2.0", type: "DisclosureRequest", requestId: "id", nonce: "nonce", expiresAt: "2026-07-19T00:00:00Z" }); expect(validateRequestIngress(text, new Date("2026-07-20T00:00:00Z")).result).toBe("invalid"); }); });
