import type {
  DestinationPull,
  GapAnalysis,
  GapVerdict,
  IncumbentProfile,
  MarketBand,
  MetricMode,
  Observation,
  RiskTier,
  ScenarioResult,
  SourcePull,
} from "../types";
import { COUNTRY_FX_TO_INR, COUNTRY_LABEL, DIRECTIONAL_N, FX_USD_INR } from "./constants";
import { isPresent } from "./money";
import { groupBy, median, metricValue, quantile, sortedNumbers } from "./stats";

export function metricOf(o: Observation, metric: MetricMode): number | null {
  return metricValue(o, metric);
}

export function buildMarketBand(rows: Observation[], metric: MetricMode): MarketBand {
  const values = rows.map((o) => metricOf(o, metric)).filter(isPresent);
  const n = values.length;
  return {
    p10: quantile(values, 0.1),
    p25: quantile(values, 0.25),
    p50: quantile(values, 0.5),
    p75: quantile(values, 0.75),
    p90: quantile(values, 0.9),
    min: n ? Math.min(...values) : null,
    max: n ? Math.max(...values) : null,
    mean: n ? values.reduce((a, b) => a + b, 0) / n : null,
    n,
    sourceCount: new Set(rows.map((o) => o.sourceName)).size,
    directional: n > 0 && n < DIRECTIONAL_N,
  };
}

/** Percentile rank: share of observations ≤ your pay (0–100). */
export function percentileRank(values: number[], yourPay: number): number | null {
  if (!values.length) return null;
  const le = values.filter((v) => v <= yourPay).length;
  return Math.round((le / values.length) * 1000) / 10;
}

export function classifyVerdict(gapVsP50Pct: number | null): GapVerdict {
  if (gapVsP50Pct == null) return "at_market";
  if (gapVsP50Pct <= -8) return "underpaid";
  if (gapVsP50Pct >= 8) return "overpaid";
  return "at_market";
}

/**
 * Risk score 0–100 (higher = more likely to leave for better pay).
 * Driven by gap to P50, position vs P25/P75, and density of market above you.
 */
export function scoreRisk(input: {
  gapVsP50Pct: number | null;
  percentileRank: number | null;
  competitiveAbovePct: number;
  band: MarketBand;
}): { tier: RiskTier; score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 35;

  const gap = input.gapVsP50Pct;
  if (gap != null) {
    if (gap <= -25) {
      score += 40;
      reasons.push(`Pay is ${Math.abs(Math.round(gap))}% below market median (P50).`);
    } else if (gap <= -15) {
      score += 28;
      reasons.push(`Pay is ${Math.abs(Math.round(gap))}% below market median.`);
    } else if (gap <= -8) {
      score += 16;
      reasons.push(`Pay sits meaningfully below market median.`);
    } else if (gap >= 15) {
      score -= 22;
      reasons.push(`Pay is ${Math.round(gap)}% above market median — retention buffer.`);
    } else if (gap >= 8) {
      score -= 12;
      reasons.push(`Pay is above market median.`);
    } else {
      reasons.push(`Pay is near market median (±8%).`);
    }
  }

  if (input.percentileRank != null) {
    if (input.percentileRank < 25) {
      score += 18;
      reasons.push(`Below P25 of published observations (≈${input.percentileRank}th pct).`);
    } else if (input.percentileRank < 40) {
      score += 10;
      reasons.push(`Below the lower half of published observations.`);
    } else if (input.percentileRank >= 75) {
      score -= 14;
      reasons.push(`At or above P75 of published observations.`);
    }
  }

  if (input.competitiveAbovePct >= 70) {
    score += 14;
    reasons.push(`${Math.round(input.competitiveAbovePct)}% of matching observations pay more.`);
  } else if (input.competitiveAbovePct >= 55) {
    score += 8;
    reasons.push(`A majority of matching observations pay more.`);
  } else if (input.competitiveAbovePct <= 30) {
    score -= 8;
    reasons.push(`Few matching observations pay more than this package.`);
  }

  if (input.band.directional) {
    score += 4;
    reasons.push(`Thin sample (n=${input.band.n}) — treat as directional.`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let tier: RiskTier;
  if (score >= 75) tier = "critical";
  else if (score >= 58) tier = "high";
  else if (score >= 42) tier = "watch";
  else if (score >= 28) tier = "stable";
  else tier = "premium";

  return { tier, score, reasons };
}

export function analyzeGap(
  matched: Observation[],
  yourPay: number,
  metric: MetricMode,
  sliceLabel: string,
): GapAnalysis {
  const band = buildMarketBand(matched, metric);
  const values = matched.map((o) => metricOf(o, metric)).filter(isPresent);
  const pct = percentileRank(values, yourPay);
  const p50 = band.p50;
  const gapVsP50 = p50 != null ? yourPay - p50 : null;
  const gapVsP50Pct = p50 != null && p50 !== 0 ? ((yourPay - p50) / p50) * 100 : null;
  const gapVsP25 = band.p25 != null ? yourPay - band.p25 : null;
  const gapVsP75 = band.p75 != null ? yourPay - band.p75 : null;
  const aboveYou = matched.filter((o) => {
    const v = metricOf(o, metric);
    return isPresent(v) && v > yourPay;
  });
  const competitiveAbovePct = matched.length ? (aboveYou.length / matched.length) * 100 : 0;
  const verdict = classifyVerdict(gapVsP50Pct);
  const { tier, score, reasons } = scoreRisk({
    gapVsP50Pct,
    percentileRank: pct,
    competitiveAbovePct,
    band,
  });

  return {
    yourPay,
    metric,
    band,
    percentileRank: pct,
    gapVsP50,
    gapVsP50Pct,
    gapVsP25,
    gapVsP75,
    verdict,
    riskTier: tier,
    riskScore: score,
    riskReasons: reasons,
    competitiveAbove: aboveYou.length,
    competitiveAbovePct,
    sliceLabel,
    matched,
    aboveYou,
  };
}

export function topSourcePulls(
  aboveYou: Observation[],
  yourPay: number,
  metric: MetricMode,
  limit = 12,
): SourcePull[] {
  const grouped = groupBy(aboveYou, (o) => o.sourceName);
  const out: SourcePull[] = [];
  for (const [sourceName, list] of grouped) {
    const values = list.map((o) => metricOf(o, metric)).filter(isPresent);
    const med = median(values);
    if (med == null) continue;
    out.push({
      sourceName,
      sourceType: list[0]?.sourceType ?? "",
      n: list.length,
      medianPay: med,
      premiumVsYou: med - yourPay,
      premiumPct: yourPay ? ((med - yourPay) / yourPay) * 100 : 0,
      isEmployerFiling: list.some((o) => o.isEmployerFiling),
      sampleRoles: [...new Set(list.map((o) => o.roleName))].slice(0, 3),
    });
  }
  return out.sort((a, b) => b.premiumVsYou - a.premiumVsYou).slice(0, limit);
}

export function topDestinations(
  aboveYou: Observation[],
  yourPay: number,
  metric: MetricMode,
): DestinationPull[] {
  const mk = (
    kind: DestinationPull["kind"],
    keyFn: (o: Observation) => string,
    labelFn: (o: Observation, key: string) => string,
  ): DestinationPull[] => {
    const grouped = groupBy(aboveYou, keyFn);
    const rows: DestinationPull[] = [];
    for (const [key, list] of grouped) {
      if (!key || key === "National") continue;
      const values = list.map((o) => metricOf(o, metric)).filter(isPresent);
      const med = median(values);
      if (med == null || list.length < 2) continue;
      rows.push({
        key,
        label: labelFn(list[0]!, key),
        kind,
        n: list.length,
        medianPay: med,
        premiumVsYou: med - yourPay,
        premiumPct: yourPay ? ((med - yourPay) / yourPay) * 100 : 0,
      });
    }
    return rows.sort((a, b) => b.premiumVsYou - a.premiumVsYou).slice(0, 8);
  };

  return [
    ...mk("city", (o) => `${o.countryCode}|${o.city}`, (o, key) => {
      const city = key.split("|")[1] ?? o.city;
      return `${city}, ${COUNTRY_LABEL[o.countryCode] ?? o.country}`;
    }),
    ...mk("country", (o) => o.countryCode, (o) => COUNTRY_LABEL[o.countryCode] ?? o.country),
    ...mk(
      "industry",
      (o) => o.industry || "Unspecified",
      (_o, key) => key,
    ),
  ].sort((a, b) => b.premiumVsYou - a.premiumVsYou);
}

export function buildScenarios(analysis: GapAnalysis): ScenarioResult[] {
  const { yourPay, band } = analysis;
  const targets: { id: string; label: string; target: number | null }[] = [
    { id: "p25", label: "Raise to market P25", target: band.p25 },
    { id: "p50", label: "Raise to market P50", target: band.p50 },
    { id: "p75", label: "Raise to market P75", target: band.p75 },
    { id: "plus10", label: "Raise +10%", target: yourPay * 1.1 },
    { id: "plus20", label: "Raise +20%", target: yourPay * 1.2 },
  ];

  return targets
    .filter((t): t is { id: string; label: string; target: number } => t.target != null && t.target > yourPay)
    .map((t) => {
      const fake = analyzeGap(analysis.matched, t.target, analysis.metric, analysis.sliceLabel);
      return {
        id: t.id,
        label: t.label,
        targetPay: t.target,
        deltaPay: t.target - yourPay,
        deltaPct: yourPay ? ((t.target - yourPay) / yourPay) * 100 : 0,
        newRiskTier: fake.riskTier,
        newRiskScore: fake.riskScore,
        newPercentile: fake.percentileRank,
        closesGapToP50: band.p50 != null && t.target >= band.p50,
      };
    });
}

/** Convert typed amount into annual INR for analysis. */
export function toAnnualInr(
  amount: number,
  currencyInput: IncumbentProfile["currencyInput"],
  countryCode: string,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (currencyInput === "INR") return amount;
  if (currencyInput === "USD") return amount * FX_USD_INR;
  const fx = COUNTRY_FX_TO_INR[countryCode] ?? FX_USD_INR;
  return amount * fx;
}

export function defaultProfile(): IncumbentProfile {
  return {
    label: "Data Scientist · Mid",
    countryCode: "IN",
    roleFamily: "Data Scientist",
    roleName: "",
    experienceLevel: "Mid Level (3-5 years)",
    city: "",
    payType: "Base_Salary",
    currentPayInr: 1_800_000,
    currencyInput: "INR",
    rawAmount: 1_800_000,
    notes: "",
  };
}

export function sliceLabelFromProfile(p: IncumbentProfile): string {
  const parts = [
    p.payType === "Base_Salary" ? "Base" : p.payType === "Total_Compensation" ? "TC" : p.payType,
    COUNTRY_LABEL[p.countryCode] ?? p.countryCode,
    p.roleFamily || p.roleName || "Role",
    p.experienceLevel,
    p.city || null,
  ];
  return parts.filter(Boolean).join(" · ");
}

export function histogramBuckets(values: number[], bins = 12): { x0: number; x1: number; n: number }[] {
  if (!values.length) return [];
  const s = sortedNumbers(values);
  const lo = s[0]!;
  const hi = s[s.length - 1]!;
  if (lo === hi) return [{ x0: lo, x1: hi, n: s.length }];
  const width = (hi - lo) / bins;
  const out = Array.from({ length: bins }, (_, i) => ({
    x0: lo + i * width,
    x1: lo + (i + 1) * width,
    n: 0,
  }));
  for (const v of s) {
    let idx = Math.floor((v - lo) / width);
    if (idx >= bins) idx = bins - 1;
    if (idx < 0) idx = 0;
    out[idx]!.n += 1;
  }
  return out;
}
