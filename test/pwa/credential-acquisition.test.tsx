// @vitest-environment node
import { describe, expect, it } from "vitest"; import { reviewCredentialImport } from "../../app/src/services/acquisition-service";
describe("credential acquisition", () => { it("blocks an unrelated JSON object", () => expect(reviewCredentialImport('{"type":"Profile"}').result).toBe("blocked")); });
