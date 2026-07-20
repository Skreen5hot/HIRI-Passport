import { test, expect } from "./fixtures";
test("credential details keep evidence dimensions separate", async ({ page }) => { await page.goto("/#/credential?id=local-license-01"); await expect(page.getByText("Cryptography", { exact: true })).toBeVisible(); await expect(page.getByText("Issuer identity", { exact: true })).toBeVisible(); });
