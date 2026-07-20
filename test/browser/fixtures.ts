import { test as base } from "@playwright/test";
// Playwright creates an isolated browser context for every test, so origin state
// starts clean without deleting a newly installed worker's precache.
export const test = base.extend({ page: async ({ page }, use) => { await page.goto("/#/"); await use(page); } }); export { expect } from "@playwright/test";
