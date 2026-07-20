import { test, expect } from "./fixtures";
test("settings do not claim hardware key protection", async ({ page }) => { await page.goto("/#/settings"); await expect(page.getByText("Non-extractable capability not evaluated", { exact: false })).toBeVisible(); });
