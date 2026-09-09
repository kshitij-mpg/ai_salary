import type { GapAnalysis, Observation, PortfolioPerson } from "../types";
import { formatCompactINR, formatINR } from "./money";
import { MARKET_POSITION_LABEL, PAY_GAP_LABEL, THREAT_LABEL } from "./marketBenchmark";
import {
  CONFIDENCE_LABEL,
  confidenceFromSampleSize,
  evidenceBasedOnLabel,
} from "./evidenceConfidence";

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
    "State",
    "City",
    "Metro",
    "Role_Name",
    "Role_Family",
    "Experience_Level",
    "Pay_Type",
    "Salary_INR",
    "Salary_PPP_INR",
    "Employer_Group",
    "Employer_Name",
    "Quality_Flag",
    "Source_Name",
  ];
  const lines = [HEADER.join(",")];
  for (const o of rows) {
    lines.push(
      [
        o.id,
        o.country,
        o.stateRegion,
        o.city,
        o.metro,
        o.roleName,
        o.roleFamily,
        o.experienceLevel,
        o.payType,
        o.salaryInr,
        o.salaryPppInrCorrected,
        o.employerGroup,
        o.employerName,
        o.qualityFlag,
        o.sourceName,
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
    "Benchmark_Mode",
    "Current_Pay",
    "Market_Median_P50",
    "Market_Value",
    "Pay_Gap_Pct",
    "Pay_Gap_Class",
    "Market_Position",
    "Retention_Risk_Tier",
    "Retention_Risk_Score",
    "Competitive_Threat",
    "Recommended_Adjustment",
    "Expected_Offer_Low",
    "Expected_Offer_High",
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
        analysis?.metric ?? "",
        analysis?.yourPay ?? person.currentPayInr,
        analysis?.marketMedian ?? analysis?.band.p50 ?? "",
        analysis?.marketValue ?? "",
        analysis?.payGapPct != null ? analysis.payGapPct.toFixed(1) : "",
        analysis?.payGapClass ?? "",
        analysis?.marketPosition ?? "",
        analysis?.riskTier ?? "",
        analysis?.riskScore ?? "",
        analysis?.competitiveThreatTier ?? "",
        analysis?.recommendedAdjustment ?? "",
        analysis?.expectedOfferLow ?? "",
        analysis?.expectedOfferHigh ?? "",
        analysis?.band.n ?? "",
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

export function briefingText(analysis: GapAnalysis, label: string): string {
  const gapPct = analysis.payGapPct;
  const modeNote =
    analysis.metric === "ppp"
      ? "PPP View (purchasing power)"
      : analysis.metric === "market"
        ? "Market Benchmark View"
        : analysis.metric === "talent"
          ? "Talent Market View (default)"
          : "FX View (currency conversion)";
  const gapLine =
    gapPct != null
      ? `Pay gap vs ${analysis.benchmarkLabel}: ${gapPct >= 0 ? "+" : ""}${gapPct.toFixed(1)}% (${PAY_GAP_LABEL[analysis.payGapClass]}).`
      : `${analysis.benchmarkLabel} unavailable for this slice.`;
  const competitors = analysis.topCompetitors
    .slice(0, 5)
    .map((c) => {
      const conf = CONFIDENCE_LABEL[confidenceFromSampleSize(c.n)];
      return `${c.employerLabel} (${formatCompactINR(c.medianPay)}; ${evidenceBasedOnLabel(c.n)}; Confidence: ${conf})`;
    })
    .join("; ");
  const riskLine = analysis.riskSupported
    ? `Retention risk: ${analysis.riskTier} (${analysis.riskScore}/100)`
    : "Retention risk: Talent Market View only";
  const threatLine = analysis.riskSupported
    ? `Competitive threat: ${THREAT_LABEL[analysis.competitiveThreatTier]} (${analysis.competitiveThreatScore}/100)`
    : "Competitive threat: Talent Market View only";
  const offerLine = analysis.offerRangeSupported
    ? `Expected offer (P75–P90): ${formatCompactINR(analysis.expectedOfferLow)} – ${formatCompactINR(analysis.expectedOfferHigh)}`
    : "Expected offer: available only in Talent Market View";
  return [
    `PayRisk brief — ${label}`,
    `Slice: ${analysis.sliceLabel}`,
    `Methodology: ${modeNote}`,
    `Current pay: ${formatINR(analysis.yourPay)}`,
    `Market Benchmark (P50): ${formatINR(analysis.marketBenchmarkValue ?? analysis.marketMedian)}`,
    `Talent Market Value: ${formatINR(analysis.talentMarketValue)}`,
    `${analysis.benchmarkLabel}: ${formatINR(analysis.marketValue)}`,
    `P25–P90: ${formatCompactINR(analysis.band.p25)} – ${formatCompactINR(analysis.band.p90)}`,
    `Market position: ${MARKET_POSITION_LABEL[analysis.marketPosition]}`,
    gapLine,
    riskLine,
    threatLine,
    offerLine,
    competitors ? `Top competitors: ${competitors}` : "",
    analysis.recommendedAdjustment > 0
      ? `Recommended adjustment: +${formatINR(analysis.recommendedAdjustment)}`
      : `Recommended adjustment: none (at/above ${analysis.benchmarkLabel})`,
    analysis.band.directional ? "Note: thin sample — directional only." : "",
  ]
    .filter(Boolean)
    .join("\n");
}
