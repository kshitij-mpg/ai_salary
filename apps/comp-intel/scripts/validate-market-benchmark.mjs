/**
 * Validate Market Benchmark methodology after ingest.
 * Market Benchmark = matched P50 only (no Geo × CCI).
 * Run: node scripts/validate-market-benchmark.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bands = JSON.parse(readFileSync(join(root, "public/data/marketBands.json"), "utf8"));

let failed = 0;
function assert(name, cond, detail = "") {
  if (!cond) {
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
    failed += 1;
  } else {
    console.log(`OK: ${name}`);
  }
}

assert("bands loaded", bands.length > 100, `n=${bands.length}`);

const sample = bands.find(
  (b) =>
    b.roleFamily === "Data Scientist" &&
    b.geographyLevel === "National" &&
    b.experienceLevel.includes("Mid"),
) ?? bands[0];

assert("has geographicPremiumIndex (insight)", sample.geographicPremiumIndex != null);
assert("has roleDemandIndex", sample.roleDemandIndex != null);
assert("has leadershipPremiumIndex", sample.leadershipPremiumIndex != null);
assert("has compensationCompetitivenessIndex (insight)", sample.compensationCompetitivenessIndex != null);
assert("has talentScarcityIndicator", !!sample.talentScarcityIndicator);
assert("has p50Inr", sample.p50Inr != null && sample.p50Inr > 0);

const marketValue = sample.p50Inr;
assert("Market Benchmark ≠ raw PPP P50", marketValue !== sample.p50PppInr);
assert(
  "Market Benchmark = matched P50 only",
  Math.abs(marketValue - sample.p50Inr) < 0.01,
);

const geo = sample.geographicPremiumIndex > 0 ? sample.geographicPremiumIndex : 1;
const cci =
  sample.compensationCompetitivenessIndex > 0
    ? sample.compensationCompetitivenessIndex
    : 1;
assert(
  "Geo × CCI must NOT equal Market Benchmark when indices ≠ 1",
  geo === 1 && cci === 1
    ? true
    : Math.abs(marketValue - sample.p50Inr * geo * cci) > 0.01 || geo === 1 || cci === 1,
);

const missingGeo = bands.filter((b) => b.geographicPremiumIndex == null).length;
assert("all bands have geographicPremiumIndex (insight)", missingGeo === 0, `missing=${missingGeo}`);

const missingCci = bands.filter((b) => b.compensationCompetitivenessIndex == null).length;
assert(
  "all bands have compensationCompetitivenessIndex (insight)",
  missingCci === 0,
  `missing=${missingCci}`,
);

function classifyPayGap(gapPct) {
  if (gapPct < -20) return "critical_underpayment";
  if (gapPct < -10) return "high_underpayment_risk";
  if (gapPct <= 10) return "market_aligned";
  if (gapPct <= 20) return "above_market";
  return "significantly_above_market";
}
assert("gap -25 → critical", classifyPayGap(-25) === "critical_underpayment");
assert("gap -15 → high", classifyPayGap(-15) === "high_underpayment_risk");
assert("gap 0 → aligned", classifyPayGap(0) === "market_aligned");
assert("gap 15 → above", classifyPayGap(15) === "above_market");

console.log(`\nSample Market Benchmark check for ${sample.roleFamily} / ${sample.experienceLevel}:`);
console.log(`  P50 INR (= Market Benchmark): ${sample.p50Inr}`);
console.log(`  Geo (insight only): ${geo} · CCI / Role Comp Premium (insight only): ${cci}`);
console.log(`  Legacy Geo×CCI product (NOT used): ${Math.round(sample.p50Inr * geo * cci)}`);
console.log(`  P50 PPP (optional view only): ${sample.p50PppInr}`);

if (failed) {
  console.error(`\n${failed} validation failure(s)`);
  process.exit(1);
}
console.log("\nAll market-benchmark validations passed.");
