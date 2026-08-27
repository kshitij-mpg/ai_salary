/**
 * Verify PPP correction fields on ingested observations.
 * Run after `npm run ingest`.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertUsdToPppInr, FX_USD_INR, salaryPppInrCorrected } from "./lib/metric-pay.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.resolve(__dirname, "../public/data/observations.json");

if (!fs.existsSync(jsonPath)) {
  console.error("Run npm run ingest first.");
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
let failed = 0;

function assert(name, cond, detail = "") {
  if (!cond) {
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
    failed += 1;
  } else {
    console.log(`OK: ${name}`);
  }
}

assert("observations loaded", rows.length > 0, `n=${rows.length}`);

const us = rows.find(
  (o) =>
    o.countryCode === "US" &&
    o.salaryUsd != null &&
    o.salaryUsd > 0 &&
    o.salaryPppInrCorrected != null,
);
assert("US filing sample exists", !!us);
if (us) {
  const expected = convertUsdToPppInr(us.salaryUsd);
  assert(
    "US PPP-corrected ≈ USD × 23",
    Math.abs(us.salaryPppInrCorrected - expected) < 1,
    `got ${us.salaryPppInrCorrected} expect ${expected}`,
  );
  assert(
    "US cash FX ≠ PPP absolute",
    us.salaryInr !== us.salaryPppInrCorrected,
    `both ${us.salaryInr}`,
  );
  assert(
    "Helper matches ingest for US",
    Math.abs(salaryPppInrCorrected(us.salaryInr, "US") - us.salaryPppInrCorrected) < 1,
  );
}

const india = rows.filter((o) => o.countryCode === "IN");
if (india.length) {
  const identityOk = india.every(
    (o) =>
      o.salaryPppInrCorrected == null ||
      Math.abs(o.salaryPppInrCorrected - o.salaryInr) < 0.01,
  );
  assert(`India PPP identity (n=${india.length})`, identityOk);
} else {
  console.log("OK: no India rows in current LCA slice (US-only dataset)");
}

const nullPpp = rows.filter((o) => o.salaryPppInrCorrected == null).length;
assert("All filings have PPP-corrected values", nullPpp === 0, `null=${nullPpp}`);

assert("Study FX constant", FX_USD_INR === 95.43);

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nPPP verified against ingested observations.");
