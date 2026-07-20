import { test, expect } from "./fixtures";
test("built artifact loads without a runtime server API", async ({ page }) => { await page.goto("/#/home"); await expect(page.getByText("Synthetic demo", { exact: false }).first()).toBeVisible(); });
