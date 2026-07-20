import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
const root = process.argv[2] ?? "dist";
async function walk(directory) { return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]))).flat(); }
const files = await walk(root); const names = new Set(files.map(file => relative(root, file).replaceAll("\\", "/")));
for (const required of ["index.html", "manifest.webmanifest", "service-worker.js", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png"]) if (!names.has(required)) throw new Error(`Pages artifact is missing ${required}`);
if ([...names].some(name => name.endsWith(".map"))) throw new Error("Pages artifact contains source maps");
const html = await readFile(join(root, "index.html"), "utf8"); if (/<(?:script|link)[^>]+(?:src|href)=["']https?:/iu.test(html)) throw new Error("Pages artifact loads a remote runtime asset");
const total = (await Promise.all(files.map(file => stat(file)))).reduce((sum, value) => sum + value.size, 0); if (total > 8 * 1024 * 1024) throw new Error("Pages artifact exceeds the 8 MiB review limit");
console.log(`Pages artifact OK: ${files.length} files, ${total} bytes`);
