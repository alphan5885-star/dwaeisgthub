import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const targets = ["dist", ".tanstack", ".wrangler", "dev-server.log", "dev-server.err.log"];

for (const target of targets) {
  const path = resolve(target);
  if (!existsSync(path)) continue;
  rmSync(path, { recursive: true, force: true });
  console.log(`removed ${target}`);
}

console.log("clean complete");
