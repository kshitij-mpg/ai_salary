import type { Observation } from "../types";
import { formatINR } from "./money";

const HEADER = [
  "Record_ID",
  "Country",
  "Country_Code",
  "City",
  "Role_Name",
  "Role_Family",
  "Experience_Level",
  "Pay_Type",
  "Base_Salary_Min",
  "Base_Salary_Median",
  "Base_Salary_Max",
  "Salary_INR",
  "Salary_PPP_INR",
  "Salary_PPP_INR_Corrected",
  "PPP_Suspect",
  "Currency_Original",
  "FX_Rate",
  "Source_Name",
  "Source_Type",
  "Source_URL",
  "Sample_Size",
  "Confidence_Score",
  "Notes",
] as const;

function csvCell(v: string | number | boolean | null | undefined): string {
  if (v == null || v === "") return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function observationsToCsv(rows: Observation[]): string {
  const lines = [HEADER.join(",")];
  for (const o of rows) {
    lines.push(
      [
        o.id,
        o.country,
        o.countryCode,
        o.city,
        o.roleName,
        o.roleFamily,
        o.experienceLevel,
        o.payType,
        o.baseMin,
        o.baseMedian,
        o.baseMax,
        o.salaryInr,
        o.salaryPppInr,
        o.salaryPppInrCorrected,
        o.pppSuspect,
        o.currencyOriginal,
        o.fxRate,
        o.sourceName,
        o.sourceType,
        o.sourceUrl,
        o.sampleSize,
        o.confidenceScore,
        o.notes,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function moneyOrBlank(n: number | null | undefined): string {
  return formatINR(n);
}
