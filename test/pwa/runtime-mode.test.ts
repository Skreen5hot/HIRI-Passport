import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { build } from "vite";
import {
  assertLegacyDemoMarker,
  assertRuntimeBase,
  isPreviewForbiddenModule,
  resolveRuntimeMode
} from "../../vite.config.mts";
import {
  assertRuntimeMode,
  getRuntimeMode,
  parseRuntimeMode,
  renderRealHolderPreviewBoundary
} from "../../app/src/config/runtime-mode";

const temporaryOutputs: string[] = [];
let syntheticBundle = "";
let previewBundle = "";

async function readTextTree(directory: string): Promise<string> {
  const entries = await readdir(directory, { withFileTypes: true });
  const texts = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return readTextTree(path);
    if (!/\.(?:css|html|js|json|webmanifest)$/u.test(entry.name)) return "";
    return readFile(path, "utf8");
  }));
  return texts.join("\n");
}

async function buildComposition(mode: "synthetic-demo" | "real-holder-preview"): Promise<string> {
  const outDir = await mkdtemp(join(tmpdir(), `hiri-${mode}-`));
  temporaryOutputs.push(outDir);
  await build({
    configFile: resolve("vite.config.mts"),
    mode,
    logLevel: "silent",
    base: "/",
    build: { outDir, emptyOutDir: true }
  });
  return readTextTree(outDir);
}

beforeAll(async () => {
  const previousBase = process.env.PWA_BASE_PATH;
  const previousDemoMarker = process.env.HIRI_DEMO_MODE;
  process.env.PWA_BASE_PATH = "/";
  delete process.env.HIRI_DEMO_MODE;
  try {
    syntheticBundle = await buildComposition("synthetic-demo");
    previewBundle = await buildComposition("real-holder-preview");
  } finally {
    if (previousBase === undefined) delete process.env.PWA_BASE_PATH;
    else process.env.PWA_BASE_PATH = previousBase;
    if (previousDemoMarker === undefined) delete process.env.HIRI_DEMO_MODE;
    else process.env.HIRI_DEMO_MODE = previousDemoMarker;
  }
}, 30_000);

afterAll(async () => {
  await Promise.all(temporaryOutputs.map(path => rm(path, { recursive: true, force: true })));
});

describe("runtime mode boundary", () => {
  it("accepts only the two explicit build compositions", () => {
    expect(resolveRuntimeMode("synthetic-demo")).toBe("synthetic-demo");
    expect(resolveRuntimeMode("real-holder-preview")).toBe("real-holder-preview");
    for (const ambiguous of ["", "production", "development", "preview", "true", "false"]) {
      expect(() => resolveRuntimeMode(ambiguous)).toThrow(/explicit runtime mode required/iu);
    }
    expect(parseRuntimeMode("synthetic-demo")).toBe("synthetic-demo");
    expect(() => parseRuntimeMode(undefined)).toThrow(/invalid compiled runtime mode/iu);
  });

  it("uses a compile-time constant rather than a URL or storage toggle", () => {
    expect(getRuntimeMode()).toBe("synthetic-demo");
    expect(assertRuntimeMode("synthetic-demo")).toBe("synthetic-demo");
    expect(() => assertRuntimeMode("real-holder-preview")).toThrow(/composition mismatch/iu);
  });

  it("reserves project Pages subpaths for the Synthetic Demo", () => {
    expect(() => assertRuntimeBase("synthetic-demo", "/HIRI-Passport/")).not.toThrow();
    expect(() => assertRuntimeBase("real-holder-preview", "/HIRI-Passport/")).toThrow(/project Pages subpaths/iu);
    expect(() => assertRuntimeBase("real-holder-preview", "/")).not.toThrow();
  });

  it("treats the legacy demo variable as an assertion, never as a mode selector", () => {
    expect(() => assertLegacyDemoMarker("synthetic-demo", "true")).not.toThrow();
    expect(() => assertLegacyDemoMarker("real-holder-preview", "true")).toThrow(/assertion only/iu);
    expect(() => assertLegacyDemoMarker("real-holder-preview", "false")).toThrow(/assertion only/iu);
  });

  it("classifies fixture, synthetic-resource, backup, and device-control modules as preview-forbidden", () => {
    for (const id of [
      "C:/repo/app/src/demo/demo-fixtures.ts",
      "C:/repo/app/src/resources/synthetic/vector.json",
      "C:/repo/app/src/routes/onboarding/backup-setup.tsx",
      "C:/repo/app/src/routes/settings/device-add.tsx",
      "C:/repo/app/src/routes/settings/device-remove.tsx"
    ]) expect(isPreviewForbiddenModule(id)).toBe(true);
    expect(isPreviewForbiddenModule("C:/repo/app/src/config/runtime-mode.ts")).toBe(false);
  });

  it("builds structurally different graphs with no demo fixture or prohibited controls in preview", () => {
    for (const marker of [
      "SYN-PE-123456",
      "permit.synthetic.invalid",
      "Create synthetic authority",
      "Create and verify demo backup",
      "Create one-time transfer"
    ]) {
      expect(syntheticBundle).toContain(marker);
      expect(previewBundle).not.toContain(marker);
    }
    expect(previewBundle).toContain("Real Holder Preview is unavailable here");
    expect(previewBundle).toContain("No holder storage, keys, imports, signing, resolver, or delivery path has been initialized");
  });

  it("renders only the fail-closed preview boundary before later bootstrap work", () => {
    document.body.innerHTML = '<div id="root"></div>';
    renderRealHolderPreviewBoundary(document);
    expect(document.documentElement.dataset.hiriRuntimeMode).toBe("real-holder-preview");
    expect(document.body.textContent).toMatch(/startup is intentionally blocked/iu);
    expect(document.body.textContent).toMatch(/cannot begin holder onboarding/iu);
  });
});
