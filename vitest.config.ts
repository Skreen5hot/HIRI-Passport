import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["test/pwa/setup.ts"],
    include: ["test/pwa/**/*.test.{ts,tsx,mjs}"],
    restoreMocks: true,
    clearMocks: true,
    pool: "forks",
    maxWorkers: 1
  }
});
