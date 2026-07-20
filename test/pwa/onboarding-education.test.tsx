// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server"; import { describe, expect, it } from "vitest"; import { WelcomeRoute } from "../../app/src/routes/onboarding/welcome";
describe("onboarding education", () => { it("makes local control and separate evidence explicit", () => { const html = renderToStaticMarkup(<WelcomeRoute />); expect(html).toContain("stays in your hands"); expect(html).toContain("separate evidence dimensions"); }); });
