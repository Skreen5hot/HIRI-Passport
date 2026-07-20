import test from "node:test";
import assert from "node:assert/strict";
import { CORE_ERROR_REGISTRY, applyErrorTransition, protocolError } from "../../src/core/errors.mjs";

test("every Core error has a safe constructible transition", () => {
  for (const [code, entry] of Object.entries(CORE_ERROR_REGISTRY)) {
    const phase = entry.phase.split("/")[0] === "Any" ? "R" : entry.phase.split("/")[0];
    const error = protocolError(code, "/safe", { phase, secret: "must-not-appear" });
    const result = applyErrorTransition({ request: {}, holder: {}, credentials: [{}], policy: {} }, error);
    assert.ok(result.errors.some((candidate) => candidate.code === code));
    assert.equal(JSON.stringify(error).includes("must-not-appear"), false);
  }
});
