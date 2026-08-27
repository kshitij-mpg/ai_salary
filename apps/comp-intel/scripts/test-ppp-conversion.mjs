/**
 * Unit tests: USD → PPP-adjusted INR (World Bank India factor ×23).
 *
 * Run: npm run test:ppp
 */
import {
  FX_USD_INR,
  INDIA_PPP_FACTOR,
  convertUsdToPppInr,
  salaryPppInrCorrected,
} from "./lib/metric-pay.mjs";

const cases = [
  { usd: 100_000, expected: 2_300_000 },
  { usd: 150_000, expected: 3_450_000 },
  { usd: 200_000, expected: 4_600_000 },
];

let failed = 0;

console.log(`INDIA_PPP_FACTOR = ${INDIA_PPP_FACTOR}`);
for (const { usd, expected } of cases) {
  const got = convertUsdToPppInr(usd);
  const ok = got === expected;
  console.log(
    `convertUsdToPppInr(${usd.toLocaleString("en-US")}) → ${got.toLocaleString("en-IN")}  ` +
      `(expect ${expected.toLocaleString("en-IN")})  ${ok ? "OK" : "FAIL"}`,
  );
  if (!ok) failed += 1;
}

for (const { usd, expected } of cases) {
  const salaryInr = usd * FX_USD_INR;
  const got = salaryPppInrCorrected(salaryInr, "US");
  const rounded = Math.round(got * 100) / 100;
  const ok = Math.abs(rounded - expected) < 0.01;
  console.log(
    `salaryPppInrCorrected(US, $${usd}) → ${rounded}  (expect ${expected})  ${ok ? "OK" : "FAIL"}`,
  );
  if (!ok) failed += 1;
}

const indiaGot = salaryPppInrCorrected(1_800_000, "IN");
const indiaOk = indiaGot === 1_800_000;
console.log(`India PPP identity 1,800,000 → ${indiaGot}  ${indiaOk ? "OK" : "FAIL"}`);
if (!indiaOk) failed += 1;

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll PPP conversion unit tests passed.");
