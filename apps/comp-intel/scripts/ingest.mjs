/**
 * Build-time ingest: India multi-metro tech role benchmarks → lean typed JSON.
 *
 * Sources of truth (ai_salary/):
 *   - india_tech_roles_benchmark.csv          → observations.json (sampled filing grain)
 *   - india_tech_roles_benchmark_summary.csv  → marketBands.json (Role × Experience + metros)
 *
 * Legacy US LCA deliverables/analytics_ready/*.csv are intentionally bypassed.
 *
 * Payload discipline:
 *   - Drop unused long string columns (SOC, Decision_Date, Notes, Source_URL, …)
 *   - Cap Evidence ledger at MAX_PER_SLICE top-paying filings per Role×Experience
 *   - Pre-compute payBins on each market band for Recharts (full population, not sample)
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const aiSalaryRoot = path.resolve(appRoot, "../..");

const FILING_CSV = path.join(aiSalaryRoot, "india_tech_roles_benchmark.csv");
const SUMMARY_CSV = path.join(aiSalaryRoot, "india_tech_roles_benchmark_summary.csv");

/** Max detailed filings kept per Role_Name × Experience_Band for Evidence. */
const MAX_PER_SLICE = 60;
/** Histogram bins stored on each market band (full population). */
const PAY_BIN_COUNT = 14;

const HUB_IDS = ["bengaluru", "mumbai", "delhi_ncr", "hyderabad", "chennai", "pune"];

const SUMMARY_HUB_COLS = {
  bengaluru: {
    p25: "Benchmark_INR_P25",
    p50: "Benchmark_INR_Median",
    p75: "Benchmark_INR_P75",
    mean: "Benchmark_INR_Mean",
  },
  mumbai: {
    p25: "Benchmark_Mumbai_P25",
    p50: "Benchmark_Mumbai_Median",
    p75: "Benchmark_Mumbai_P75",
    mean: "Benchmark_Mumbai_Mean",
  },
  delhi_ncr: {
    p25: "Benchmark_Delhi_NCR_P25",
    p50: "Benchmark_Delhi_NCR_Median",
    p75: "Benchmark_Delhi_NCR_P75",
    mean: "Benchmark_Delhi_NCR_Mean",
  },
  hyderabad: {
    p25: "Benchmark_Hyderabad_P25",
    p50: "Benchmark_Hyderabad_Median",
    p75: "Benchmark_Hyderabad_P75",
    mean: "Benchmark_Hyderabad_Mean",
  },
  chennai: {
    p25: "Benchmark_Chennai_P25",
    p50: "Benchmark_Chennai_Median",
    p75: "Benchmark_Chennai_P75",
    mean: "Benchmark_Chennai_Mean",
  },
  pune: {
    p25: "Benchmark_Pune_P25",
    p50: "Benchmark_Pune_Median",
    p75: "Benchmark_Pune_P75",
    mean: "Benchmark_Pune_Mean",
  },
};

const FILING_HUB_COLS = {
  bengaluru: "Benchmark_INR_Salary",
  mumbai: "Benchmark_INR_Mumbai",
  delhi_ncr: "Benchmark_INR_Delhi_NCR",
  hyderabad: "Benchmark_INR_Hyderabad",
  chennai: "Benchmark_INR_Chennai",
  pune: "Benchmark_INR_Pune",
};

function num(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function intInr(v) {
  const n = num(v);
  if (n == null) return null;
  return Math.round(n);
}

function str(v) {
  if (v == null) return "";
  return String(v).trim();
}

function slug(s) {
  return str(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function scarcityToTalent(band) {
  const key = str(band).toLowerCase();
  if (key.includes("specialized") || key.includes("critical")) return "High";
  if (key.includes("standard")) return "Medium";
  if (key.includes("baseline")) return "Low";
  return "Medium";
}

function countBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const k = keyFn(row);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

function topN(map, n = 200) {
  return [...map.entries()]
    .map(([name, count]) => ({ name, n: count }))
    .sort((a, b) => b.n - a.n)
    .slice(0, n);
}

function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const stream = fs.createReadStream(filePath, { encoding: "utf8" });
    Papa.parse(stream, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => String(h ?? "").replace(/^\uFEFF/, "").trim(),
      step: (result) => {
        if (result.data && typeof result.data === "object") rows.push(result.data);
      },
      complete: () => resolve(rows),
      error: (err) => reject(err),
    });
  });
}

function buildHubPay(r) {
  const hubPay = {};
  for (const hub of HUB_IDS) {
    const v = intInr(r[FILING_HUB_COLS[hub]]);
    if (v != null) hubPay[hub] = v;
  }
  return hubPay;
}

/**
 * Minimal Evidence filing row (hydrated to full Observation shape at app load).
 * Omits SOC_Code, Decision_Date, Source_URL, Notes, Collection_Date, Visa, FY,
 * constant geography strings, PPP/FX nulls, and duplicate employerGroup.
 */
function mapSlimFiling(r, idx) {
  const hubPay = buildHubPay(r);
  const salaryInr = hubPay.bengaluru ?? intInr(r.Benchmark_INR_Salary);
  if (salaryInr == null) return null;

  const roleName = str(r.Role_Name);
  const experienceLevel = str(r.Experience_Band);
  if (!roleName || !experienceLevel) return null;

  const employer = str(r.Employer_Name);
  const out = {
    id: str(r.Record_ID) || `f${idx + 1}`,
    countryCode: "IN",
    city: str(r.City),
    roleName,
    roleFamily: str(r.Role_Family) || "Other AI/Tech",
    experienceLevel,
    payType: str(r.Pay_Type) || "Base",
    salaryInr,
    employerName: employer,
    qualityFlag: str(r.Data_Quality_Flag),
    hubPay,
    isEmployerFiling: true,
  };
  // Drop empty optional strings to shrink JSON
  if (!out.city) delete out.city;
  if (!out.qualityFlag) delete out.qualityFlag;
  if (!employer) delete out.employerName;
  return out;
}

function buildPayBins(values, binCount = PAY_BIN_COUNT) {
  if (!values.length) return [];
  const s = [...values].sort((a, b) => a - b);
  const lo = s[0];
  const hi = s[s.length - 1];
  if (lo === hi) return [{ x0: lo, x1: hi, n: s.length }];
  const width = (hi - lo) / binCount;
  const out = Array.from({ length: binCount }, (_, i) => ({
    x0: Math.round(lo + i * width),
    x1: Math.round(lo + (i + 1) * width),
    n: 0,
  }));
  for (const v of s) {
    let idx = Math.floor((v - lo) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    out[idx].n += 1;
  }
  return out;
}

/**
 * Keep top-paying progressive sample per Role × Experience (Evidence ledger).
 * Tie-break with stable id so re-ingests are deterministic.
 */
function sampleFilings(all) {
  const bySlice = new Map();
  for (const o of all) {
    const key = `${o.roleName}||${o.experienceLevel}`;
    let arr = bySlice.get(key);
    if (!arr) {
      arr = [];
      bySlice.set(key, arr);
    }
    arr.push(o);
  }

  const sampled = [];
  let slicesOverCap = 0;
  for (const [, arr] of bySlice) {
    if (arr.length > MAX_PER_SLICE) {
      slicesOverCap += 1;
      arr.sort((a, b) => b.salaryInr - a.salaryInr || String(a.id).localeCompare(String(b.id)));
      sampled.push(...arr.slice(0, MAX_PER_SLICE));
    } else {
      sampled.push(...arr);
    }
  }
  return { sampled, sliceCount: bySlice.size, slicesOverCap };
}

function buildMetrosFromSummary(r) {
  const metros = {};
  for (const hub of HUB_IDS) {
    const cols = SUMMARY_HUB_COLS[hub];
    const p25 = intInr(r[cols.p25]);
    const p50 = intInr(r[cols.p50]);
    const p75 = intInr(r[cols.p75]);
    const mean = intInr(r[cols.mean]);
    if (p25 == null && p50 == null && p75 == null && mean == null) continue;
    metros[hub] = { p25, p50, p75, mean };
  }
  return metros;
}

function mapBand(r, idx, payBinsBySlice) {
  const roleFamily = str(r.Role_Family);
  const roleName = str(r.Role_Name);
  const experienceBand = str(r.Experience_Band);
  if (!roleFamily || !experienceBand) return null;

  const metros = buildMetrosFromSummary(r);
  const baseline = metros.bengaluru;
  if (baseline?.p50 == null) return null;

  const sampleSize = num(r.Sample_Size) ?? 0;
  const idSeed = `${roleFamily}|${roleName}|${experienceBand}|${idx}`;
  const id = createHash("sha1").update(idSeed).digest("hex").slice(0, 16);
  const sliceKey = `${roleName}||${experienceBand}`;
  const payBins = payBinsBySlice.get(sliceKey) ?? [];

  const { p25, p50, p75, mean } = baseline;

  return {
    id,
    roleFamily,
    roleFamilyKey: slug(roleFamily),
    roleName,
    countryCode: "IN",
    countryName: "India",
    geographyLevel: "Multi-Metro",
    geographyName: str(r.Target_City_Hub) || "Multi-Metro Calibrated",
    state: "",
    city: "",
    metro: "Multi-Metro Calibrated",
    experienceLevel: experienceBand,
    experienceBandKey: slug(experienceBand),
    payType: "Base",
    compensationDefinition: "India_Tech_Benchmark_INR",
    currency: "INR",
    p10Usd: null,
    p25Usd: null,
    p50Usd: null,
    p75Usd: null,
    p90Usd: null,
    minUsd: null,
    maxUsd: null,
    meanUsd: null,
    p10Inr: p25,
    p25Inr: p25,
    p50Inr: p50,
    p75Inr: p75,
    p90Inr: p75,
    minInr: p25,
    maxInr: p75,
    meanInr: mean,
    p10PppInr: null,
    p25PppInr: null,
    p50PppInr: null,
    p75PppInr: null,
    p90PppInr: null,
    minPppInr: null,
    maxPppInr: null,
    meanPppInr: null,
    sampleSize,
    geographicPremiumIndex: 1.0,
    leadershipPremiumIndex: num(r.Gamma_Exp_Mode),
    roleDemandIndex: null,
    talentScarcityIndicator: scarcityToTalent(r.Role_Scarcity_Band),
    compensationCompetitivenessIndex: num(r.Omega_Role),
    sourceName: "India Tech Roles Benchmark Summary",
    collectionDate: "",
    fxUsdInr: 1,
    fxConversionDate: "",
    notes: `Role×Experience multi-metro band. Grain=${str(r.Grain)}. Currency=INR.`,
    metros,
    payBins,
  };
}

function buildCatalog(observations, marketBands, filingTotal) {
  const byFamily = countBy(marketBands, (b) => b.roleFamily);
  const byRole = countBy(marketBands, (b) => b.roleName);
  const byExp = countBy(marketBands, (b) => b.experienceLevel);
  const byPay = countBy(observations, (o) => o.payType);
  const byEmployer = countBy(observations, (o) => o.employerName || o.employerGroup);
  const byCity = countBy(observations, (o) => (o.city ? `IN||${o.city}` : ""));

  const rolesByFamily = {};
  for (const b of marketBands) {
    if (!rolesByFamily[b.roleFamily]) rolesByFamily[b.roleFamily] = new Map();
    const m = rolesByFamily[b.roleFamily];
    m.set(b.roleName, (m.get(b.roleName) ?? 0) + 1);
  }
  const roleNamesByFamily = Object.fromEntries(
    Object.entries(rolesByFamily).map(([family, map]) => [
      family,
      [...map.entries()]
        .map(([name, n]) => ({ name, n }))
        .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name)),
    ]),
  );

  return {
    generatedFrom: [
      "ai_salary/india_tech_roles_benchmark.csv",
      "ai_salary/india_tech_roles_benchmark_summary.csv",
    ],
    rowCount: observations.length,
    filingPopulation: filingTotal,
    bandCount: marketBands.length,
    grain: "Sampled Filing + Role_x_Experience (Multi-Metro)",
    grainNotes:
      "PRIMARY: India Role×Experience summary bands with per-hub INR percentiles (Bengaluru + 5 metros). Evidence filings are a top-paying progressive sample (≤150 per Role×Experience). payBins on bands use the full filing population. No US FX/PPP conversion layer.",
    countries: [{ code: "IN", name: "India", n: observations.length }],
    roleFamilies: topN(byFamily, 200),
    roleNames: topN(byRole, 500),
    roleNamesByFamily,
    experienceLevels: [...byExp.entries()]
      .map(([name, n]) => ({ name, n }))
      .sort((a, b) => b.n - a.n),
    payTypes: [...byPay.entries()].map(([name, n]) => ({ name, n })),
    cities: [...byCity.entries()]
      .map(([key, n]) => {
        const [, name] = key.split("||");
        return { countryCode: "IN", name, n };
      })
      .filter((c) => c.name)
      .sort((a, b) => b.n - a.n)
      .slice(0, 200),
    metros: HUB_IDS.map((id) => ({
      countryCode: "IN",
      name:
        id === "bengaluru"
          ? "Bengaluru"
          : id === "delhi_ncr"
            ? "Delhi-NCR"
            : id.charAt(0).toUpperCase() + id.slice(1),
      n: observations.length,
    })),
    states: [],
    employerGroups: topN(byEmployer, 120),
    hubs: HUB_IDS,
    fxUsdInr: 1,
    pppFactor: 1,
    fxConversionDate: "",
    collectionDate: "",
    compensationDefinition: "India_Tech_Benchmark_INR",
    disclaimer:
      "India tech multi-metro benchmarks (Bengaluru baseline = 1.0). Hub columns are geographic cost indices. Evidence rows are a progressive sample; band percentiles and payBins reflect the full population.",
    countryFxToInr: { IN: 1 },
    worldBankPpp: { IN: 1 },
  };
}

async function main() {
  for (const p of [FILING_CSV, SUMMARY_CSV]) {
    if (!fs.existsSync(p)) {
      console.error(`CSV not found: ${p}`);
      process.exit(1);
    }
  }

  console.log(`Parsing filings: ${FILING_CSV}`);
  const filingRaw = await parseCsvFile(FILING_CSV);
  console.log(`  raw filing rows: ${filingRaw.length}`);

  console.log(`Parsing summary bands: ${SUMMARY_CSV}`);
  const summaryRaw = await parseCsvFile(SUMMARY_CSV);
  console.log(`  raw summary rows: ${summaryRaw.length}`);

  const allFilings = filingRaw
    .map((r, i) => mapSlimFiling(r, i))
    .filter((o) => o && o.salaryInr != null);

  // Full-population histogram bins per Role × Experience (before sampling).
  const payBinsBySlice = new Map();
  {
    const salaries = new Map();
    for (const o of allFilings) {
      const key = `${o.roleName}||${o.experienceLevel}`;
      let arr = salaries.get(key);
      if (!arr) {
        arr = [];
        salaries.set(key, arr);
      }
      arr.push(o.salaryInr);
    }
    for (const [key, vals] of salaries) {
      payBinsBySlice.set(key, buildPayBins(vals));
    }
  }

  const { sampled, sliceCount, slicesOverCap } = sampleFilings(allFilings);
  console.log(
    `  sampled Evidence filings: ${sampled.length} (from ${allFilings.length}; ${sliceCount} slices; ${slicesOverCap} over cap ${MAX_PER_SLICE})`,
  );

  const marketBands = summaryRaw
    .map((r, i) => mapBand(r, i, payBinsBySlice))
    .filter((b) => b && b.metros?.bengaluru?.p50 != null);

  const catalog = buildCatalog(sampled, marketBands, allFilings.length);

  const outDir = path.join(appRoot, "public", "data");
  fs.mkdirSync(outDir, { recursive: true });

  const obsJson = JSON.stringify(sampled);
  const bandsJson = JSON.stringify(marketBands);
  fs.writeFileSync(path.join(outDir, "observations.json"), obsJson);
  fs.writeFileSync(path.join(outDir, "marketBands.json"), bandsJson);
  fs.writeFileSync(path.join(outDir, "catalog.json"), JSON.stringify(catalog, null, 2));

  const obsMb = Buffer.byteLength(obsJson) / (1024 * 1024);
  const bandsMb = Buffer.byteLength(bandsJson) / (1024 * 1024);

  const sample = marketBands[0];
  console.log(`Wrote observations.json: ${sampled.length} rows · ${obsMb.toFixed(2)} MB`);
  console.log(`Wrote marketBands.json: ${marketBands.length} bands · ${bandsMb.toFixed(2)} MB`);
  console.log("Sample marketBands[0] hub medians (metros.*):");
  if (sample?.metros) {
    for (const hub of HUB_IDS) {
      const m = sample.metros[hub];
      console.log(
        `  ${hub.padEnd(12)} P25=${m?.p25}  Median=${m?.p50}  P75=${m?.p75}  Mean=${m?.mean}`,
      );
    }
    console.log(
      `  role=${sample.roleFamily} / ${sample.roleName} · exp=${sample.experienceLevel} · payBins=${sample.payBins?.length ?? 0}`,
    );
  }
  if (obsMb > 2) {
    console.warn(`WARNING: observations.json is ${obsMb.toFixed(2)} MB (target < 2 MB).`);
    process.exitCode = 1;
  } else {
    console.log("Payload check OK: observations.json < 2 MB");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
