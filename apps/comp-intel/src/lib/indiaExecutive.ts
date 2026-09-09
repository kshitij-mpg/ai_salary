/**
 * Chairperson-facing India multi-metro alignment, flight risk, and competitor pull.
 */
import type {
  CompetitorCompany,
  HubId,
  MarketBandRecord,
  Observation,
  RiskTier,
} from "../types";
import { hubOption } from "./metros";
import { formatCompactINR, formatINR, isPresent } from "./money";
import { groupBy, median, quantile } from "./stats";

export type FlightRiskLevel = "low" | "medium" | "high" | "critical";

export const FLIGHT_RISK_LABEL: Record<FlightRiskLevel, string> = {
  low: "Low Flight Risk",
  medium: "Medium Flight Risk",
  high: "High Flight Risk",
  critical: "Critical Flight Risk",
};

/** Map executive flight levels onto existing RiskTier for badges / meters. */
export function flightLevelToRiskTier(level: FlightRiskLevel): RiskTier {
  switch (level) {
    case "low":
      return "stable";
    case "medium":
      return "watch";
    case "high":
      return "high";
    case "critical":
      return "critical";
  }
}

function escalate(level: FlightRiskLevel): FlightRiskLevel {
  if (level === "low") return "medium";
  if (level === "medium") return "high";
  if (level === "high") return "critical";
  return "critical";
}

/**
 * True when Role_Scarcity / talent indicator is High Scarcity or Specialized AI,
 * or when the role family itself is a scarce specialized AI family.
 */
export function isHighScarcityRole(
  record: MarketBandRecord | null | undefined,
  roleFamily?: string | null,
): boolean {
  const tip = (record?.talentScarcityIndicator ?? "").toLowerCase();
  const notes = (record?.notes ?? "").toLowerCase();
  const family = (roleFamily ?? record?.roleFamily ?? "").toLowerCase();
  if (tip.includes("high") || tip.includes("critical") || tip.includes("specialized")) return true;
  if (notes.includes("specialized") || notes.includes("high scarcity")) return true;
  if (
    family.includes("deep learning") ||
    family.includes("generative") ||
    family.includes("ai research") ||
    family.includes("computer vision") ||
    family.includes("nlp")
  ) {
    return true;
  }
  return false;
}

/**
 * Pay-gap → flight risk:
 *   underpaid 0–10%  → Low
 *   underpaid 11–25% → Medium
 *   underpaid >25%   → High
 * Overpaid / aligned → Low.
 * If high scarcity + underpaid, escalate one full tier.
 */
export function scoreFlightRisk(input: {
  payGapPct: number | null;
  record?: MarketBandRecord | null;
  roleFamily?: string | null;
}): {
  level: FlightRiskLevel;
  tier: RiskTier;
  score: number;
  reasons: string[];
  scarcityEscalated: boolean;
} {
  const reasons: string[] = [];
  const gap = input.payGapPct;
  let level: FlightRiskLevel = "low";

  if (gap == null) {
    reasons.push("Insufficient market median to score flight risk.");
    return { level, tier: "stable", score: 20, reasons, scarcityEscalated: false };
  }

  const underAbs = gap < 0 ? Math.abs(gap) : 0;
  if (gap >= 0) {
    level = "low";
    reasons.push(
      gap > 10
        ? `Package ${gap.toFixed(0)}% above ${hubCityHint()} market median — pay-driven flight risk is low.`
        : `Within ±10% of market median — Low Flight Risk.`,
    );
  } else if (underAbs <= 10) {
    level = "low";
    reasons.push(`Underpaid ${underAbs.toFixed(0)}% (0–10% band) → Low Flight Risk.`);
  } else if (underAbs <= 25) {
    level = "medium";
    reasons.push(`Underpaid ${underAbs.toFixed(0)}% (11–25% band) → Medium Flight Risk.`);
  } else {
    level = "high";
    reasons.push(`Underpaid ${underAbs.toFixed(0)}% (>25% band) → High Flight Risk.`);
  }

  const scarce = gap < 0 && isHighScarcityRole(input.record, input.roleFamily);
  let scarcityEscalated = false;
  if (scarce) {
    const before = level;
    level = escalate(level);
    scarcityEscalated = before !== level;
    reasons.push(
      `High scarcity / Specialized AI role — flight risk escalated ${before} → ${level}.`,
    );
  }

  const score =
    level === "low" ? 22 : level === "medium" ? 48 : level === "high" ? 72 : 90;

  return {
    level,
    tier: flightLevelToRiskTier(level),
    score,
    reasons,
    scarcityEscalated,
  };
}

function hubCityHint(): string {
  return "selected-city";
}

export type AlignmentTone = "aligned" | "overpaid" | "underpaid_warn" | "underpaid_critical";

/**
 * Pay_Gap = Incumbent_Pay − Strategic Target (metros[hub][p25|p50|p75]).
 * Negative ⇒ underpaid.
 */
export function alignmentSummary(input: {
  yourPay: number;
  marketTarget: number | null;
  hubId: HubId;
  targetLabel?: string;
}): {
  status: "Overpaid" | "Underpaid" | "Aligned";
  gapInr: number | null;
  gapPct: number | null;
  tone: AlignmentTone;
  sentence: string;
} {
  const city = hubOption(input.hubId).shortLabel;
  const target = input.marketTarget;
  const targetName = input.targetLabel ?? "market target";
  if (target == null || !Number.isFinite(target) || target <= 0) {
    return {
      status: "Aligned",
      gapInr: null,
      gapPct: null,
      tone: "aligned",
      sentence: `Insufficient ${city} ${targetName} to audit alignment.`,
    };
  }

  const gapInr = input.yourPay - target;
  const gapPct = (gapInr / target) * 100;
  const absInr = Math.abs(gapInr);
  const absPct = Math.abs(gapPct);

  if (Math.abs(gapPct) <= 5) {
    return {
      status: "Aligned",
      gapInr,
      gapPct,
      tone: "aligned",
      sentence: `Candidate is well-aligned (within ±5%) against the local ${city} ${targetName} at ${formatCompactINR(target)}.`,
    };
  }

  if (gapInr > 0) {
    return {
      status: "Overpaid",
      gapInr,
      gapPct,
      tone: "overpaid",
      sentence: `Candidate is Overpaid by ${formatCompactINR(absInr)} (${absPct.toFixed(0)}%) against the local ${city} ${targetName}.`,
    };
  }

  const tone: AlignmentTone = absPct > 15 ? "underpaid_critical" : "underpaid_warn";
  return {
    status: "Underpaid",
    gapInr,
    gapPct,
    tone,
    sentence: `Candidate is Underpaid by ${formatCompactINR(absInr)} (${absPct.toFixed(0)}%) against the local ${city} ${targetName}.`,
  };
}

/** Executive phrase e.g. "₹3.40 Lakh Underpaid". */
export function formatGapPhrase(gapInr: number | null | undefined): string {
  if (!isPresent(gapInr) || gapInr === 0) return "At market";
  const abs = Math.abs(gapInr);
  const label = gapInr < 0 ? "Underpaid" : "Overpaid";
  return `${formatCompactINR(abs)} ${label}`;
}

export interface PrimaryCompetitorRow {
  employerKey: string;
  employerLabel: string;
  n: number;
  medianPay: number;
  p75Pay: number | null;
  maxPay: number | null;
  premiumVsYou: number;
  premiumPct: number;
  sampleRoles: string[];
}

/**
 * Filings matching Role × Experience where hubPay (or salaryInr) > incumbent pay.
 * Ranked by median hub offer — answers "losing them to whom?"
 */
export function primaryTargetCompetitors(
  matched: Observation[],
  yourPay: number,
  hubId: HubId,
  limit = 15,
): PrimaryCompetitorRow[] {
  const above = matched.filter((o) => {
    const pay = o.hubPay?.[hubId] ?? o.salaryInr;
    return Number.isFinite(pay) && pay > yourPay && !!(o.employerName || o.employerGroup);
  });

  const grouped = groupBy(
    above,
    (o) => o.employerName || o.employerGroup || "Unknown employer",
  );

  const out: PrimaryCompetitorRow[] = [];
  for (const [key, list] of grouped) {
    const values = list
      .map((o) => o.hubPay?.[hubId] ?? o.salaryInr)
      .filter((v) => Number.isFinite(v));
    const med = median(values);
    if (med == null) continue;
    const p75 = quantile(values, 0.75);
    const maxPay = values.length ? Math.max(...values) : null;
    out.push({
      employerKey: key,
      employerLabel: list[0]?.employerName || list[0]?.employerGroup || key,
      n: list.length,
      medianPay: med,
      p75Pay: p75,
      maxPay,
      premiumVsYou: med - yourPay,
      premiumPct: yourPay ? ((med - yourPay) / yourPay) * 100 : 0,
      sampleRoles: [...new Set(list.map((o) => o.roleName).filter(Boolean))].slice(0, 3),
    });
  }

  return out.sort((a, b) => b.medianPay - a.medianPay).slice(0, limit);
}

/** @deprecated thin adapter for older competitor cards */
export function primaryAsCompetitorCompanies(rows: PrimaryCompetitorRow[]): CompetitorCompany[] {
  return rows.map((r) => ({
    employerKey: r.employerKey,
    employerLabel: r.employerLabel,
    n: r.n,
    medianPay: r.medianPay,
    sampleRoles: r.sampleRoles,
  }));
}

export function formatFullInrGap(n: number): string {
  return formatINR(Math.round(Math.abs(n)));
}
