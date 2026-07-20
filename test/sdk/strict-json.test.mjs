import test from "node:test";
import assert from "node:assert/strict";
import { parseStrictJson } from "../../src/sdk/strict-json.mjs";

test("strict JSON rejects duplicate members before construction", () => {
  assert.throws(() => parseStrictJson('{"proof":{"type":"a","type":"b"}}'), (error) => error.code === "JSON_DUPLICATE_MEMBER" && error.path === "/proof/type");
  assert.deepEqual(parseStrictJson('{"a":[true,null,-1.5e2],"b":"safe"}'), { a: [true, null, -150], b: "safe" });
});

test("strict JSON enforces depth, string, bytes, and trailing-data limits", () => {
  assert.throws(() => parseStrictJson('{"a":{"b":1}}', { maximumDepth: 1 }), /JSON_RESOURCE_LIMIT/);
  assert.throws(() => parseStrictJson('"long"', { maximumStringLength: 3 }), /JSON_RESOURCE_LIMIT/);
  assert.throws(() => parseStrictJson('{} trailing'), /JSON_TRAILING_DATA/);
});
