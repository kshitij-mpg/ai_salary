import type { GapAnalysis, Observation, PortfolioPerson } from "../types";
import { formatCompactINR, formatINR } from "./money";

function csvCell(v: string | number | boolean | null | undefined): string {
  if (v == null || v === "") return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
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

export function observationsToCsv(rows: Observation[]): string {
  const HEADER = [
    "Record_ID",
    "Country",
    "City",
    "Role_Name",
    "Role_Family",
    "Experience_Level",
    "Pay_Type",
    "Salary_INR",
    "Salary_PPP_INR_Corrected",
    "Source_Name",
    "Source_Type",
    "Industry",
    "Confidence_Score",
  ];
  const lines = [HEADER.join(",")];
  for (const o of rows) {
    lines.push(
      [
        o.id,
        o.country,
        o.city,
        o.roleName,
        o.roleFamily,
        o.experienceLevel,
        o.payType,
        o.salaryInr,
        o.salaryPppInrCorrected,
        o.sourceName,
        o.sourceType,
        o.industry,
        o.confidenceScore,
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function portfolioRiskCsv(
  people: { person: PortfolioPerson; analysis: GapAnalysis | null }[],
): string {
  const HEADER = [
    "Label",
    "Country",
    "Role_Family",
    "Experience",
    "Pay_Type",
    "Current_Pay_INR",
    "Market_P50",
    "Gap_vs_P50",
    "Gap_Pct",
    "Percentile",
    "Risk_Tier",
    "Risk_Score",
    "Verdict",
    "n_Observations",
  ];
  const lines = [HEADER.join(",")];
  for (const { person, analysis } of people) {
    lines.push(
      [
        person.label,
        person.countryCode,
        person.roleFamily,
        person.experienceLevel,
        person.payType,
        person.currentPayInr,
        analysis?.band.p50 ?? "",
        analysis?.gapVsP50 ?? "",
        analysis?.gapVsP50Pct != null ? analysis.gapVsP50Pct.toFixed(1) : "",
        analysis?.percentileRank ?? "",
        analysis?.riskTier ?? "",
        analysis?.riskScore ?? "",
        analysis?.verdict ?? "",
        analysis?.band.n ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function briefingText(analysis: GapAnalysis, label: string): string {
  const gap = analysis.gapVsP50;
  const gapPct = analysis.gapVsP50Pct;
  const gapLine =
    gap != null && gapPct != null
      ? `${gap >= 0 ? "Above" : "Below"} market P50 by ${formatCompactINR(Math.abs(gap))} (${Math.abs(gapPct).toFixed(1)}%).`
      : "Market median unavailable for this slice.";
  return [
    `PayRisk brief — ${label}`,
    `Slice: ${analysis.sliceLabel}`,
    `Your pay: ${formatINR(analysis.yourPay)}`,
    `Market P50: ${formatINR(analysis.band.p50)} (n=${analysis.band.n}, sources=${analysis.band.sourceCount})`,
    gapLine,
    `Verdict: ${analysis.verdict.replace("_", " ")} · Risk: ${analysis.riskTier} (${analysis.riskScore}/100)`,
    `Observations paying more: ${analysis.competitiveAbove} (${analysis.competitiveAbovePct.toFixed(0)}%)`,
    analysis.band.directional ? "Note: thin sample — directional only." : "",
  ]
    .filter(Boolean)
    .join("\n");
}
