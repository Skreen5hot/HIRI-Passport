import test from "node:test";
import assert from "node:assert/strict";
import { assertKernelPorts, createKernelContext, KERNEL_PORT_NAMES } from "../../src/core/ports.mjs";

// Core §2.3, Core §4, UX §5.1, UX §5.2
function ports() {
  return Object.fromEntries(KERNEL_PORT_NAMES.map((name) => [name, name === "clock" || name === "randomBytes" ? () => 1 : {}]));
}

test("kernel ports are explicit and frozen", () => {
  const value = assertKernelPorts(ports());
  assert.ok(Object.isFrozen(value));
  assert.throws(() => assertKernelPorts({}), /missing kernel ports/);
});

test("kernel context is deterministic for identical explicit inputs", () => {
  const first = createKernelContext(ports(), { now: "2026-07-20T00:00:00Z" });
  const second = createKernelContext(ports(), { now: "2026-07-20T00:00:00Z" });
  assert.deepEqual(first.inputs, second.inputs);
  assert.ok(Object.isFrozen(first.inputs));
});
