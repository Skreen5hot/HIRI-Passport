export const RUNTIME_MODES = ["synthetic-demo", "real-holder-preview"] as const;
export type RuntimeMode = (typeof RUNTIME_MODES)[number];

export function parseRuntimeMode(value: unknown): RuntimeMode {
  if (typeof value === "string" && (RUNTIME_MODES as readonly string[]).includes(value)) {
    return value as RuntimeMode;
  }
  throw new TypeError(`Invalid compiled runtime mode: ${JSON.stringify(value)}`);
}

export function getRuntimeMode(): RuntimeMode {
  return parseRuntimeMode(__HIRI_RUNTIME_MODE__);
}

export function assertRuntimeMode(expected: RuntimeMode): RuntimeMode {
  const actual = getRuntimeMode();
  if (actual !== expected) {
    throw new Error(`Runtime composition mismatch: expected ${expected}, received ${actual}`);
  }
  return actual;
}

export function renderRealHolderPreviewBoundary(documentRef: Document = document): void {
  const root = documentRef.getElementById("root");
  if (!root) throw new Error("application root is missing");

  documentRef.documentElement.dataset.hiriRuntimeMode = "real-holder-preview";
  documentRef.title = "Real Holder Preview · Implementation boundary";

  const main = documentRef.createElement("main");
  main.id = "main-content";
  main.className = "shell-content";

  const panel = documentRef.createElement("section");
  panel.className = "panel stack";

  const eyebrow = documentRef.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Real Holder Preview build boundary";

  const heading = documentRef.createElement("h1");
  heading.textContent = "Preview startup is intentionally blocked.";

  const detail = documentRef.createElement("p");
  detail.className = "lede";
  detail.textContent =
    "Runtime configuration and origin enforcement are not implemented yet. This build cannot begin holder onboarding.";

  const next = documentRef.createElement("p");
  next.textContent = "Continue using the Synthetic Demo while Real Holder Preview implementation is incomplete.";

  panel.append(eyebrow, heading, detail, next);
  main.append(panel);
  root.replaceChildren(main);
}
