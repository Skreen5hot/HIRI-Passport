import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { build } from "vite";

async function files(directory) { return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry => entry.isDirectory() ? files(join(directory, entry.name)) : [join(directory, entry.name)]))).flat(); }
const output = "dist"; const precache = (await files(output)).map(path => relative(output, path).replaceAll("\\", "/")).filter(path => !path.endsWith(".map") && path !== "service-worker.js" && !path.startsWith("notices/"));
const hash = (await readFile(join(output, "index.html"))).toString("base64url").slice(0, 16);
await build({ configFile: false, logLevel: "warn", build: { outDir: output, emptyOutDir: false, minify: true, target: "es2022", lib: { entry: "app/src/pwa/service-worker.ts", formats: ["es"], fileName: () => "service-worker.js" } }, define: { __HIRI_PRECACHE__: JSON.stringify(precache), __HIRI_CACHE_NAME__: JSON.stringify(`hiri-passport-shell:${hash}`) } });
