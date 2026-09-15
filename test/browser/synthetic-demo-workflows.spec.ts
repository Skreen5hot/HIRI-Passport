import { test, expect } from "./fixtures";

test("Add and Verify are complete synthetic-demo workflows without page errors", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/#/acquire");
  await expect(page.getByText(/production runtime composes/i)).toHaveCount(0);
  await page.getByRole("button", { name: "Add synthetic sample credential" }).click();
  await expect(page.getByText(/Synthetic sample added.+4 local records/u)).toBeVisible();
  await page.getByRole("link", { name: "View Passport" }).click();
  await expect(page.getByRole("heading", { name: "Safety Training Completion" })).toBeVisible();

  await page.goto("/#/verify");
  await page.getByRole("button", { name: "Inspect synthetic presentation" }).click();
  await expect(page.getByRole("heading", { name: "Synthetic presentation results" })).toBeVisible();
  await expect(page.getByText("Issuer identity", { exact: true })).toBeVisible();
  await expect(page.getByText("not-evaluated", { exact: true })).toBeVisible();

  expect(pageErrors).toEqual([]);
});
