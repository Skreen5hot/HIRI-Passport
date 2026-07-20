// @vitest-environment node
import { describe, expect, it } from "vitest"; import { validateSelfAssertion } from "../../app/src/services/self-assertion-service";
describe("self assertions", () => { it("requires a label and value and preserves provenance choice", () => { expect(validateSelfAssertion({ label: "", value: "", persistence: "ephemeral" }).result).toBe("invalid"); expect(validateSelfAssertion({ label: "Preferred name", value: "Alex", persistence: "ephemeral" }).result).toBe("valid"); }); });
