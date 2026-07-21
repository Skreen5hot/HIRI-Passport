import { assertRuntimeMode, getRuntimeMode } from "../config/runtime-mode";

export function assertSyntheticDemoBuild(): void {
  assertRuntimeMode("synthetic-demo");
}

export function isSyntheticDemoBuild(): boolean {
  return getRuntimeMode() === "synthetic-demo";
}
