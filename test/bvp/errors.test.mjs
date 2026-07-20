import test from "node:test";
import assert from "node:assert/strict";
import { BVP_ERROR_REGISTRY, applyBvpTransition, bvpError } from "../../src/bvp/errors.mjs";

test("every BVP error row preserves its exact dimension", () => {
  assert.equal(Object.keys(BVP_ERROR_REGISTRY).length, 21);
  for (const code of Object.keys(BVP_ERROR_REGISTRY)) {
    const error = bvpError(code, "/safe", { secret: "omit" }); const output = applyBvpTransition({ coreIssuerSignature: "valid" }, error);
    assert.equal(output.coreIssuerSignature, "valid"); assert.equal(JSON.stringify(error).includes("omit"), false);
  }
});
