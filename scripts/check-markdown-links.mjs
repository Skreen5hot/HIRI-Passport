import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";

const root = process.cwd();
const tracked = execFileSync("git", ["ls-files", "-z", "--", "*.md"], {
  cwd: root,
  encoding: "utf8"
}).split("\0").filter(Boolean);

const failures = [];
let checked = 0;

for (const file of tracked) {
  const source = readFileSync(resolve(root, file), "utf8").replace(/```[\s\S]*?```/gu, "");
  const links = source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/gu);

  for (const match of links) {
    let target = match[1].trim();
    if (target.startsWith("<")) {
      const closing = target.indexOf(">");
      if (closing === -1) continue;
      target = target.slice(1, closing);
    } else {
      target = target.split(/\s+["']/u, 1)[0];
    }

    if (!target || target.startsWith("#") || target.startsWith("//") || /^[a-z][a-z0-9+.-]*:/iu.test(target)) {
      continue;
    }

    const pathText = target.split("#", 1)[0].split("?", 1)[0];
    if (!pathText) continue;

    let decoded;
    try {
      decoded = decodeURIComponent(pathText);
    } catch {
      failures.push(`${file}: invalid URL encoding in ${target}`);
      continue;
    }

    const destination = resolve(root, dirname(file), decoded);
    const withinRoot = destination === root || destination.startsWith(`${root}${sep}`);
    if (!withinRoot) {
      failures.push(`${file}: link escapes the repository: ${target}`);
      continue;
    }

    checked += 1;
    if (!existsSync(destination)) {
      failures.push(`${file}: missing ${target} (resolved ${relative(root, destination)})`);
    }
  }
}

if (failures.length > 0) {
  console.error(`Markdown link check failed with ${failures.length} error(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`Markdown link check passed: ${tracked.length} tracked files, ${checked} local links.`);
}
