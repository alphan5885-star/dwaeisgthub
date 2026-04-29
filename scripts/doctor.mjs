import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const requiredFiles = [
  "package.json",
  "vite.config.ts",
  "tsconfig.json",
  "src/routes/__root.tsx",
  "src/pages/Login.tsx",
  "src/integrations/supabase/client.ts",
];

const requiredEnv = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
];

const readEnvFile = () => {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return {};

  return Object.fromEntries(
    readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        return [key.trim(), rest.join("=").trim().replace(/^["']|["']$/g, "")];
      }),
  );
};

const nodeMajor = Number(process.versions.node.split(".")[0]);
const env = readEnvFile();
const missingFiles = requiredFiles.filter((file) => !existsSync(join(root, file)));
const missingEnv = requiredEnv.filter((key) => !env[key] && !process.env[key]);

console.log("Project doctor");
console.log(`- Node: ${process.versions.node}`);
console.log(`- Platform: ${process.platform}`);
console.log(`- .env: ${existsSync(join(root, ".env")) ? "found" : "missing"}`);

if (nodeMajor < 22) {
  console.warn("- Warning: Node 22+ is recommended.");
}

if (missingFiles.length) {
  console.error("- Missing required files:");
  for (const file of missingFiles) console.error(`  - ${file}`);
  process.exitCode = 1;
}

if (missingEnv.length) {
  console.warn("- Missing env values:");
  for (const key of missingEnv) console.warn(`  - ${key}`);
  console.warn("  Copy .env.example to .env and fill these values.");
}

if (!process.exitCode) {
  console.log("- Core project files look OK.");
}
