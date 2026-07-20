// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server"; import { describe, expect, it } from "vitest"; import { AppStateProvider } from "../../app/src/state/app-state"; import { BackupSetupRoute } from "../../app/src/routes/onboarding/backup-setup";
describe("backup setup", () => { it("does not promise total-loss continuity", () => expect(renderToStaticMarkup(<AppStateProvider><BackupSetupRoute /></AppStateProvider>)).toMatch(/cannot restore the same authority/i)); });
