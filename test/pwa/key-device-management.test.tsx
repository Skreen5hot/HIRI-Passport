// @vitest-environment node
import { describe, expect, it } from "vitest"; import { removalWarning, rotateDevice } from "../../app/src/services/device-service";
describe("key and device management", () => { it("requires a distinct successor and warns old ciphertext cannot be retracted", () => { expect(() => rotateDevice([{ id: "a", label: "A", method: "m", state: "active" }], "a", { id: "a", label: "A", method: "m", state: "active" })).toThrow(/distinct/i); expect(removalWarning()).toMatch(/cannot retract ciphertext/i); }); });
