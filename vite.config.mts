import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { RUNTIME_MODES, type RuntimeMode } from "./app/src/config/runtime-mode";

const RUNTIME_BOOTSTRAP_SOURCE = "virtual:hiri-bootstrap";
const RUNTIME_BOOTSTRAP_ID = "\0virtual:hiri-bootstrap";
const PREVIEW_FORBIDDEN_MODULE_PARTS = [
  "/src/demo/",
  "/src/resources/synthetic/",
  "/src/routes/onboarding/backup-setup",
  "/src/routes/settings/device-add",
  "/src/routes/settings/device-remove"
] as const;

export function resolveRuntimeMode(value: string): RuntimeMode {
  if ((RUNTIME_MODES as readonly string[]).includes(value)) return value as RuntimeMode;
  throw new Error(
    `Explicit runtime mode required; use one of: ${RUNTIME_MODES.join(", ")}. Received: ${JSON.stringify(value)}`
  );
}

export function normalizedBase(value: string | undefined): string {
  if (!value || value === "/") return "/";
  const path = value.startsWith("/") ? value : `/${value}`;
  return path.endsWith("/") ? path : `${path}/`;
}

export function assertRuntimeBase(mode: RuntimeMode, base: string): void {
  if (mode === "real-holder-preview" && base !== "/") {
    throw new Error(
      "Real Holder Preview requires dedicated root-path hosting; project Pages subpaths are Synthetic Demo only."
    );
  }
}

export function assertLegacyDemoMarker(mode: RuntimeMode, value: string | undefined): void {
  if (value === undefined) return;
  if (value !== "true" || mode !== "synthetic-demo") {
    throw new Error(
      "HIRI_DEMO_MODE is a Synthetic Demo assertion only; it cannot select or accompany Real Holder Preview."
    );
  }
}

export function isPreviewForbiddenModule(id: string): boolean {
  const normalized = id.split("?", 1)[0].replaceAll("\\", "/");
  return PREVIEW_FORBIDDEN_MODULE_PARTS.some(part => normalized.includes(part));
}

function runtimeBoundaryPlugin(mode: RuntimeMode): Plugin {
  let runtimeBootstrapResolved = false;
  return {
    name: "hiri-runtime-boundary",
    enforce: "pre",
    resolveId(source) {
      if (source === RUNTIME_BOOTSTRAP_SOURCE) {
        runtimeBootstrapResolved = true;
        return RUNTIME_BOOTSTRAP_ID;
      }
      return null;
    },
    load(id) {
      if (id !== RUNTIME_BOOTSTRAP_ID) return null;
      const entry = mode === "synthetic-demo"
        ? "/src/bootstrap/demo-bootstrap.tsx"
        : "/src/bootstrap/preview-bootstrap.tsx";
      return `export { startApplication } from ${JSON.stringify(entry)};`;
    },
    transform(_code, id) {
      if (mode === "real-holder-preview" && isPreviewForbiddenModule(id)) {
        throw new Error(`Real Holder Preview graph contains a forbidden Synthetic Demo module: ${id}`);
      }
      return null;
    },
    generateBundle(_options, bundle) {
      if (mode !== "real-holder-preview") return;
      if (!runtimeBootstrapResolved) {
        throw new Error("Real Holder Preview did not resolve its isolated bootstrap composition.");
      }
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        for (const id of Object.keys(output.modules)) {
          if (isPreviewForbiddenModule(id)) {
            throw new Error(`Real Holder Preview bundle contains a forbidden Synthetic Demo module: ${id}`);
          }
        }
      }
    }
  };
}

export default defineConfig(({ mode: rawMode }) => {
  const mode = resolveRuntimeMode(rawMode);
  const base = normalizedBase(process.env.PWA_BASE_PATH);
  assertLegacyDemoMarker(mode, process.env.HIRI_DEMO_MODE);
  assertRuntimeBase(mode, base);

  return {
    root: "app",
    base,
    publicDir: "public",
    plugins: [runtimeBoundaryPlugin(mode), react()],
    define: {
      __HIRI_RUNTIME_MODE__: JSON.stringify(mode)
    },
    build: {
      outDir: "../dist",
      emptyOutDir: true,
      sourcemap: false,
      target: "es2022",
      cssCodeSplit: true
    }
  };
});
