import type {
  CompetitorCompany,
  CompetitiveThreatTier,
  GapAnalysis,
  MarketBand,
  MarketBandRecord,
  MarketPosition,
  MetricMode,
  Observation,
  PayGapClass,
  RiskTier,
} from "../types";
import { FX_USD_INR } from "./constants";
import { isPresent } from "./money";
import { convertUsdToPppInr } from "./ppp";
import { groupBy, median, metricValue } from "./stats";

/** Display / analysis mode. Talent Market is the product default. */
export type BenchmarkMode = MetricMode;

export const RISK_UNSUPPORTED_MESSAGE =
  "Risk calculations are benchmark-based and not supported in FX/PPP mode.";

export function isPppMode(mode: BenchmarkMode): boolean {
  return mode === "ppp";
}

/** Cash FX INR for talent / market / fx; PPP INR only in ppp mode. */
export function usesPppCurrency(mode: BenchmarkMode): boolean {
  return mode === "ppp";
}

export function riskSupported(mode: BenchmarkMode): boolean {
  return mode === "talent" || mode === "market";
}

export function offerRangeSupported(mode: BenchmarkMode): boolean {
  return mode === "talent";
}

/**
 * Talent Scarcity Multiplier (Talent Market View only).
 * Low = 1.00 · Medium = 1.10 · High = 1.20
 */
export function talentScarcityMultiplier(indicator: string | null | undefined): number {
  const key = (indicator ?? "").trim().toLowerCase();
  if (key === "critical" || key === "very high") return 1.25;
  if (key === "high") return 1.2;
  if (key === "medium" || key === "moderate") return 1.1;
  if (key === "low") return 1.0;
  return 1.0;
}

/**
 * Role Demand factor for Talent Market Value.
 * Dataset Role_Demand_Index is a 0–1 family-share. Spec multiplies by Role_Demand_Index;
 * when the index is a share (< 1), apply (1 + index) so Talent ≥ Market Benchmark.
 * If already a ≥1 multiplier, use as-is.
 */
export function roleDemandMultiplier(roleDemandIndex: number | null | undefined): number {
  if (roleDemandIndex == null || !Number.isFinite(roleDemandIndex) || roleDemandIndex < 0) {
    return 1;
  }
  return roleDemandIndex >= 1 ? roleDemandIndex : 1 + roleDemandIndex;
}

/**
 * Market Benchmark Value (Mode 2)
 * = P50 × Geographic_Premium_Index × Compensation_Competitiveness_Index
 */
export function computeMarketValue(
  p50: number | null,
  record: MarketBandRecord | null,
): number | null {
  if (p50 == null || !Number.isFinite(p50) || p50 <= 0) return null;
  const geo = record?.geographicPremiumIndex;
  const cci = record?.compensationCompetitivenessIndex;
  const geoFactor = geo != null && Number.isFinite(geo) && geo > 0 ? geo : 1;
  const cciFactor = cci != null && Number.isFinite(cci) && cci > 0 ? cci : 1;
  return Math.round(p50 * geoFactor * cciFactor * 100) / 100;
}

/** Alias matching product language. */
export const computeMarketBenchmarkValue = computeMarketValue;

/**
 * Talent Market Value (Mode 1 — default, highest)
 * = Market Benchmark × Role_Demand_Index × Talent Scarcity Multiplier
 */
export function computeTalentMarketValue(
  p50: number | null,
  record: MarketBandRecord | null,
): number | null {
  const marketBenchmark = computeMarketBenchmarkValue(p50, record);
  if (marketBenchmark == null) return null;
  const demand = roleDemandMultiplier(record?.roleDemandIndex);
  const scarcity = talentScarcityMultiplier(record?.talentScarcityIndicator);
  return Math.round(marketBenchmark * demand * scarcity * 100) / 100;
}

/**
 * Selected benchmark for the active mode — drives pay gap, adjustment, KPIs.
 *
 * Talent  → Talent Market Value (P50_FX × Geo × CCI × Demand × Scarcity)
 * Market  → Market Benchmark Value (P50_FX × Geo × CCI)
 * FX      → Current salary × FX (pure currency conversion; no market adjustments)
 * PPP     → Current salary USD × PPP_Conversion_Factor (purchasing power only)
 *
 * `band` MUST be the FX-currency band (P50_INR) for talent/market formulas.
 * `currentFxPay` is the incumbent's cash FX INR — never changes with mode.
 */
export function selectedBenchmarkValue(
  mode: BenchmarkMode,
  band: MarketBand,
  record: MarketBandRecord | null,
  currentFxPay: number | null = null,
): number | null {
  const normalized = mode === "nominal" ? "fx" : mode;
  switch (normalized) {
    case "talent":
      return computeTalentMarketValue(band.p50, record);
    case "market":
      return computeMarketBenchmarkValue(band.p50, record);
    case "fx":
      // Pure FX conversion of current salary — not market P50.
      if (currentFxPay != null && Number.isFinite(currentFxPay) && currentFxPay > 0) {
        return Math.round(currentFxPay * 100) / 100;
      }
      return null;
    case "ppp": {
      // Pure PPP of current salary USD — not market P50.
      if (currentFxPay == null || !Number.isFinite(currentFxPay) || currentFxPay <= 0) {
        return null;
      }
      const fx =
        record?.fxUsdInr != null && record.fxUsdInr > 0 ? record.fxUsdInr : FX_USD_INR;
      return Math.round(convertUsdToPppInr(currentFxPay / fx) * 100) / 100;
    }
    default:
      return band.p50;
  }
}

/**
 * Market Position from current compensation vs band percentiles.
 */
export function classifyMarketPosition(
  current: number,
  band: Pick<MarketBand, "p25" | "p50" | "p75" | "p90">,
): MarketPosition {
  const { p25, p50, p75, p90 } = band;
  if (p25 != null && current < p25) return "significantly_underpaid";
  if (p50 != null && current < p50) return "underpaid";
  if (p75 != null && current < p75) return "market_competitive";
  if (p90 != null && current < p90) return "highly_competitive";
  if (p90 != null && current >= p90) return "market_leading";
  if (p50 != null) return current < p50 ? "underpaid" : "market_competitive";
  return "market_competitive";
}

export const MARKET_POSITION_LABEL: Record<MarketPosition, string> = {
  significantly_underpaid: "Significantly Underpaid",
  underpaid: "Underpaid",
  market_competitive: "Market Competitive",
  highly_competitive: "Highly Competitive",
  market_leading: "Market Leading",
};

/**
 * Pay Gap % = (Current − Selected Benchmark) / Selected Benchmark × 100
 */
export function computePayGapPct(current: number, marketValue: number | null): number | null {
  if (marketValue == null || !Number.isFinite(marketValue) || marketValue === 0) return null;
  return ((current - marketValue) / marketValue) * 100;
}

export function classifyPayGap(gapPct: number | null): PayGapClass {
  if (gapPct == null) return "market_aligned";
  if (gapPct < -20) return "critical_underpayment";
  if (gapPct < -10) return "high_underpayment_risk";
  if (gapPct <= 10) return "market_aligned";
  if (gapPct <= 20) return "above_market";
  return "significantly_above_market";
}

export const PAY_GAP_LABEL: Record<PayGapClass, string> = {
  critical_underpayment: "Critical Underpayment",
  high_underpayment_risk: "High Underpayment Risk",
  market_aligned: "Market Aligned",
  above_market: "Above Market",
  significantly_above_market: "Significantly Above Market",
};

function scarcityScore(indicator: string | undefined): { score: number; label: string } {
  const key = (indicator ?? "").trim().toLowerCase();
  if (key === "critical" || key === "very high") return { score: 100, label: "Critical" };
  if (key === "high") return { score: 85, label: "High" };
  if (key === "medium" || key === "moderate") return { score: 55, label: "Medium" };
  if (key === "low") return { score: 25, label: "Low" };
  return { score: 40, label: indicator || "Unknown" };
}

/** Map pay gap % → 0–100 risk contribution (higher = more underpaid). */
function payGapRiskScore(gapPct: number | null): number {
  if (gapPct == null) return 40;
  if (gapPct <= -30) return 100;
  if (gapPct <= -20) return 90;
  if (gapPct <= -10) return 72;
  if (gapPct < 0) return 55;
  if (gapPct <= 10) return 30;
  if (gapPct <= 20) return 15;
  return 5;
}

/** Role demand index is 0–1 share → 0–100. */
function roleDemandScore(demand: number | null | undefined): number {
  if (demand == null || !Number.isFinite(demand)) return 40;
  return Math.max(0, Math.min(100, Math.round(demand * 100)));
}

/**
 * Compensation competitiveness → risk: higher CCI = more competitive market pressure.
 * 1.0 ≈ neutral market; map roughly to 0–100.
 */
function competitivenessRiskScore(cci: number | null | undefined): number {
  if (cci == null || !Number.isFinite(cci)) return 40;
  // 0.5 → ~15, 1.0 → 45, 1.5 → 75, 2.0 → 100
  return Math.max(0, Math.min(100, Math.round((cci - 0.4) * (100 / 1.6))));
}

/**
 * Retention Risk Score =
 *   40% Pay Gap + 30% Talent Scarcity + 20% Role Demand + 10% Compensation Competitiveness
 * Only for Talent Market and Market Benchmark modes.
 */
export function scoreRetentionRisk(input: {
  payGapPct: number | null;
  record: MarketBandRecord | null;
  mode?: BenchmarkMode;
}): { tier: RiskTier; score: number; reasons: string[]; supported: boolean } {
  if (input.mode != null && !riskSupported(input.mode)) {
    return {
      tier: "stable",
      score: 0,
      reasons: [RISK_UNSUPPORTED_MESSAGE],
      supported: false,
    };
  }

  const reasons: string[] = [];
  const gapScore = payGapRiskScore(input.payGapPct);
  const scarce = scarcityScore(input.record?.talentScarcityIndicator);
  const demand = roleDemandScore(input.record?.roleDemandIndex);
  const cciScore = competitivenessRiskScore(input.record?.compensationCompetitivenessIndex);

  const score = Math.round(
    0.4 * gapScore + 0.3 * scarce.score + 0.2 * demand + 0.1 * cciScore,
  );
  const clamped = Math.max(0, Math.min(100, score));

  if (input.payGapPct != null) {
    const abs = Math.abs(Math.round(input.payGapPct));
    if (input.payGapPct < 0) {
      reasons.push(`Compensation ${abs}% below selected benchmark.`);
    } else if (input.payGapPct > 10) {
      reasons.push(`Compensation ${abs}% above selected benchmark — retention buffer.`);
    } else {
      reasons.push(`Compensation within ±10% of selected benchmark.`);
    }
  }

  if (input.record?.talentScarcityIndicator) {
    reasons.push(`Talent Scarcity = ${scarce.label}.`);
  }
  if (input.record?.roleDemandIndex != null) {
    const d = input.record.roleDemandIndex;
    reasons.push(
      d >= 0.6
        ? `Demand Index elevated (${d.toFixed(2)}).`
        : `Role Demand Index: ${d.toFixed(2)}.`,
    );
  }
  if (input.record?.compensationCompetitivenessIndex != null) {
    const c = input.record.compensationCompetitivenessIndex;
    reasons.push(
      c >= 1.15
        ? `Competitor market premium high (CCI ${c.toFixed(2)}).`
        : `Compensation Competitiveness Index: ${c.toFixed(2)} (1.0 ≈ market).`,
    );
  }

  let tier: RiskTier;
  if (clamped >= 75) tier = "critical";
  else if (clamped >= 58) tier = "high";
  else if (clamped >= 42) tier = "watch";
  else if (clamped >= 28) tier = "stable";
  else tier = "premium";

  return { tier, score: clamped, reasons, supported: true };
}

/**
 * Competitive Threat Severity from pay gap + competitor premium + scarcity.
 * Disabled in FX/PPP (same policy as retention risk).
 */
export function scoreCompetitiveThreat(input: {
  payGapPct: number | null;
  competitorPremiumPct: number | null;
  scarcityIndicator: string | undefined;
  mode?: BenchmarkMode;
}): { tier: CompetitiveThreatTier; score: number; reasons: string[]; supported: boolean } {
  if (input.mode != null && !riskSupported(input.mode)) {
    return {
      tier: "low",
      score: 0,
      reasons: [RISK_UNSUPPORTED_MESSAGE],
      supported: false,
    };
  }

  const reasons: string[] = [];
  let points = 0;

  const gap = input.payGapPct;
  if (gap != null) {
    if (gap <= -20) {
      points += 40;
      reasons.push(`Pay gap ${Math.abs(Math.round(gap))}% (critical underpayment).`);
    } else if (gap <= -10) {
      points += 28;
      reasons.push(`Pay gap ${Math.abs(Math.round(gap))}% below benchmark.`);
    } else if (gap < 0) {
      points += 14;
      reasons.push(`Mild underpayment vs selected benchmark.`);
    } else {
      reasons.push(`Pay gap not under benchmark.`);
    }
  }

  const prem = input.competitorPremiumPct;
  if (prem != null && prem > 0) {
    if (prem >= 30) {
      points += 35;
      reasons.push(`Top competitor premium ~${Math.round(prem)}%.`);
    } else if (prem >= 15) {
      points += 24;
      reasons.push(`Material competitor premium (~${Math.round(prem)}%).`);
    } else {
      points += 12;
      reasons.push(`Modest competitor premium (~${Math.round(prem)}%).`);
    }
  }

  const scarce = scarcityScore(input.scarcityIndicator);
  if (scarce.score >= 85) {
    points += 25;
    reasons.push(`Talent scarcity ${scarce.label}.`);
  } else if (scarce.score >= 55) {
    points += 15;
    reasons.push(`Talent scarcity ${scarce.label}.`);
  } else {
    points += 5;
  }

  const score = Math.max(0, Math.min(100, points));
  let tier: CompetitiveThreatTier;
  if (score >= 70) tier = "critical";
  else if (score >= 50) tier = "high";
  else if (score >= 30) tier = "medium";
  else tier = "low";

  return { tier, score, reasons, supported: true };
}

export const THREAT_LABEL: Record<CompetitiveThreatTier, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

/**
 * Expected external offer range — Talent Market View only.
 * = P75–P90 × Role Demand Multiplier × Talent Scarcity Multiplier
 */
export function expectedOfferRange(
  band: MarketBand,
  record: MarketBandRecord | null = null,
  mode: BenchmarkMode = "talent",
): {
  low: number | null;
  high: number | null;
} {
  if (!offerRangeSupported(mode === "nominal" ? "fx" : mode)) {
    return { low: null, high: null };
  }
  const demand = roleDemandMultiplier(record?.roleDemandIndex);
  const scarcity = talentScarcityMultiplier(record?.talentScarcityIndicator);
  const adj = (v: number | null) =>
    v == null || !Number.isFinite(v) ? null : Math.round(v * demand * scarcity * 100) / 100;
  return { low: adj(band.p75), high: adj(band.p90) };
}

/**
 * Top competitor companies from CLEANED filings (same role family, experience, similar geo),
 * ranked by median salary.
 */
export function topCompetitorCompanies(
  matched: Observation[],
  metric: BenchmarkMode,
  limit = 5,
): CompetitorCompany[] {
  const currencyMetric: "nominal" | "ppp" = metric === "ppp" ? "ppp" : "nominal";
  const grouped = groupBy(
    matched,
    (o) => o.employerGroup || o.employerName || "Unknown employer",
  );
  const out: CompetitorCompany[] = [];
  for (const [key, list] of grouped) {
    if (list.length < 1) continue;
    const values = list.map((o) => metricValue(o, currencyMetric)).filter(isPresent);
    const med = median(values);
    if (med == null) continue;
    out.push({
      employerKey: key,
      employerLabel: list[0]?.employerGroup || list[0]?.employerName || key,
      n: list.length,
      medianPay: med,
      sampleRoles: [...new Set(list.map((o) => o.roleName).filter(Boolean))].slice(0, 3),
    });
  }
  return out.sort((a, b) => b.medianPay - a.medianPay).slice(0, limit);
}

/** Recommended cash adjustment to reach selected benchmark (0 if already at/above). */
export function recommendedAdjustment(
  current: number,
  marketValue: number | null,
): number {
  if (marketValue == null) return 0;
  return Math.max(0, marketValue - current);
}

/** @deprecated Prefer selectedBenchmarkValue — kept for call-site compatibility. */
export function primaryBenchmarkTarget(
  mode: BenchmarkMode,
  band: MarketBand,
  marketValue: number | null,
  record: MarketBandRecord | null = null,
): number | null {
  if (marketValue != null) return marketValue;
  return selectedBenchmarkValue(mode, band, record);
}

export function metricCurrencyLabel(mode: BenchmarkMode): string {
  if (mode === "ppp") return "PPP ₹";
  if (mode === "fx" || mode === "nominal") return "FX ₹";
  if (mode === "talent") return "Talent Market · FX ₹";
  return "Market Benchmark · FX ₹";
}

export function modeBenchmarkLabel(mode: BenchmarkMode): string {
  switch (mode === "nominal" ? "fx" : mode) {
    case "talent":
      return "Talent Market Value";
    case "market":
      return "Market Benchmark Value";
    case "fx":
      return "FX Equivalent";
    case "ppp":
      return "PPP Equivalent";
    default:
      return "Benchmark Value";
  }
}

/** Short UI label for the left compensation / salary panel benchmark line. */
export function modePayPanelLabel(mode: BenchmarkMode): string {
  switch (mode === "nominal" ? "fx" : mode) {
    case "talent":
      return "Talent Market pay (INR)";
    case "market":
      return "Market Benchmark pay (INR)";
    case "fx":
      return "FX pay (INR)";
    case "ppp":
      return "PPP pay (INR)";
    default:
      return "Benchmark pay (INR)";
  }
}

export function modeMethodologyLabel(mode: BenchmarkMode): string {
  switch (mode === "nominal" ? "fx" : mode) {
    case "talent":
      return "Talent Market: Market Benchmark × Role Demand × Scarcity (retention & hiring value)";
    case "market":
      return "Market Benchmark: P50 × Geographic Premium × Compensation Competitiveness";
    case "fx":
      return "FX View: Current USD × FX_USD_INR — pure currency conversion (no market adjustments)";
    case "ppp":
      return "PPP View: Current USD × PPP_Conversion_Factor — purchasing-power equivalent only";
    default:
      return "";
  }
}

export function modeExplanation(mode: BenchmarkMode): string {
  switch (mode === "nominal" ? "fx" : mode) {
    case "talent":
      return "Retention & hiring market value";
    case "market":
      return "Compensation benchmark median";
    case "fx":
      return "Currency conversion";
    case "ppp":
      return "Purchasing power equivalent";
    default:
      return "";
  }
}

/** Portfolio roll-up KPIs for dashboard (recomputed per active mode). */
export function portfolioMarketKpis(
  analyses: GapAnalysis[],
): {
  underpaidPct: number;
  aboveMarketPct: number;
  highRiskPct: number;
  criticalRiskPct: number;
  retentionExposure: number;
  correctionBudget: number;
  avgPayGapPct: number | null;
  avgMarketValue: number | null;
  avgMarketMedian: number | null;
} {
  const n = analyses.length;
  if (!n) {
    return {
      underpaidPct: 0,
      aboveMarketPct: 0,
      highRiskPct: 0,
      criticalRiskPct: 0,
      retentionExposure: 0,
      correctionBudget: 0,
      avgPayGapPct: null,
      avgMarketValue: null,
      avgMarketMedian: null,
    };
  }

  const underpaid = analyses.filter(
    (a) =>
      a.marketPosition === "significantly_underpaid" ||
      a.marketPosition === "underpaid" ||
      (a.payGapPct != null && a.payGapPct < -10),
  ).length;
  const above = analyses.filter(
    (a) =>
      a.payGapClass === "above_market" ||
      a.payGapClass === "significantly_above_market",
  ).length;
  const riskAnalyses = analyses.filter((a) => a.riskSupported);
  const riskN = riskAnalyses.length || 1;
  const highRisk = riskAnalyses.filter(
    (a) => a.riskTier === "high" || a.riskTier === "critical",
  ).length;
  const criticalRisk = riskAnalyses.filter((a) => a.riskTier === "critical").length;
  const retentionExposure = riskAnalyses
    .filter((a) => a.riskTier === "high" || a.riskTier === "critical")
    .reduce((s, a) => s + a.recommendedAdjustment, 0);
  const correctionBudget = analyses.reduce((s, a) => s + a.recommendedAdjustment, 0);
  const gaps = analyses.map((a) => a.payGapPct).filter((v): v is number => v != null);
  const mvs = analyses.map((a) => a.marketValue).filter((v): v is number => v != null);
  const meds = analyses.map((a) => a.band.p50).filter((v): v is number => v != null);

  return {
    underpaidPct: (underpaid / n) * 100,
    aboveMarketPct: (above / n) * 100,
    highRiskPct: (highRisk / riskN) * 100,
    criticalRiskPct: (criticalRisk / riskN) * 100,
    retentionExposure,
    correctionBudget,
    avgPayGapPct: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null,
    avgMarketValue: mvs.length ? mvs.reduce((a, b) => a + b, 0) / mvs.length : null,
    avgMarketMedian: meds.length ? meds.reduce((a, b) => a + b, 0) / meds.length : null,
  };
}
