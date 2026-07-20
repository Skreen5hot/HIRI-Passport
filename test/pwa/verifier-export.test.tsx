// @vitest-environment node
import { describe, expect, it } from "vitest"; import { DEFAULT_RETENTION, describeRetention } from "../../app/src/services/retention-policy";
describe("verifier export", () => { it("defaults to retaining no claims or report", () => { expect(DEFAULT_RETENTION).toBe("none"); expect(describeRetention(DEFAULT_RETENTION)).toMatch(/No claims or report/i); }); });
