// @vitest-environment node
import { describe, expect, it } from "vitest"; import { DEFAULT_POLICY } from "../../app/src/config/relying-party-policy";
describe("holder policy", () => { it("does not invent a relying-party decision", () => expect(DEFAULT_POLICY.evaluate()).toMatchObject({ result: "not-evaluated" })); });
