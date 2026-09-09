import type {
  DestinationPull,
  EmployerPull,
  GapAnalysis,
  GapVerdict,
  HubId,
  IncumbentProfile,
  MarketBand,
  MarketBandRecord,
  MetricMode,
  Observation,
  RiskTier,
  ScenarioResult,
  SourcePull,
  TargetPercentile,
} from "../types";
import { COUNTRY_FX_TO_INR, COUNTRY_LABEL, DIRECTIONAL_N, FX_USD_INR, STRATEGIC_TARGET_OPTIONS } from "./constants";
import {
  classifyMarketPosition,
  classifyPayGap,
  computeMarketBenchmarkValue,
  computePayGapPct,
  computeTalentMarketValue,
  expectedOfferRange,
  recommendedAdjustment,
  scoreCompetitiveThreat,
  scoreRetentionRisk,
  selectedBenchmarkValue,
  topCompetitorCompanies,
} from "./marketBenchmark";
import { scoreFlightRisk } from "./indiaExecutive";
import { DEFAULT_HUB, hubMultiplier, hubOption, scaleHubInr } from "./metros";
import { isPresent } from "./money";
import { convertUsdToPppInr } from "./ppp";
import { groupBy, median, metricValue, quantile, sortedNumbers } from "./stats";

/** Scale FX-INR band percentiles by Indian metro hub index (no-op for PPP bands / 1.0). */
function scaleMarketBand(band: MarketBand, mult: number, apply: boolean): MarketBand {
  if (!apply || mult === 1) {
    return {
      ...band,
      p10: band.p10 == null ? null : Math.round(band.p10),
      p25: band.p25 == null ? null : Math.round(band.p25),
      p50: band.p50 == null ? null : Math.round(band.p50),
      p75: band.p75 == null ? null : Math.round(band.p75),
      p90: band.p90 == null ? null : Math.round(band.p90),
      min: band.min == null ? null : Math.round(band.min),
      max: band.max == null ? null : Math.round(band.max),
      mean: band.mean == null ? null : Math.round(band.mean),
    };
  }
  return {
    ...band,
    p10: scaleHubInr(band.p10, mult),
    p25: scaleHubInr(band.p25, mult),
    p50: scaleHubInr(band.p50, mult),
    p75: scaleHubInr(band.p75, mult),
    p90: scaleHubInr(band.p90, mult),
    min: scaleHubInr(band.min, mult),
    max: scaleHubInr(band.max, mult),
    mean: scaleHubInr(band.mean, mult),
  };
}

export function metricOf(o: Observation, metric: MetricMode, hubId?: HubId): number | null {
  return metricValue(o, metric, hubId);
}

function bandUsesPpp(metric: MetricMode): boolean {
  return metric === "ppp";
}

function bandPercentiles(
  record: MarketBandRecord,
  metric: MetricMode,
  hubId: HubId = DEFAULT_HUB,
): MarketBand {
  // Prefer native multi-metro INR columns when present (India summary grain).
  const hubStats = record.metros?.[hubId] ?? record.metros?.bengaluru;
  if (!bandUsesPpp(metric) && hubStats) {
    return {
      p10: hubStats.p25,
      p25: hubStats.p25,
      p50: hubStats.p50,
      p75: hubStats.p75,
      p90: hubStats.p75,
      min: hubStats.p25,
      max: hubStats.p75,
      mean: hubStats.mean,
      n: record.sampleSize,
      sourceCount: 1,
      directional: record.sampleSize > 0 && record.sampleSize < DIRECTIONAL_N,
    };
  }

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

export function marketBandFromRecord(
  record: MarketBandRecord,
  metric: MetricMode,
  hubId: HubId = DEFAULT_HUB,
): MarketBand {
  return bandPercentiles(record, metric, hubId);
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
  options?: {
    matchedBandRecord?: MarketBandRecord | null;
    hubId?: HubId;
    targetPercentile?: TargetPercentile;
  },
): GapAnalysis {
  const matchedBandRecord = options?.matchedBandRecord ?? null;
  const hubId = options?.hubId ?? DEFAULT_HUB;
  const targetPercentile: TargetPercentile = options?.targetPercentile ?? "p50";
  const targetOpt =
    STRATEGIC_TARGET_OPTIONS.find((o) => o.id === targetPercentile) ?? STRATEGIC_TARGET_OPTIONS[1]!;
  const mult = hubMultiplier(hubId);
  // Hub indices scale FX cash INR markets (Talent / Market / FX). PPP stays purchasing-power only.
  const applyHub = metric !== "ppp";
  // When metros{} is present, percentiles are already hub-native — do not re-multiply.
  const hasNativeMetros = !!matchedBandRecord?.metros;
  const applyHubScale = applyHub && !hasNativeMetros;

  // Display band follows active mode currency + selected India hub.
  const rawBand = matchedBandRecord
    ? marketBandFromRecord(matchedBandRecord, metric, hubId)
    : buildMarketBand(matched, metric);
  const band = scaleMarketBand(rawBand, mult, applyHubScale);

  // Market formulas run on FX-currency hub band.
  const rawFxBand = matchedBandRecord
    ? marketBandFromRecord(matchedBandRecord, "fx", hubId)
    : buildMarketBand(matched, "fx");
  const fxBand = scaleMarketBand(rawFxBand, mult, applyHubScale);

  const values = matched.map((o) => metricOf(o, metric, hubId)).filter(isPresent);

  // Current salary is always cash FX INR — mode / hub must not change this number.
  const yourPay = yourPayFx;

  const marketBenchmarkValue = computeMarketBenchmarkValue(fxBand.p50, matchedBandRecord);
  const talentMarketValue = computeTalentMarketValue(fxBand.p50, matchedBandRecord);

  // Strategic Compensation Target: Pay_Gap vs metros[hub][p25|p50|p75].
  const strategicTarget =
    targetPercentile === "p25"
      ? fxBand.p25
      : targetPercentile === "p75"
        ? fxBand.p75
        : fxBand.p50;

  let marketValue =
    strategicTarget != null && Number.isFinite(strategicTarget)
      ? Math.round(strategicTarget)
      : selectedBenchmarkValue("market", fxBand, matchedBandRecord, yourPay);
  if (marketValue != null) marketValue = Math.round(marketValue);

  const payGapPct = computePayGapPct(yourPay, marketValue);

  const positionPay = yourPay;
  const pct = percentileRank(values, positionPay);

  const p50 = band.p50;
  const gapVsP50 = p50 != null ? positionPay - p50 : null;
  const gapVsP50Pct = p50 != null && p50 !== 0 ? ((positionPay - p50) / p50) * 100 : null;
  const gapVsP25 = band.p25 != null ? positionPay - band.p25 : null;
  const gapVsP75 = band.p75 != null ? positionPay - band.p75 : null;
  const gapVsBenchmark = marketValue != null ? yourPay - marketValue : null;

  const aboveYou = matched.filter((o) => {
    const v = metricOf(o, metric, hubId);
    return isPresent(v) && v > positionPay;
  });
  const competitiveAbovePct = matched.length ? (aboveYou.length / matched.length) * 100 : 0;

  const marketPosition = classifyMarketPosition(positionPay, band);

  const competitors = topCompetitorCompanies(matched, metric, 5, hubId);
  const topCompetitorPremiumPct =
    competitors[0] && positionPay
      ? ((competitors[0].medianPay - positionPay) / positionPay) * 100
      : null;

  // Flight risk uses gap vs the strategic target (not always P50).
  const flight = scoreFlightRisk({
    payGapPct,
    record: matchedBandRecord,
    roleFamily: matchedBandRecord?.roleFamily,
  });

  const legacyRisk = scoreRetentionRisk({
    payGapPct,
    record: matchedBandRecord,
    mode: "talent",
    competitorPremiumPct: topCompetitorPremiumPct,
  });

  const useIndiaFlight = hasNativeMetros || matchedBandRecord?.countryCode === "IN";
  const tier = useIndiaFlight ? flight.tier : legacyRisk.tier;
  const score = useIndiaFlight ? flight.score : legacyRisk.score;
  const reasons = useIndiaFlight ? flight.reasons : legacyRisk.reasons;
  const riskOk = useIndiaFlight ? true : legacyRisk.supported;

  const threat = scoreCompetitiveThreat({
    payGapPct,
    competitorPremiumPct: topCompetitorPremiumPct,
    scarcityIndicator: matchedBandRecord?.talentScarcityIndicator,
    mode: "talent",
  });

  const offer = expectedOfferRange(fxBand, matchedBandRecord, "talent");
  const adjustment = recommendedAdjustment(yourPay, marketValue);

  const geoIndex =
    applyHub && mult !== 1 ? mult : (matchedBandRecord?.geographicPremiumIndex ?? null);

  const payGapClass = classifyPayGap(payGapPct);
  const verdict = classifyVerdict(payGapPct);

  return {
    yourPay,
    metric: "market",
    hubId,
    hubMultiplier: mult,
    targetPercentile,
    band,
    bandSource: matchedBandRecord ? "market_band" : "computed",
    matchedBandRecord,
    bandGeographyLevel: matchedBandRecord?.geographyLevel ?? null,
    compensationDefinition: matchedBandRecord?.compensationDefinition ?? "India_Tech_Benchmark_INR",
    compensationCompetitivenessIndex: matchedBandRecord?.compensationCompetitivenessIndex ?? null,
    geographicPremiumIndex: geoIndex,
    leadershipPremiumIndex: matchedBandRecord?.leadershipPremiumIndex ?? null,
    roleDemandIndex: matchedBandRecord?.roleDemandIndex ?? null,
    talentScarcityIndicator: matchedBandRecord?.talentScarcityIndicator || null,
    marketValue,
    marketBenchmarkValue,
    talentMarketValue,
    benchmarkLabel: `${targetOpt.title} · ${hubOption(hubId).shortLabel}`,
    marketMedian: p50,
    marketPosition,
    payGapPct,
    payGapClass,
    expectedOfferLow: offer.low,
    expectedOfferHigh: offer.high,
    offerRangeSupported: true,
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
    riskSupported: riskOk,
    riskTier: tier,
    riskScore: score,
    riskReasons: reasons,
    competitiveAbove: aboveYou.length,
    competitiveAbovePct,
    sliceLabel: `${sliceLabel} · ${hubOption(hubId).shortLabel} · ${targetOpt.shortLabel}`,
    matched,
    aboveYou,
  };
}

export function topEmployerPulls(
  aboveYou: Observation[],
  yourPay: number,
  metric: MetricMode,
  limit = 12,
  hubId?: HubId,
): EmployerPull[] {
  const grouped = groupBy(aboveYou, (o) => o.employerGroup || o.employerName || "Unknown employer");
  const out: EmployerPull[] = [];
  for (const [employerKey, list] of grouped) {
    if (list.length < 1) continue;
    const values = list.map((o) => metricOf(o, metric, hubId)).filter(isPresent);
    const med = median(values);
    if (med == null) continue;
    out.push({
      employerKey,
      employerLabel: list[0]?.employerName || list[0]?.employerGroup || employerKey,
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
        hubId: analysis.hubId,
        targetPercentile: analysis.targetPercentile,
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
    label: "Data Scientist · Mid · India",
    countryCode: "IN",
    roleFamily: "Data Science",
    roleName: "Data Scientist",
    experienceLevel: "Mid (3-5 Years)",
    city: "",
    metro: "",
    payType: "Base",
    currentPayInr: 1_200_000,
    currencyInput: "INR",
    rawAmount: 1_200_000,
    notes: "",
  };
}

export function sliceLabelFromProfile(p: IncumbentProfile): string {
  const parts = [
    p.payType === "Base" || p.payType === "Base_Salary" ? "Base (INR)" : p.payType,
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
