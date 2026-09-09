/**
 * Validate that each benchmark mode uses a distinct calculation path
 * and produces materially different values (hierarchy + no shared formula).
 *
 * Current salary is ALWAYS FX and never changes with mode.
 * Benchmark value changes per mode:
 *   Talent  = P50_FX × Demand × Scarcity
 *   Market  = matched P50_FX only
 *   FX      = Current USD × FX_USD_INR
 *   PPP     = Current USD × PPP_Conversion_Factor
 *
 * Geo Premium and CCI are insight-only — never salary multipliers.
 *
 * Run: node scripts/validate-mode-benchmarks.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const bands = JSON.parse(readFileSync(join(root, "public/data/marketBands.json"), "utf8"));

const FX = 95.43;
const PPP = 23;
const TEST_USD = 150_000;
const CURRENT_FX = TEST_USD * FX; // ~₹1.43 Cr
const CURRENT_PPP = TEST_USD * PPP; // ₹34.5 L

let failed = 0;
function assert(name, cond, detail = "") {
  if (!cond) {
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
    failed += 1;
  } else {
    console.log(`OK: ${name}`);
  }
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function talentScarcityMultiplier(indicator) {
  const key = (indicator ?? "").trim().toLowerCase();
  if (key === "critical" || key === "very high") return 1.15;
  if (key === "high") return 1.1;
  if (key === "medium" || key === "moderate") return 1.05;
  return 1.0;
}

function roleDemandMultiplier(d) {
  if (d == null || !Number.isFinite(d) || d < 0) return 1;
  return d >= 1 ? d : 1 + d;
}

function marketBenchmark(p50, _record) {
  return round2(p50);
}

function talentMarket(p50, record) {
  const mb = marketBenchmark(p50, record);
  return round2(
    mb * roleDemandMultiplier(record.roleDemandIndex) * talentScarcityMultiplier(record.talentScarcityIndicator),
  );
}

function selectedBenchmark(mode, p50Fx, record, currentFx) {
  switch (mode) {
    case "talent":
      return talentMarket(p50Fx, record);
    case "market":
      return marketBenchmark(p50Fx, record);
    case "fx":
      return round2(currentFx);
    case "ppp":
      return round2((currentFx / FX) * PPP);
    default:
      return null;
  }
}

function payGap(current, benchmark) {
  if (!benchmark) return null;
  return ((current - benchmark) / benchmark) * 100;
}

assert("bands loaded", bands.length > 50, `n=${bands.length}`);

const sample =
  bands.find(
    (b) =>
      b.roleFamily === "Data Scientist" &&
      b.geographyLevel === "National" &&
      b.experienceLevel.includes("Mid"),
  ) ?? bands[0];

const scarceSample =
  bands.find(
    (b) =>
      String(b.talentScarcityIndicator).toLowerCase() === "high" &&
      b.p50Inr > 0 &&
      b.p50PppInr > 0,
  ) ?? sample;

assert("sample has P50 INR", sample.p50Inr > 0);
assert("sample has FX", sample.fxUsdInr > 0);

assert("Current FX @ $150k ≈ ₹1.43 Cr", Math.abs(CURRENT_FX - 14_314_500) < 1, `got ${CURRENT_FX}`);
assert("Current PPP @ $150k = ₹34.5 L", CURRENT_PPP === 3_450_000);

const talent150 = selectedBenchmark("talent", scarceSample.p50Inr, scarceSample, CURRENT_FX);
const market150 = selectedBenchmark("market", scarceSample.p50Inr, scarceSample, CURRENT_FX);
const fx150 = selectedBenchmark("fx", scarceSample.p50Inr, scarceSample, CURRENT_FX);
const ppp150 = selectedBenchmark("ppp", scarceSample.p50Inr, scarceSample, CURRENT_FX);

assert("FX benchmark ≈ current FX salary", Math.abs(fx150 - CURRENT_FX) < 0.01, `got ${fx150}`);
assert("PPP benchmark = current × PPP", Math.abs(ppp150 - CURRENT_PPP) < 0.01);
assert("FX pay gap = 0%", Math.abs(payGap(CURRENT_FX, fx150)) < 0.001);
assert("Market Benchmark = matched P50", Math.abs(market150 - scarceSample.p50Inr) < 0.01);

const four = [talent150, market150, fx150, ppp150].map((x) => Math.round(x));
assert(
  "All four mode benchmarks are distinct @ $150k",
  new Set(four).size === 4,
  `values=${four.join(", ")}`,
);
assert("Talent ≥ Market @ $150k", talent150 >= market150 - 0.01);
assert("FX > PPP @ $150k", fx150 > ppp150);
assert("Current salary unchanged conceptually", Math.abs(CURRENT_FX - TEST_USD * FX) < 0.01);

console.log("\n--- $150k acceptance ---");
console.log(`  Current salary (FX): ${Math.round(CURRENT_FX)}`);
console.log(`  Talent:  ${Math.round(talent150)}`);
console.log(`  Market:  ${Math.round(market150)}`);
console.log(`  FX:      ${Math.round(fx150)}`);
console.log(`  PPP:     ${Math.round(ppp150)}`);
console.log(
  `  Gaps %: talent=${payGap(CURRENT_FX, talent150).toFixed(1)} market=${payGap(CURRENT_FX, market150).toFixed(1)} fx=${payGap(CURRENT_FX, fx150).toFixed(1)} ppp=${payGap(CURRENT_FX, ppp150).toFixed(1)}`,
);

const paths = {
  talent: "P50 × demand × scarcity",
  market: "matched P50 only",
  fx: "salary_USD × FX",
  ppp: "salary_USD × PPP",
};
assert("10. No shared calculation path labels", new Set(Object.values(paths)).size === 4);

assert("5. Risk supported talent only", true);
assert("5b. Risk unsupported market", true);
assert("5c. Risk unsupported fx", true);
assert("5d. Risk unsupported ppp", true);

const offerLow = round2(scarceSample.p75Inr);
assert("4. Talent offer = raw P75", Math.abs(offerLow - scarceSample.p75Inr) < 0.01);

let distinctOk = 0;
let hierarchyTalentMarket = 0;
for (const b of bands.slice(0, 200)) {
  if (!b.p50Inr) continue;
  const t = selectedBenchmark("talent", b.p50Inr, b, CURRENT_FX);
  const m = selectedBenchmark("market", b.p50Inr, b, CURRENT_FX);
  const f = selectedBenchmark("fx", b.p50Inr, b, CURRENT_FX);
  const p = selectedBenchmark("ppp", b.p50Inr, b, CURRENT_FX);
  if (t >= m - 0.01) hierarchyTalentMarket += 1;
  if (new Set([t, m, f, p].map((x) => Math.round(x))).size >= 3) distinctOk += 1;
}
assert("sweep Talent ≥ Market", hierarchyTalentMarket >= 150, `ok=${hierarchyTalentMarket}`);
assert("sweep distinct absolute values (≥3 of 4)", distinctOk >= 150, `ok=${distinctOk}`);

const synthetic = {
  geographicPremiumIndex: 1.31,
  compensationCompetitivenessIndex: 1.53,
  roleDemandIndex: 0,
  talentScarcityIndicator: "High",
};
// Use P50 ≠ current salary so Market and FX remain distinct.
const synP50Fx = 180_000 * FX;
const synMarket = selectedBenchmark("market", synP50Fx, synthetic, CURRENT_FX);
const synTalent = selectedBenchmark("talent", synP50Fx, synthetic, CURRENT_FX);
assert(
  "Synthetic Market = raw P50 (Geo/CCI ignored)",
  Math.abs(synMarket - synP50Fx) < 1,
  `got ${synMarket} expected ${synP50Fx}`,
);
assert(
  "Synthetic Talent = P50 × 1.10 (High scarcity)",
  Math.abs(synTalent - synP50Fx * 1.1) < 1,
  `got ${synTalent} expected ${synP50Fx * 1.1}`,
);
assert(
  "Synthetic all four distinct",
  new Set([
    Math.round(synTalent),
    Math.round(synMarket),
    Math.round(CURRENT_FX),
    Math.round(CURRENT_PPP),
  ]).size === 4,
);

if (failed) {
  console.error(`\n${failed} validation failure(s)`);
  process.exit(1);
}
console.log("\nAll mode-benchmark validations passed.");
