import { readFileSync, writeFileSync } from "node:fs";
import { jcsBytes } from "../src/core/canonical.mjs";
import { parseStrictJson } from "../src/sdk/strict-json.mjs";
import { DESCRIPTOR_PATH, validateDescriptor } from "./lib/rhp-resource-kit.mjs";

const descriptor = validateDescriptor(parseStrictJson(readFileSync(DESCRIPTOR_PATH, "utf8"), {
  maximumBytes: 256 * 1024,
  maximumDepth: 16,
  maximumStringLength: 4096
}));
for (const entry of descriptor.resources) {
  const value = parseStrictJson(readFileSync(entry.bytesPath, "utf8"), {
    maximumBytes: 2 * 1024 * 1024,
    maximumDepth: 64,
    maximumStringLength: 1024 * 1024
  });
  writeFileSync(entry.bytesPath, jcsBytes(value));
  console.log(`Canonicalized ${entry.bytesPath}`);
}
