import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const roots = ["src/routes", "src/pages", "src/components", "src/lib", "src/integrations"];
const maxFilesPerRoot = 80;

const walk = (dir) => {
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return [];
  return readdirSync(dir)
    .flatMap((name) => {
      const path = join(dir, name);
      const stat = statSync(path);
      if (stat.isDirectory()) return walk(path);
      return [path];
    })
    .filter((path) => /\.(tsx?|css|json)$/.test(path))
    .sort();
};

console.log("Project map");
for (const root of roots) {
  const files = walk(join(process.cwd(), root));
  console.log(`\n${root} (${files.length} files)`);
  for (const file of files.slice(0, maxFilesPerRoot)) {
    console.log(`- ${relative(process.cwd(), file).replace(/\\/g, "/")}`);
  }
  if (files.length > maxFilesPerRoot) {
    console.log(`- ... ${files.length - maxFilesPerRoot} more`);
  }
}
