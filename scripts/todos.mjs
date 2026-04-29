import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const roots = ["src", "scripts"];
const markers = /\b(TODO|FIXME|HACK|XXX)\b/i;

const walk = (dir) => {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path);
    return [path];
  });
};

const files = roots
  .flatMap((root) => walk(join(process.cwd(), root)))
  .filter((file) => /\.(tsx?|jsx?|css|md|mjs)$/.test(file))
  .filter((file) => !file.replace(/\\/g, "/").endsWith("/scripts/todos.mjs"));

let count = 0;
for (const file of files) {
  const rel = relative(process.cwd(), file).replace(/\\/g, "/");
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    if (!markers.test(line)) return;
    count++;
    console.log(`${rel}:${index + 1}: ${line.trim()}`);
  });
}

if (count === 0) {
  console.log("No TODO/FIXME/HACK/XXX markers found.");
}
