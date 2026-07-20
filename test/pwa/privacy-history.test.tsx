// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server"; import { describe, expect, it } from "vitest"; import { AppStateProvider } from "../../app/src/state/app-state"; import { PrivacyHistoryRoute } from "../../app/src/routes/history/privacy-history";
describe("privacy history", () => { it("states that the local log is neither published nor analytics", () => expect(renderToStaticMarkup(<AppStateProvider><PrivacyHistoryRoute /></AppStateProvider>)).toMatch(/never published or used for analytics/i)); });
