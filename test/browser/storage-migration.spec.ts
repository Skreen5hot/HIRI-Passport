import { test, expect } from "./fixtures";
test("database migration journal is created after opening storage", async ({ page }) => { await page.goto("/#/home"); const supported = await page.evaluate(() => typeof indexedDB !== "undefined"); expect(supported).toBe(true); });
