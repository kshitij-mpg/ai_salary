/**
 * Assert India PPP is job-country correct on the GCC Nexus AI Engineer entry row.
 * Reads generated public/data/observations.json.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(__dirname, "../public/data/observations.json");

if (!fs.existsSync(jsonPath)) {
  console.error("Run npm run ingest first.");
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const gcc = rows.find(
  (o) =>
    o.pppSuspect &&
    o.sourceName.includes("GCC Nexus") &&
    o.roleName === "AI Engineer" &&
    o.experienceLevel.startsWith("Entry") &&
    o.city === "National",
);

if (!gcc) {
  console.error("GCC Nexus AI Engineer entry row not found.");
  process.exit(1);
}

const okSalary = gcc.salaryInr === 1307391;
const okSourcePpp = gcc.salaryPppInr === 1307391;
const okCorrected = gcc.salaryPppInrCorrected === 1307391;
const indiaUsd = rows.filter((o) => o.pppSuspect);
const indiaUsdOk = indiaUsd.every(
  (o) => o.salaryPppInrCorrected === o.salaryInr && o.salaryPppInr === o.salaryInr,
);

console.log("GCC Nexus AI Engineer · Entry · National");
console.log(`  Salary_INR               ${gcc.salaryInr}  ${okSalary ? "OK" : "FAIL"}`);
console.log(`  Salary_PPP_INR (source)  ${gcc.salaryPppInr}  ${okSourcePpp ? "OK" : "FAIL"}`);
console.log(`  Salary_PPP_INR_Corrected ${gcc.salaryPppInrCorrected}  ${okCorrected ? "OK" : "FAIL"}`);
console.log(
  `  IN+USD rows where source PPP === corrected === Salary_INR: ${indiaUsdOk} (n=${indiaUsd.length})`,
);

if (!okSalary || !okSourcePpp || !okCorrected || !indiaUsdOk) process.exit(1);
console.log("PPP verified (bundled CSV + ingest correction).");
