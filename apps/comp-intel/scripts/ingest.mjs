/**
 * Build-time ingest: parse the evaluation CSV into typed JSON.
 * Adds derived PPP fields. Never overwrites source Salary_PPP_INR.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const csvPath = path.join(appRoot, "data", "AI_Salary_Benchmark_ALL.csv");

/** Job-country FX to INR (not source-currency FX). */
export const COUNTRY_FX_TO_INR = {
  IN: 1,
  US: 95.43,
  AE: 25.9856,
  GB: 128.9259,
  DE: 110.1453,
  AU: 67.364,
  NZ: 55.9792,
};

/** World Bank PA.NUS.PPP (latest, as specified). */
export const WORLD_BANK_PPP = {
  IN: 20.0886288014602,
  US: 1,
  AE: 2.32695589646038,
  GB: 0.677133,
  DE: 0.709983,
  AU: 1.398943,
  NZ: 1.472957,
};

export function salaryPppInrCorrected(salaryInr, countryCode) {
  if (salaryInr == null || !Number.isFinite(salaryInr)) return null;
  const fx = COUNTRY_FX_TO_INR[countryCode];
  const ppp = WORLD_BANK_PPP[countryCode];
  if (!fx || !ppp) return null;
  const localAmount = salaryInr / fx;
  return localAmount * (WORLD_BANK_PPP.IN / ppp);
}

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

function countBy(rows, keyFn) {
  const map = new Map();
  for (const row of rows) {
    const k = keyFn(row);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
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
  return rows.slice(1).filter((r) => r.some((cell) => cell.trim() !== "")).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = r[idx] ?? "";
    });
    return obj;
  });
}

function main() {
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(csvPath, "utf8");
  const parsed = parseCsv(raw);
  const observations = [];
  for (const r of parsed) {
    const countryCode = str(r.Country_Code);
    const salaryInr = num(r.Salary_INR);
    if (salaryInr == null || !countryCode) continue;

    const currencyOriginal = str(r.Currency_Original);
    const pppSuspect = countryCode === "IN" && currencyOriginal === "USD";
    const sourceType = str(r.Source_Type);
    const sourceName = str(r.Source_Name);
    const isEmployerFiling =
      /labor certification/i.test(sourceType) || /OFLC LCA/i.test(sourceName);

    const corrected = round2(salaryPppInrCorrected(salaryInr, countryCode));

    observations.push({
      id: str(r.Record_ID),
      analyticGrain: str(r.Analytic_Grain) || "Compensation_Observation",
      payPeriod: str(r.Pay_Period) || "Annual",
      country: str(r.Country),
      countryCode,
      stateRegion: str(r.State_Region),
      city: str(r.City),
      roleName: str(r.Role_Name),
      originalRoleTitle: str(r.Original_Role_Title),
      roleFamily: str(r.Role_Family),
      experienceLevel: str(r.Experience_Level),
      careerLevel: str(r.Career_Level),
      industry: str(r.Industry),
      payType: str(r.Pay_Type),
      baseMin: round2(num(r.Base_Salary_Min)),
      baseMedian: round2(num(r.Base_Salary_Median)),
      baseMax: round2(num(r.Base_Salary_Max)),
      bonus: round2(num(r.Bonus)),
      equity: round2(num(r.Equity)),
      totalCompensation: round2(num(r.Total_Compensation)),
      salaryInr: round2(salaryInr),
      salaryPppInr: round2(num(r.Salary_PPP_INR)),
      salaryPppInrCorrected: corrected,
      pppSuspect,
      currency: str(r.Currency) || "INR",
      currencyOriginal,
      fxRate: num(r.FX_Rate),
      fxRateMeaning: str(r.FX_Rate_Meaning),
      fxUsdInr: num(r.FX_USD_INR),
      fxConversionDate: str(r.FX_Conversion_Date),
      sourceName,
      sourceType,
      sourceAccessType: str(r.Source_Access_Type),
      sourceUrl: str(r.Source_URL),
      publicationDate: str(r.Publication_Date),
      retrievalDate: str(r.Retrieval_Date),
      sampleSize: num(r.Sample_Size),
      sampleSizeNote: str(r.Sample_Size_Note),
      confidenceScore: str(r.Confidence_Score),
      verificationStatus: str(r.Verification_Status),
      notes: str(r.Notes),
      isEmployerFiling,
    });
  }

  const byCountry = countBy(observations, (o) => o.countryCode);
  const byFamily = countBy(observations, (o) => o.roleFamily);
  const byRole = countBy(observations, (o) => o.roleName);
  const byExp = countBy(observations, (o) => o.experienceLevel);
  const byPay = countBy(observations, (o) => o.payType);
  const bySource = countBy(observations, (o) => o.sourceName);
  const byCity = countBy(observations, (o) => `${o.countryCode}||${o.city}`);
  const byConfidence = countBy(observations, (o) => o.confidenceScore);

  const countryName = new Map();
  for (const o of observations) countryName.set(o.countryCode, o.country);

  const sourceTypeByName = new Map();
  for (const o of observations) {
    if (!sourceTypeByName.has(o.sourceName)) sourceTypeByName.set(o.sourceName, o.sourceType);
  }

  const catalog = {
    generatedFrom: "data/AI_Salary_Benchmark_ALL.csv",
    rowCount: observations.length,
    pppSuspectCount: observations.filter((o) => o.pppSuspect).length,
    fxUsdInr: 95.43,
    fxConversionDate: "2026-08-12",
    retrievalDate: "2026-08-13",
    grain: "Compensation_Observation",
    countries: [...byCountry.entries()]
      .map(([code, n]) => ({ code, name: countryName.get(code) ?? code, n }))
      .sort((a, b) => b.n - a.n),
    roleFamilies: [...byFamily.entries()]
      .map(([name, n]) => ({ name, n }))
      .sort((a, b) => b.n - a.n),
    roleNames: [...byRole.entries()]
      .map(([name, n]) => ({ name, n }))
      .sort((a, b) => b.n - a.n),
    experienceLevels: [...byExp.entries()].map(([name, n]) => ({ name, n })),
    payTypes: [...byPay.entries()].map(([name, n]) => ({ name, n })),
    sources: [...bySource.entries()]
      .map(([name, n]) => ({ name, n, type: sourceTypeByName.get(name) ?? "" }))
      .sort((a, b) => b.n - a.n),
    cities: [...byCity.entries()]
      .map(([key, n]) => {
        const [countryCode, name] = key.split("||");
        return { countryCode, name, n };
      })
      .sort((a, b) => b.n - a.n),
    confidence: [...byConfidence.entries()].map(([name, n]) => ({ name, n })),
    countryFxToInr: COUNTRY_FX_TO_INR,
    worldBankPpp: WORLD_BANK_PPP,
  };

  const outDir = path.join(appRoot, "public", "data");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "observations.json"), JSON.stringify(observations));
  fs.writeFileSync(path.join(outDir, "catalog.json"), JSON.stringify(catalog, null, 2));

  const gcc = observations.find(
    (o) =>
      o.pppSuspect &&
      o.sourceName.includes("GCC Nexus") &&
      o.roleName === "AI Engineer" &&
      o.experienceLevel.startsWith("Entry"),
  );

  console.log(`Ingested ${observations.length} observations`);
  console.log(`PPP_Suspect (IN + USD): ${catalog.pppSuspectCount}`);
  if (gcc) {
    console.log(
      `GCC Nexus AI Engineer entry: Salary_INR=${gcc.salaryInr} oldPPP=${gcc.salaryPppInr} corrected=${gcc.salaryPppInrCorrected}`,
    );
  }
}

main();
