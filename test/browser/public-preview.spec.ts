import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "./fixtures";

test("public preview discloses evidence-based platform availability", async ({ page }) => {
  await page.goto("/preview/");
  await expect(page.getByRole("heading", { level: 1, name: "Real Holder Preview limitations" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Platform availability — limited and evidence-based" })).toBeVisible();
  await expect(page.getByText("Public access does not mean every browser or device is supported", { exact: false })).toBeVisible();
  await expect(page.getByText("The mobile-first interface is not a claim that every mobile platform is approved", { exact: false })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(item => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
});
