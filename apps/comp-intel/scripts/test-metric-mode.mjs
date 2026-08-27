/**
 * Regression tests: current salary stays FX across modes; benchmarks diverge.
 *
 * Run: npm run test:metric
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  FX_USD_INR,
  convertUsdToPppInr,
  incumbentMetricPay,
  incumbentPppPay,
  salaryPppInrCorrected,
  selectedBenchmarkValue,
} from "./lib/metric-pay.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let failed = 0;

function assert(name, cond, detail = "") {
  if (!cond) {
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
    failed += 1;
  } else {
    console.log(`OK: ${name}`);
  }
}

const usProfile = {
  countryCode: "US",
  currencyInput: "USD",
  rawAmount: 150_000,
  currentPayInr: 150_000 * FX_USD_INR,
};

const inProfile = {
  countryCode: "IN",
  currencyInput: "INR",
  rawAmount: 1_800_000,
  currentPayInr: 1_800_000,
};

assert("USD 100k → PPP ₹23L", convertUsdToPppInr(100_000) === 2_300_000);
assert(
  "US salaryPppInrCorrected",
  salaryPppInrCorrected(100_000 * FX_USD_INR, "US") === 2_300_000,
);
assert("India PPP identity", salaryPppInrCorrected(1_800_000, "IN") === 1_800_000);

const modes = ["talent", "market", "fx", "ppp", "nominal"];
const fxCurrent = 150_000 * FX_USD_INR;
for (const m of modes) {
  assert(
    `Current salary stable in ${m}`,
    incumbentMetricPay(usProfile, m) === fxCurrent,
    `got ${incumbentMetricPay(usProfile, m)}`,
  );
}
assert("PPP equivalent of current is distinct", incumbentPppPay(usProfile) === 150_000 * 23);
assert("India current unchanged", incumbentMetricPay(inProfile, "ppp") === 1_800_000);

const bands = JSON.parse(readFileSync(join(root, "public/data/marketBands.json"), "utf8"));

// Prefer High scarcity + CCI>1 so Talent, Market, FX, PPP are all distinct.
const band =
  bands.find(
    (b) =>
      String(b.talentScarcityIndicator).toLowerCase() === "high" &&
      b.p50Inr > 0 &&
      (b.compensationCompetitivenessIndex ?? 0) > 1.05,
  ) ??
  bands.find(
    (b) =>
      b.roleFamily === "Data Scientist" &&
      b.countryCode === "US" &&
      b.experienceLevel === "Mid Level (3-5 years)" &&
      b.geographyLevel === "National" &&
      b.payType === "Base",
  );

if (band) {
  const current = incumbentMetricPay(usProfile, "fx");
  const talent = selectedBenchmarkValue("talent", band.p50Inr, band, current);
  const market = selectedBenchmarkValue("market", band.p50Inr, band, current);
  const fx = selectedBenchmarkValue("fx", band.p50Inr, band, current);
  const ppp = selectedBenchmarkValue("ppp", band.p50Inr, band, current);

  assert("FX benchmark ≈ current FX", Math.abs(fx - current) < 0.01, `got ${fx}`);
  assert("PPP benchmark = USD×23", Math.abs(ppp - 150_000 * 23) < 0.01);
  assert("FX gap 0%", Math.abs(((current - fx) / fx) * 100) < 0.001);
  assert("Talent ≥ Market", talent >= market - 0.01);
  assert(
    "Four mode benchmarks distinct",
    new Set([talent, market, fx, ppp].map((x) => Math.round(x))).size === 4,
    `t=${Math.round(talent)} m=${Math.round(market)} fx=${Math.round(fx)} ppp=${Math.round(ppp)}`,
  );

  // Synthetic product brief: P50=$150k, geo=1, cci=1.15, High scarcity → ×1.20
  const synthetic = {
    geographicPremiumIndex: 1,
    compensationCompetitivenessIndex: 1.15,
    roleDemandIndex: 0,
    talentScarcityIndicator: "High",
  };
  const synP50 = 150_000 * FX_USD_INR;
  const synMarket = selectedBenchmarkValue("market", synP50, synthetic, current);
  const synTalent = selectedBenchmarkValue("talent", synP50, synthetic, current);
  assert("Brief Market ≈ ₹1.65 Cr", Math.abs(synMarket - 172_500 * FX_USD_INR) < 1);
  assert("Brief Talent ≈ ₹1.99 Cr", Math.abs(synTalent - 172_500 * 1.2 * FX_USD_INR) < 1);

  console.log("\n--- $150k mode benchmarks ---");
  console.log(`  Band: ${band.roleFamily} / ${band.experienceLevel} / scarcity=${band.talentScarcityIndicator}`);
  console.log(`  Current (FX): ${Math.round(current)}`);
  console.log(`  Talent:       ${Math.round(talent)}`);
  console.log(`  Market:       ${Math.round(market)}`);
  console.log(`  FX:           ${Math.round(fx)}`);
  console.log(`  PPP:          ${Math.round(ppp)}`);
} else {
  console.warn("SKIP: band not found — run ingest first");
}

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll metric-mode regression tests passed.");
