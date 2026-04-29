import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(process.cwd(), "src", "routes");

const walk = (dir) =>
  readdirSync(dir)
    .flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? walk(path) : [path];
    })
    .filter((path) => /\.(tsx?|jsx?)$/.test(path))
    .sort();

const routePath = (file) => {
  const rel = relative(root, file).replace(/\\/g, "/").replace(/\.(tsx?|jsx?)$/, "");
  if (rel === "index") return "/";
  if (rel === "__root") return "(root)";
  return `/${rel.replace(/\.index$/, "").replace(/\./g, "/").replace(/\$([^/]+)/g, ":$1")}`;
};

console.log("Routes");
for (const file of walk(root)) {
  console.log(`- ${routePath(file)} -> ${relative(process.cwd(), file).replace(/\\/g, "/")}`);
}
