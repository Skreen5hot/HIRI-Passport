import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function normalizedBase(value: string | undefined): string {
  if (!value || value === "/") return "/";
  const path = value.startsWith("/") ? value : `/${value}`;
  return path.endsWith("/") ? path : `${path}/`;
}

export default defineConfig({
  root: "app",
  base: normalizedBase(process.env.PWA_BASE_PATH),
  publicDir: "public",
  plugins: [react()],
  define: {
    __HIRI_DEMO_MODE__: JSON.stringify(process.env.HIRI_DEMO_MODE !== "false")
  },
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
    cssCodeSplit: true
  }
});
