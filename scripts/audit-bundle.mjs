import { readdir, readFile } from "node:fs/promises"; import { join } from "node:path";
async function walk(directory) { return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]))).flat(); }
for (const file of await walk(process.argv[2] ?? "dist")) { if (!/\.(?:html|js|css|json|webmanifest)$/u.test(file)) continue; const text = await readFile(file, "utf8"); for (const forbidden of ["PRIVATE KEY", "client_secret", "document.write(", "eval("]) if (text.includes(forbidden)) throw new Error(`${file} contains forbidden bundle text: ${forbidden}`); }
console.log("Bundle audit passed");
