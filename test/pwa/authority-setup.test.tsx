// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server"; import { describe, expect, it } from "vitest"; import { AppStateProvider } from "../../app/src/state/app-state"; import { AuthoritySetupRoute } from "../../app/src/routes/onboarding/authority-setup";
describe("authority setup", () => { it("labels project-origin authority state synthetic", () => expect(renderToStaticMarkup(<AppStateProvider><AuthoritySetupRoute /></AppStateProvider>)).toMatch(/synthetic demo state/i)); });
