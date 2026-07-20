// @vitest-environment node
import { expect, test } from "vitest";

test("Pages base path policy is represented in the build contract", async () => {
  const config = await import("../../vite.config.mts");
  expect(config.default).toBeTruthy();
  expect(new URL("https://skreen5hot.github.io/HIRI-Passport/").pathname).toBe("/HIRI-Passport/");
});
