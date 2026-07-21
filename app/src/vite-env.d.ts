/// <reference types="vite/client" />

declare const __HIRI_RUNTIME_MODE__: "synthetic-demo" | "real-holder-preview";

declare module "virtual:hiri-bootstrap" {
  export function startApplication(): void | Promise<void>;
}
