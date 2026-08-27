/**
 * Integration-style scenario probe against ingested LCA data + market bands.
 * Mirrors src/lib/filters.ts + analysis.ts for offline verification.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { FX_USD_INR, incumbentMetricPay } from "./lib/metric-pay.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const obs = JSON.parse(readFileSync(join(root, "public/data/observations.json"), "utf8"));
const bands = JSON.parse(readFileSync(join(root, "public/data/marketBands.json"), "utf8"));

const DIRECTIONAL_N = 30;
const GEO_THRESHOLDS = { city: 5, metro: 10, state: 15, national: 30 };

const isPresent = (n) => n != null && Number.isFinite(n);
const metricOf = (o, metric) => (metric === "ppp" ? o.salaryPppInrCorrected : o.salaryInr);
const sortedNumbers = (values) => [...values].sort((a, b) => a - b);
const median = (values) => {
  if (!values.length) return null;
  const s = sortedNumbers(values);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const quantile = (values, q) => {
  if (!values.length) return null;
  const s = sortedNumbers(values);
  if (s.length === 1) return s[0];
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo];
  return s[lo] * (hi - pos) + s[hi] * (pos - lo);
};

function applyFilters(rows, filters) {
  const payTypes = filters.payTypes.length ? filters.payTypes : ["Base"];
  const inSet = (sel, v) => !sel.length || sel.includes(v);
  return rows.filter(
    (o) =>
      inSet(filters.countries, o.countryCode) &&
      inSet(filters.roleFamilies, o.roleFamily) &&
      inSet(filters.roleNames, o.roleName) &&
      inSet(filters.experienceLevels, o.experienceLevel) &&
      (!payTypes.length || payTypes.includes(o.payType)) &&
      inSet(filters.sources, o.sourceName) &&
      inSet(filters.cities, o.city) &&
      inSet(filters.metros ?? [], o.metro),
  );
}

function matchMarket(rows, profile) {
  const base = {
    countries: profile.countryCode ? [profile.countryCode] : [],
    roleFamilies: profile.roleFamily ? [profile.roleFamily] : [],
    roleNames: profile.roleName ? [profile.roleName] : [],
    experienceLevels: profile.experienceLevel ? [profile.experienceLevel] : [],
    payTypes: [profile.payType],
    sources: [],
    cities: profile.city ? [profile.city] : [],
    metros: profile.metro ? [profile.metro] : [],
  };
  let matched = applyFilters(rows, base);
  if (matched.length >= 8) return matched;
  if (profile.city || profile.metro) matched = applyFilters(rows, { ...base, cities: [], metros: [] });
  if (matched.length >= 8) return matched;
  if (profile.roleName) matched = applyFilters(rows, { ...base, cities: [], metros: [], roleNames: [] });
  if (matched.length >= 8) return matched;
  if (profile.experienceLevel && !profile.experienceLevel.startsWith("All")) {
    const withAll = applyFilters(rows, {
      ...base,
      cities: [],
      metros: [],
      roleNames: profile.roleName ? [] : base.roleNames,
      experienceLevels: [profile.experienceLevel, "All Levels (unspecified)"],
    });
    if (withAll.length > matched.length) matched = withAll;
  }
  if (matched.length < 5 && profile.roleFamily) {
    matched = applyFilters(rows, {
      countries: base.countries,
      roleFamilies: base.roleFamilies,
      roleNames: [],
      experienceLevels: [],
      payTypes: base.payTypes,
      sources: [],
      cities: [],
      metros: [],
    });
  }
  return matched;
}

function sliceCandidates(bands, profile) {
  return bands.filter(
    (b) =>
      (!profile.roleFamily || b.roleFamily === profile.roleFamily) &&
      b.payType === profile.payType &&
      b.countryCode === profile.countryCode &&
      (!profile.experienceLevel ||
        b.experienceLevel === profile.experienceLevel ||
        b.experienceLevel === "All Levels (unspecified)"),
  );
}

function preferExactExperience(candidates, profile) {
  if (!profile.experienceLevel) return candidates;
  const exact = candidates.filter((b) => b.experienceLevel === profile.experienceLevel);
  return exact.length ? exact : candidates.filter((b) => b.experienceLevel === "All Levels (unspecified)");
}

function matchMarketBand(bands, profile) {
  const candidates = preferExactExperience(sliceCandidates(bands, profile), profile);
  if (!candidates.length) return null;

  const tryPick = (level, predicate, minN) => {
    const hits = candidates.filter(
      (b) => b.geographyLevel === level && b.sampleSize >= minN && predicate(b),
    );
    hits.sort((a, b) => b.sampleSize - a.sampleSize);
    return hits[0] ?? null;
  };

  if (profile.city) {
    const city = tryPick("City", (b) => b.city === profile.city, GEO_THRESHOLDS.city);
    if (city) return city;
  }
  if (profile.metro) {
    const metro = tryPick("Metro", (b) => b.metro === profile.metro, GEO_THRESHOLDS.metro);
    if (metro) return metro;
  }
  return tryPick("National", () => true, GEO_THRESHOLDS.national);
}

function bandToMarket(record, metric) {
  const src =
    metric === "ppp"
      ? { p50: record.p50PppInr, p25: record.p25PppInr, p75: record.p75PppInr }
      : { p50: record.p50Inr, p25: record.p25Inr, p75: record.p75Inr };
  return { ...src, n: record.sampleSize, geographyLevel: record.geographyLevel };
}

function buildMarketBand(rows, metric) {
  const values = rows.map((o) => metricOf(o, metric)).filter(isPresent);
  return {
    p50: quantile(values, 0.5),
    p25: quantile(values, 0.25),
    p75: quantile(values, 0.75),
    n: values.length,
    directional: values.length > 0 && values.length < DIRECTIONAL_N,
  };
}

function classifyVerdict(gap) {
  if (gap == null) return "at_market";
  if (gap <= -8) return "underpaid";
  if (gap >= 8) return "overpaid";
  return "at_market";
}

function scoreRisk({ gapVsP50Pct, competitiveAbovePct, band }) {
  let score = 35;
  const gap = gapVsP50Pct;
  if (gap != null) {
    if (gap <= -25) score += 40;
    else if (gap <= -15) score += 28;
    else if (gap <= -8) score += 16;
    else if (gap >= 15) score -= 22;
    else if (gap >= 8) score -= 12;
  }
  if (competitiveAbovePct >= 70) score += 14;
  else if (competitiveAbovePct >= 55) score += 8;
  if (band.directional) score += 4;
  score = Math.max(0, Math.min(100, Math.round(score)));
  let tier;
  if (score >= 75) tier = "critical";
  else if (score >= 58) tier = "high";
  else if (score >= 42) tier = "watch";
  else if (score >= 28) tier = "stable";
  else tier = "premium";
  return { tier, score };
}

function analyze(profile, metric = "nominal") {
  const payProfile = {
    countryCode: profile.countryCode,
    currencyInput: "USD",
    rawAmount: profile.payUsd,
    currentPayInr: profile.payUsd * FX_USD_INR,
  };
  const yourPay = incumbentMetricPay(payProfile, metric);
  const matched = matchMarket(obs, profile);
  const matchedBand = matchMarketBand(bands, profile);
  const band = matchedBand ? bandToMarket(matchedBand, metric) : buildMarketBand(matched, metric);
  const gapVsP50Pct =
    band.p50 != null && band.p50 !== 0 ? ((yourPay - band.p50) / band.p50) * 100 : null;
  const aboveYou = matched.filter((o) => {
    const v = metricOf(o, metric);
    return isPresent(v) && v > yourPay;
  });
  const competitiveAbovePct = matched.length ? (aboveYou.length / matched.length) * 100 : 0;
  const verdict = classifyVerdict(gapVsP50Pct);
  const { tier, score } = scoreRisk({ gapVsP50Pct, competitiveAbovePct, band });
  return {
    yourPay,
    band,
    matchedBand,
    matchedN: matched.length,
    gapVsP50Pct,
    verdict,
    tier,
    score,
    aboveYou,
    metric,
  };
}

function topEmployerPulls(aboveYou, yourPay, metric, limit = 5) {
  const map = new Map();
  for (const o of aboveYou) {
    const key = o.employerGroup || o.employerName || "Unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(o);
  }
  const out = [];
  for (const [key, list] of map) {
    if (list.length < 2) continue;
    const values = list.map((o) => metricOf(o, metric)).filter(isPresent);
    const med = median(values);
    if (med == null) continue;
    out.push({ employer: key, n: list.length, medianPay: med, premiumPct: ((med - yourPay) / yourPay) * 100 });
  }
  return out.sort((a, b) => b.premiumPct - a.premiumPct).slice(0, limit);
}

const baseProfile = {
  countryCode: "US",
  roleFamily: "Data Scientist",
  roleName: "",
  experienceLevel: "Mid Level (3-5 years)",
  city: "",
  metro: "",
  payType: "Base",
};

let failed = 0;

function assert(name, cond, detail = "") {
  if (!cond) {
    console.error(`FAIL: ${name}${detail ? ` — ${detail}` : ""}`);
    failed += 1;
  } else {
    console.log(`OK: ${name}`);
  }
}

// US DS Mid National $130k — expect ~$116,300 P50 national band
const atMarket = analyze({ ...baseProfile, payUsd: 130_000 });
assert("130k DS Mid has national band", atMarket.matchedBand?.geographyLevel === "National");
assert(
  "130k P50 near $116,300",
  atMarket.matchedBand?.p50Usd != null && Math.abs(atMarket.matchedBand.p50Usd - 116_300) < 5000,
  `got P50 USD ${atMarket.matchedBand?.p50Usd}`,
);
assert(
  "130k gap positive (above P50)",
  atMarket.gapVsP50Pct != null && atMarket.gapVsP50Pct > 8,
  `gap ${atMarket.gapVsP50Pct?.toFixed(1)}%`,
);
assert("130k verdict overpaid or at_market high side", atMarket.verdict === "overpaid" || atMarket.gapVsP50Pct > 8);

// Underpaid $90k
const under = analyze({ ...baseProfile, payUsd: 90_000 });
assert("90k gap negative", under.gapVsP50Pct != null && under.gapVsP50Pct < -8, `gap ${under.gapVsP50Pct?.toFixed(1)}%`);
assert("90k verdict underpaid", under.verdict === "underpaid");
assert("90k elevated risk", under.tier === "high" || under.tier === "critical" || under.tier === "watch");

// Overpaid $200k
const over = analyze({ ...baseProfile, payUsd: 200_000 });
assert("200k gap strongly positive", over.gapVsP50Pct != null && over.gapVsP50Pct > 15);
assert("200k premium/stable tier", over.tier === "premium" || over.tier === "stable");

// Employer pull for underpaid DS
const pulls = topEmployerPulls(under.aboveYou, under.yourPay, "nominal", 3);
assert("employer pulls exist for underpaid DS", pulls.length >= 1, `found ${pulls.length}`);
if (pulls.length) {
  console.log("  Top employer pulls (underpaid $90k DS):");
  for (const p of pulls) {
    console.log(`    ${p.employer}: n=${p.n}, +${p.premiumPct.toFixed(0)}%`);
  }
}

console.log(`\nScenario summary @130k: gap ${atMarket.gapVsP50Pct?.toFixed(1)}%, tier ${atMarket.tier}, band n=${atMarket.band.n}`);

// PPP mode: yourPay and band both use PPP — gap should differ from nominal
const atMarketPpp = analyze({ ...baseProfile, payUsd: 130_000 }, "ppp");
assert(
  "PPP yourPay uses ×23 not FX",
  atMarketPpp.yourPay === 130_000 * 23,
  `got ${atMarketPpp.yourPay}`,
);
assert(
  "PPP band P50 uses p50PppInr",
  atMarketPpp.band.p50 === atMarketPpp.matchedBand?.p50PppInr,
);
assert(
  "PPP yourPay differs from nominal yourPay",
  atMarketPpp.yourPay !== atMarket.yourPay,
);
assert(
  "PPP gap % matches nominal (same USD ratio)",
  atMarketPpp.gapVsP50Pct != null &&
    atMarket.gapVsP50Pct != null &&
    Math.abs(atMarketPpp.gapVsP50Pct - atMarket.gapVsP50Pct) < 0.01,
);
assert("PPP mode still has verdict", atMarketPpp.verdict != null);

if (failed) {
  console.error(`\n${failed} scenario assertion(s) failed`);
  process.exit(1);
}
console.log("\nAll scenario tests passed.");
