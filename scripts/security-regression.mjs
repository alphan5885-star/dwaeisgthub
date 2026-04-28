import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const baselinePath = resolve(".lovable/security-baseline.json");
const scanPath = process.env.SECURITY_SCAN_RESULTS_PATH;
const scanJson = process.env.SECURITY_SCAN_RESULTS_JSON;
const required = process.env.SECURITY_SCAN_REQUIRED === "true" || process.env.CI === "true";

const readJson = (label, value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
};

const loadScanResults = () => {
  if (scanJson) return readJson("SECURITY_SCAN_RESULTS_JSON", scanJson);
  if (scanPath) return readJson(scanPath, readFileSync(resolve(scanPath), "utf8"));
  if (required) {
    throw new Error(
      "Security scan results are required. Set SECURITY_SCAN_RESULTS_PATH or SECURITY_SCAN_RESULTS_JSON after running the security scan.",
    );
  }
  console.warn("Security regression skipped: no scan results were provided.");
  return null;
};

const flattenFindings = (results) =>
  Object.entries(results ?? {}).flatMap(([scannerName, scannerResult]) =>
    (scannerResult?.findings ?? []).map((finding) => ({
      scannerName: scannerResult.scanner_name ?? scannerName,
      internalId: finding.internal_id ?? finding.id,
      level: finding.level ?? "warn",
      name: finding.name ?? finding.id ?? "Unnamed finding",
    })),
  );

if (!existsSync(baselinePath)) {
  throw new Error(`Missing security baseline at ${baselinePath}`);
}

const baseline = readJson(baselinePath, readFileSync(baselinePath, "utf8"));
const scanResults = loadScanResults();

if (scanResults) {
  const allowed = new Set((baseline.allowedFindings ?? []).map((item) => `${item.scannerName}:${item.internalId}`));
  const currentFindings = flattenFindings(scanResults);
  const newFindings = currentFindings.filter(
    (finding) => !allowed.has(`${finding.scannerName}:${finding.internalId}`),
  );

  if (newFindings.length > 0) {
    console.error("Security regression failed. New scan findings appeared:");
    for (const finding of newFindings) {
      console.error(`- [${finding.level}] ${finding.scannerName}:${finding.internalId} — ${finding.name}`);
    }
    process.exit(1);
  }

  console.log(`Security regression passed: ${currentFindings.length} finding(s), no new findings.`);
}