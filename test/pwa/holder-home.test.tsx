// @vitest-environment node
import { describe, expect, it } from "vitest"; import { DEMO_CREDENTIALS } from "../../app/src/demo/demo-fixtures"; import { buildHomeViewModel } from "../../app/src/services/home-view-model";
describe("holder home model", () => { it("counts records without treating unknown as invalid", () => { const model = buildHomeViewModel(DEMO_CREDENTIALS); expect(model.total).toBe(3); expect(model.active).toBe(1); expect(model.attention).toBe(0); }); });
