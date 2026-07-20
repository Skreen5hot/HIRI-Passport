// @vitest-environment node
import { describe, expect, it } from "vitest"; import { RESOURCE_STATUS, SYNTHETIC_RESOURCE_CATALOG } from "../../app/src/resources/catalog";
describe("pinned resources", () => { it("fails the production gate while the normative context is open", () => { expect(SYNTHETIC_RESOURCE_CATALOG).toEqual([]); expect(RESOURCE_STATUS).toEqual({ productionReady: false, blocker: "OPEN-CONTEXT-01" }); }); });
