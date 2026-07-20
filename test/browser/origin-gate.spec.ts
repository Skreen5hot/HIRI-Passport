import { test, expect } from "./fixtures";
test("project demo is visibly synthetic", async ({ page }) => { await page.goto("/#/"); await expect(page.getByText("no real keys or credentials", { exact: false })).toBeVisible(); });
