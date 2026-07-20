import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const roots = ["test/core", "test/bvp", "test/sdk", "test/cli", "test/conformance"];
const files = [];
for (const root of roots) for (const name of await readdir(root)) if (name.endsWith(".test.mjs")) files.push(join(root, name));
const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exitCode = result.status ?? 1;
