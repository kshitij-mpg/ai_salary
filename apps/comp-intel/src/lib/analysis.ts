import type {
  DestinationPull,
  EmployerPull,
  GapAnalysis,
  GapVerdict,
  IncumbentProfile,
  MarketBand,
  MarketBandRecord,
  MetricMode,
  Observation,
  RiskTier,
  ScenarioResult,
  SourcePull,
} from "../types";
import { COUNTRY_FX_TO_INR, COUNTRY_LABEL, DIRECTIONAL_N, FX_USD_INR } from "./constants";
import {
  classifyMarketPosition,
  classifyPayGap,
  computeMarketBenchmarkValue,
  computePayGapPct,
  computeTalentMarketValue,
  expectedOfferRange,
  modeBenchmarkLabel,
  offerRangeSupported,
  recommendedAdjustment,
  riskSupported,
  scoreCompetitiveThreat,
  scoreRetentionRisk,
  selectedBenchmarkValue,
  topCompetitorCompanies,
} from "./marketBenchmark";
import { isPresent } from "./money";
import { convertUsdToPppInr } from "./ppp";
import { groupBy, median, metricValue, quantile, sortedNumbers } from "./stats";

export function metricOf(o: Observation, metric: MetricMode): number | null {
  return metricValue(o, metric);
}

function bandUsesPpp(metric: MetricMode): boolean {
  return metric === "ppp";
}

function bandPercentiles(record: MarketBandRecord, metric: MetricMode): MarketBand {
  const src = bandUsesPpp(metric)
    ? {
        p10: record.p10PppInr,
        p25: record.p25PppInr,
        p50: record.p50PppInr,
        p75: record.p75PppInr,
        p90: record.p90PppInr,
        min: record.minPppInr,
        max: record.maxPppInr,
        mean: record.meanPppInr,
      }
    : {
        p10: record.p10Inr,
        p25: record.p25Inr,
        p50: record.p50Inr,
        p75: record.p75Inr,
        p90: record.p90Inr,
        min: record.minInr,
        max: record.maxInr,
        mean: record.meanInr,
      };

  return {
    ...src,
    n: record.sampleSize,
    sourceCount: 1,
    directional: record.sampleSize > 0 && record.sampleSize < DIRECTIONAL_N,
  };
}

export function marketBandFromRecord(record: MarketBandRecord, metric: MetricMode): MarketBand {
  return bandPercentiles(record, metric);
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

export function classifyVerdict(gapVsBenchmarkPct: number | null): GapVerdict {
  if (gapVsBenchmarkPct == null) return "at_market";
  if (gapVsBenchmarkPct <= -10) return "underpaid";
  if (gapVsBenchmarkPct >= 10) return "overpaid";
  return "at_market";
}

/**
 * @deprecated Prefer scoreRetentionRisk from marketBenchmark — kept for scenario re-score path.
 */
export function scoreRisk(input: {
  gapVsP50Pct: number | null;
  percentileRank: number | null;
  competitiveAbovePct: number;
  band: MarketBand;
  matchedBandRecord?: MarketBandRecord | null;
}): { tier: RiskTier; score: number; reasons: string[] } {
  const result = scoreRetentionRisk({
    payGapPct: input.gapVsP50Pct,
    record: input.matchedBandRecord ?? null,
    mode: "market",
  });
  return { tier: result.tier, score: result.score, reasons: result.reasons };
}

export function analyzeGap(
  matched: Observation[],
  yourPayFx: number,
  metric: MetricMode,
  sliceLabel: string,
  options?: { matchedBandRecord?: MarketBandRecord | null },
): GapAnalysis {
  const matchedBandRecord = options?.matchedBandRecord ?? null;

  // Display band (histogram / ladder percentiles) follows active mode currency.
  const band = matchedBandRecord
    ? marketBandFromRecord(matchedBandRecord, metric)
    : buildMarketBand(matched, metric);

  // Market / Talent formulas ALWAYS run on FX-currency P50 — never on PPP band.
  const fxBand = matchedBandRecord
    ? marketBandFromRecord(matchedBandRecord, "fx")
    : buildMarketBand(matched, "fx");

  const values = matched.map((o) => metricOf(o, metric)).filter(isPresent);

  // Current salary is always cash FX INR — mode must not change this number.
  const yourPay = yourPayFx;

  const marketBenchmarkValue = computeMarketBenchmarkValue(fxBand.p50, matchedBandRecord);
  const talentMarketValue = computeTalentMarketValue(fxBand.p50, matchedBandRecord);
  // Distinct path per mode: Talent / Market use FX P50 formulas; FX / PPP convert current salary.
  const marketValue = selectedBenchmarkValue(metric, fxBand, matchedBandRecord, yourPay);
  const payGapPct = computePayGapPct(yourPay, marketValue);

  // Market position vs display band: in PPP mode compare PPP-equivalent current to PPP percentiles.
  const positionPay =
    metric === "ppp"
      ? convertUsdToPppInr(
          yourPay /
            (matchedBandRecord?.fxUsdInr != null && matchedBandRecord.fxUsdInr > 0
              ? matchedBandRecord.fxUsdInr
              : FX_USD_INR),
        )
      : yourPay;
  const pct = percentileRank(values, positionPay);

  const p50 = band.p50;
  const gapVsP50 = p50 != null ? positionPay - p50 : null;
  const gapVsP50Pct = p50 != null && p50 !== 0 ? ((positionPay - p50) / p50) * 100 : null;
  const gapVsP25 = band.p25 != null ? positionPay - band.p25 : null;
  const gapVsP75 = band.p75 != null ? positionPay - band.p75 : null;
  const gapVsBenchmark = marketValue != null ? yourPay - marketValue : null;

  const aboveYou = matched.filter((o) => {
    const v = metricOf(o, metric);
    return isPresent(v) && v > positionPay;
  });
  const competitiveAbovePct = matched.length ? (aboveYou.length / matched.length) * 100 : 0;

  const marketPosition = classifyMarketPosition(positionPay, band);
  const payGapClass = classifyPayGap(payGapPct);
  const verdict = classifyVerdict(payGapPct);

  const { tier, score, reasons, supported: riskOk } = scoreRetentionRisk({
    payGapPct,
    record: matchedBandRecord,
    mode: metric,
  });

  const competitors = topCompetitorCompanies(matched, metric, 5);
  const topCompetitorPremiumPct =
    competitors[0] && positionPay
      ? ((competitors[0].medianPay - positionPay) / positionPay) * 100
      : null;

  const threat = scoreCompetitiveThreat({
    payGapPct,
    competitorPremiumPct: topCompetitorPremiumPct,
    scarcityIndicator: matchedBandRecord?.talentScarcityIndicator,
    mode: metric,
  });

  // Offer range uses FX band percentiles (Talent mode only).
  const offer = expectedOfferRange(fxBand, matchedBandRecord, metric);
  const adjustment = recommendedAdjustment(yourPay, marketValue);

  return {
    yourPay,
    metric,
    band,
    bandSource: matchedBandRecord ? "market_band" : "computed",
    matchedBandRecord,
    bandGeographyLevel: matchedBandRecord?.geographyLevel ?? null,
    compensationDefinition: matchedBandRecord?.compensationDefinition ?? "LCA_Offered_Base_Wage",
    compensationCompetitivenessIndex: matchedBandRecord?.compensationCompetitivenessIndex ?? null,
    geographicPremiumIndex: matchedBandRecord?.geographicPremiumIndex ?? null,
    leadershipPremiumIndex: matchedBandRecord?.leadershipPremiumIndex ?? null,
    roleDemandIndex: matchedBandRecord?.roleDemandIndex ?? null,
    talentScarcityIndicator: matchedBandRecord?.talentScarcityIndicator || null,
    marketValue,
    marketBenchmarkValue,
    talentMarketValue,
    benchmarkLabel: modeBenchmarkLabel(metric),
    marketMedian: p50,
    marketPosition,
    payGapPct,
    payGapClass,
    expectedOfferLow: offer.low,
    expectedOfferHigh: offer.high,
    offerRangeSupported: offerRangeSupported(metric === "nominal" ? "fx" : metric),
    topCompetitors: competitors,
    competitiveThreatTier: threat.tier,
    competitiveThreatScore: threat.score,
    competitiveThreatReasons: threat.reasons,
    recommendedAdjustment: adjustment,
    percentileRank: pct,
    gapVsP50,
    gapVsP50Pct,
    gapVsP25,
    gapVsP75,
    gapVsBenchmark,
    gapVsBenchmarkPct: payGapPct,
    verdict,
    riskSupported: riskOk && riskSupported(metric === "nominal" ? "fx" : metric),
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

export function topEmployerPulls(
  aboveYou: Observation[],
  yourPay: number,
  metric: MetricMode,
  limit = 12,
): EmployerPull[] {
  const grouped = groupBy(aboveYou, (o) => o.employerGroup || o.employerName || "Unknown employer");
  const out: EmployerPull[] = [];
  for (const [employerKey, list] of grouped) {
    if (list.length < 2) continue;
    const values = list.map((o) => metricOf(o, metric)).filter(isPresent);
    const med = median(values);
    if (med == null) continue;
    out.push({
      employerKey,
      employerLabel: list[0]?.employerGroup || list[0]?.employerName || employerKey,
      n: list.length,
      medianPay: med,
      premiumVsYou: med - yourPay,
      premiumPct: yourPay ? ((med - yourPay) / yourPay) * 100 : 0,
      sampleRoles: [...new Set(list.map((o) => o.roleName))].slice(0, 3),
    });
  }
  return out.sort((a, b) => b.premiumVsYou - a.premiumVsYou).slice(0, limit);
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
    ...mk("employer", (o) => o.employerGroup || o.employerName, (_o, key) => key),
    ...mk("city", (o) => `${o.countryCode}|${o.city}`, (o, key) => {
      const city = key.split("|")[1] ?? o.city;
      return `${city}, ${COUNTRY_LABEL[o.countryCode] ?? o.country}`;
    }),
    ...mk("metro", (o) => `${o.countryCode}|${o.metro}`, (_o, key) => {
      const metro = key.split("|")[1] ?? "";
      return metro;
    }),
    ...mk("country", (o) => o.countryCode, (o) => COUNTRY_LABEL[o.countryCode] ?? o.country),
  ].sort((a, b) => b.premiumVsYou - a.premiumVsYou);
}

export function buildScenarios(analysis: GapAnalysis): ScenarioResult[] {
  const { yourPay, band, marketValue, benchmarkLabel } = analysis;
  const targets: { id: string; label: string; target: number | null }[] = [
    { id: "p25", label: "Raise to market P25", target: band.p25 },
    { id: "p50", label: "Raise to market median (P50)", target: band.p50 },
    { id: "market_value", label: `Raise to ${benchmarkLabel}`, target: marketValue },
    { id: "p75", label: "Raise to market P75", target: band.p75 },
    { id: "plus10", label: "Raise +10%", target: yourPay * 1.1 },
    { id: "plus20", label: "Raise +20%", target: yourPay * 1.2 },
  ];

  return targets
    .filter((t): t is { id: string; label: string; target: number } => t.target != null && t.target > yourPay)
    .map((t) => {
      const fake = analyzeGap(analysis.matched, t.target, analysis.metric, analysis.sliceLabel, {
        matchedBandRecord: analysis.matchedBandRecord,
      });
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

/** Annual USD equivalent (study FX bridge) for PPP conversion. */
export function toAnnualUsd(
  amount: number,
  currencyInput: IncumbentProfile["currencyInput"],
  countryCode: string,
): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (currencyInput === "USD") return amount;
  return toAnnualInr(amount, currencyInput, countryCode) / FX_USD_INR;
}

/**
 * PPP-adjusted INR for incumbent pay — mirrors observation `salaryPppInrCorrected`.
 * Optional analytical view only — not Market Value.
 */
export function salaryPppInrCorrected(salaryInr: number, countryCode: string): number {
  if (!Number.isFinite(salaryInr) || salaryInr <= 0) return 0;
  if (countryCode === "IN") return salaryInr;
  return convertUsdToPppInr(salaryInr / FX_USD_INR);
}

/**
 * Incumbent current salary for analysis / display.
 * ALWAYS returns cash FX INR — never changes with benchmark mode.
 * Mode affects the *benchmark*, not current salary.
 */
export function incumbentMetricPay(profile: IncumbentProfile, _metric?: MetricMode): number {
  return profile.currentPayInr || 0;
}

/** PPP purchasing-power equivalent of the incumbent's current salary (USD × PPP factor). */
export function incumbentPppPay(profile: IncumbentProfile): number {
  const nominalInr = profile.currentPayInr;
  if (!nominalInr) return 0;
  if (profile.countryCode === "IN") return nominalInr;
  const usd = toAnnualUsd(profile.rawAmount, profile.currencyInput, profile.countryCode);
  return convertUsdToPppInr(usd);
}

export function defaultProfile(): IncumbentProfile {
  return {
    label: "Data Scientist · Mid · US",
    countryCode: "US",
    roleFamily: "Data Scientist",
    roleName: "",
    experienceLevel: "Mid Level (3-5 years)",
    city: "",
    metro: "",
    payType: "Base",
    currentPayInr: 130_000 * FX_USD_INR,
    currencyInput: "USD",
    rawAmount: 130_000,
    notes: "",
  };
}

export function sliceLabelFromProfile(p: IncumbentProfile): string {
  const parts = [
    p.payType === "Base" || p.payType === "Base_Salary" ? "Base (LCA)" : p.payType,
    COUNTRY_LABEL[p.countryCode] ?? p.countryCode,
    p.roleFamily || p.roleName || "All role family",
    p.experienceLevel || "Any Experience",
    p.metro || p.city || null,
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
