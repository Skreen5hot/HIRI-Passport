import { test, expect } from "./fixtures";
test("hostile request text is rendered inert", async ({ page }) => { await page.goto("/#/request"); await page.getByLabel("Paste signed request JSON").fill('{"type":"<img src=x onerror=alert(1)>"}'); await page.getByRole("button", { name: "Inspect request" }).click(); await expect(page.locator("img")).toHaveCount(0); });
