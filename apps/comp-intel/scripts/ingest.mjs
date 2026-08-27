/**
 * Build-time ingest: analytics-ready LCA filings + market bands → typed JSON.
 * Source of truth: deliverables/analytics_ready/ (repo root).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(appRoot, "../../..");

const CLEANED_CSV = path.join(
  repoRoot,
  "deliverables/analytics_ready/AI_Talent_Benchmark_CLEANED.csv",
);
const BANDS_CSV = path.join(
  repoRoot,
  "deliverables/analytics_ready/AI_Talent_Benchmark_MARKET_BANDS.csv",
);
const STANDARDIZED_CSV = path.join(
  repoRoot,
  "deliverables/analytics_ready/AI_Talent_Benchmark_STANDARDIZED.csv",
);

export const FX_USD_INR = 95.43;
export const PPP_FACTOR = 23;

function num(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function str(v) {
  if (v == null) return "";
  return String(v).trim();
}

function round2(n) {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

function usdToInr(usd) {
  return usd != null ? round2(usd * FX_USD_INR) : null;
}

function usdToPppInr(usd) {
  return usd != null ? round2(usd * PPP_FACTOR) : null;
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

function topN(map, n = 80) {
  return [...map.entries()]
    .map(([name, count]) => ({ name, n: count }))
    .sort((a, b) => b.n - a.n)
    .slice(0, n);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows
    .slice(1)
    .filter((r) => r.some((cell) => cell.trim() !== ""))
    .map((r) => {
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = r[idx] ?? "";
      });
      return obj;
    });
}

function mapFiling(r) {
  const salaryInr = round2(num(r.Annual_Pay_INR));
  const salaryPppInr = round2(num(r.Annual_Pay_PPP_INR));
  const salaryUsd = round2(num(r.Annual_Pay_USD));

  return {
    id: str(r.Record_ID),
    analyticGrain: str(r.Analytic_Grain) || "LCA_Filing",
    payPeriod: "Annual",
    country: str(r.Country_Name),
    countryCode: str(r.Country_ISO2),
    stateRegion: str(r.State),
    city: str(r.City),
    metro: str(r.Metro),
    geographyLevel: str(r.Geography_Level),
    geographyName: str(r.Geography_Name),
    roleName: str(r.Role_Name_Standardized),
    originalRoleTitle: str(r.Role_Name_Original),
    roleFamily: str(r.Role_Family),
    experienceLevel: str(r.Experience_Level_Standardized),
    careerLevel: str(r.Career_Level_Standardized),
    payType: str(r.Pay_Type),
    compensationDefinition: str(r.Compensation_Definition),
    salaryInr,
    salaryPppInr,
    salaryPppInrCorrected: salaryPppInr,
    salaryUsd,
    pppSuspect: false,
    employerGroup: str(r.Employer_Group),
    employerName: str(r.Employer_Name_Original),
    fxUsdInr: num(r.FX_USD_INR) ?? FX_USD_INR,
    fxConversionDate: str(r.FX_Conversion_Date),
    sourceName: str(r.Source_Name),
    sourceType: "Labor certification filing",
    sourceUrl: str(r.Source_URL),
    retrievalDate: str(r.Collection_Date),
    sampleSize: num(r.Sample_Size) ?? 1,
    qualityFlag: str(r.Quality_Flag),
    dataQualityScore: num(r.Data_Quality_Score),
    notes: str(r.Notes),
    isEmployerFiling: true,
  };
}

function mapBand(r) {
  const p10Usd = round2(num(r.P10_USD));
  const p25Usd = round2(num(r.P25_USD));
  const p50Usd = round2(num(r.P50_USD));
  const p75Usd = round2(num(r.P75_USD));
  const p90Usd = round2(num(r.P90_USD));
  const minUsd = round2(num(r.Market_Min_USD));
  const maxUsd = round2(num(r.Market_Max_USD));
  const meanUsd = round2(num(r.Mean_USD));
  const p50PppInr = round2(num(r.P50_PPP_INR));

  return {
    id: str(r.Record_ID),
    roleFamily: str(r.Role_Family),
    roleFamilyKey: str(r.Role_Family_Key),
    countryCode: str(r.Country_ISO2),
    countryName: str(r.Country_Name),
    geographyLevel: str(r.Geography_Level),
    geographyName: str(r.Geography_Name),
    state: str(r.State),
    city: str(r.City),
    metro: str(r.Metro),
    experienceLevel: str(r.Experience_Level_Standardized),
    experienceBandKey: str(r.Experience_Band_Key),
    payType: str(r.Pay_Type),
    compensationDefinition: str(r.Compensation_Definition),
    p10Usd,
    p25Usd,
    p50Usd,
    p75Usd,
    p90Usd,
    minUsd,
    maxUsd,
    meanUsd,
    p10Inr: usdToInr(p10Usd),
    p25Inr: usdToInr(p25Usd),
    p50Inr: usdToInr(p50Usd),
    p75Inr: usdToInr(p75Usd),
    p90Inr: usdToInr(p90Usd),
    minInr: usdToInr(minUsd),
    maxInr: usdToInr(maxUsd),
    meanInr: usdToInr(meanUsd),
    p10PppInr: usdToPppInr(p10Usd),
    p25PppInr: usdToPppInr(p25Usd),
    p50PppInr: p50PppInr ?? usdToPppInr(p50Usd),
    p75PppInr: usdToPppInr(p75Usd),
    p90PppInr: usdToPppInr(p90Usd),
    minPppInr: usdToPppInr(minUsd),
    maxPppInr: usdToPppInr(maxUsd),
    meanPppInr: usdToPppInr(meanUsd),
    sampleSize: num(r.Sample_Size) ?? 0,
    geographicPremiumIndex: num(r.Geographic_Premium_Index),
    leadershipPremiumIndex: num(r.Leadership_Premium_Index),
    roleDemandIndex: num(r.Role_Demand_Index),
    talentScarcityIndicator: str(r.Talent_Scarcity_Indicator),
    compensationCompetitivenessIndex: num(r.Compensation_Competitiveness_Index),
    sourceName: str(r.Source_Name),
    collectionDate: str(r.Collection_Date),
    fxUsdInr: num(r.FX_USD_INR) ?? FX_USD_INR,
    fxConversionDate: str(r.FX_Conversion_Date),
    notes: str(r.Notes),
  };
}

function main() {
  for (const p of [CLEANED_CSV, BANDS_CSV]) {
    if (!fs.existsSync(p)) {
      console.error(`CSV not found: ${p}`);
      process.exit(1);
    }
  }

  const cleanedRaw = fs.readFileSync(CLEANED_CSV, "utf8");
  const bandsRaw = fs.readFileSync(BANDS_CSV, "utf8");

  const observations = parseCsv(cleanedRaw)
    .filter(
      (r) =>
        str(r.Include_In_Analysis) === "Y" &&
        str(r.Pay_Type) === "Base" &&
        str(r.Analytic_Grain) === "LCA_Filing",
    )
    .map(mapFiling)
    .filter((o) => o.salaryInr != null && o.countryCode);

  const marketBands = parseCsv(bandsRaw)
    .filter((r) => str(r.Analytic_Grain) === "Market_Band" && str(r.Pay_Type) === "Base")
    .map(mapBand)
    .filter((b) => b.roleFamily && b.countryCode);

  const byCountry = countBy(observations, (o) => o.countryCode);
  const byFamily = countBy(observations, (o) => o.roleFamily);
  const byRole = countBy(observations, (o) => o.roleName);
  const byExp = countBy(observations, (o) => o.experienceLevel);
  const byPay = countBy(observations, (o) => o.payType);
  const byCity = countBy(observations, (o) => `${o.countryCode}||${o.city}`);
  const byMetro = countBy(observations, (o) => `${o.countryCode}||${o.metro}`);
  const byState = countBy(observations, (o) => `${o.countryCode}||${o.stateRegion}`);
  const byEmployer = countBy(observations, (o) => o.employerGroup || o.employerName);

  const countryName = new Map();
  for (const o of observations) countryName.set(o.countryCode, o.country);

  let collectionDate = "2026-08-24";
  for (const b of marketBands) {
    if (b.collectionDate) {
      collectionDate = b.collectionDate;
      break;
    }
  }

  const catalog = {
    generatedFrom: [
      "deliverables/analytics_ready/AI_Talent_Benchmark_CLEANED.csv",
      "deliverables/analytics_ready/AI_Talent_Benchmark_MARKET_BANDS.csv",
    ],
    standardizedDuplicate: "deliverables/analytics_ready/AI_Talent_Benchmark_STANDARDIZED.csv",
    rowCount: observations.length,
    bandCount: marketBands.length,
    grain: "LCA_Filing + Market_Band",
    grainNotes:
      "PRIMARY: Market_Band P10–P90 + Market Value (P50 × Geographic Premium × Compensation Competitiveness). Filings for competitor pull / evidence. FX and PPP are optional analytical views — not the default market value.",
    countries: [...byCountry.entries()]
      .map(([code, n]) => ({ code, name: countryName.get(code) ?? code, n }))
      .sort((a, b) => b.n - a.n),
    roleFamilies: topN(byFamily, 200),
    roleNames: topN(byRole, 300),
    experienceLevels: [...byExp.entries()]
      .map(([name, n]) => ({ name, n }))
      .sort((a, b) => b.n - a.n),
    payTypes: [...byPay.entries()].map(([name, n]) => ({ name, n })),
    cities: [...byCity.entries()]
      .map(([key, n]) => {
        const [countryCode, name] = key.split("||");
        return { countryCode, name, n };
      })
      .filter((c) => c.name)
      .sort((a, b) => b.n - a.n)
      .slice(0, 500),
    metros: [...byMetro.entries()]
      .map(([key, n]) => {
        const [countryCode, name] = key.split("||");
        return { countryCode, name, n };
      })
      .filter((m) => m.name)
      .sort((a, b) => b.n - a.n)
      .slice(0, 200),
    states: [...byState.entries()]
      .map(([key, n]) => {
        const [countryCode, name] = key.split("||");
        return { countryCode, name, n };
      })
      .filter((s) => s.name)
      .sort((a, b) => b.n - a.n),
    employerGroups: topN(byEmployer, 100),
    fxUsdInr: FX_USD_INR,
    pppFactor: PPP_FACTOR,
    fxConversionDate: observations[0]?.fxConversionDate ?? "2026-08-12",
    collectionDate,
    compensationDefinition: "LCA_Offered_Base_Wage",
    disclaimer:
      "US LCA certified offered base wages only — not total compensation, not confirmed offers to your employee, not individual headcount.",
    countryFxToInr: { US: FX_USD_INR, IN: 1 },
    worldBankPpp: { US: 1, IN: PPP_FACTOR },
  };

  const outDir = path.join(appRoot, "public", "data");
  fs.mkdirSync(outDir, { recursive: true });

  const obsJson = JSON.stringify(observations);
  const bandsJson = JSON.stringify(marketBands);
  fs.writeFileSync(path.join(outDir, "observations.json"), obsJson);
  fs.writeFileSync(path.join(outDir, "marketBands.json"), bandsJson);
  fs.writeFileSync(path.join(outDir, "catalog.json"), JSON.stringify(catalog, null, 2));

  const obsMb = (Buffer.byteLength(obsJson) / (1024 * 1024)).toFixed(1);
  const bandsMb = (Buffer.byteLength(bandsJson) / (1024 * 1024)).toFixed(1);

  console.log(`Ingested ${observations.length} LCA filings (${obsMb} MB)`);
  console.log(`Ingested ${marketBands.length} market bands (${bandsMb} MB)`);
  console.log(`STANDARDIZED is duplicate of CLEANED — not ingested separately (${STANDARDIZED_CSV})`);
  if (parseFloat(obsMb) > 10) {
    console.warn(`observations.json exceeds 10 MB — monitor client load performance.`);
  }
}

main();
