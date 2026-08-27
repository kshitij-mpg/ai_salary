import { useMemo, useState } from "react";
import type { GapAnalysis } from "../types";
import {
  MARKET_POSITION_LABEL,
  modeMethodologyLabel,
  PAY_GAP_LABEL,
  RISK_UNSUPPORTED_MESSAGE,
  THREAT_LABEL,
} from "../lib/marketBenchmark";
import { formatCompactINR, formatINR } from "../lib/money";
import { Card } from "./ui";

const PROMPTS = [
  { id: "underpaid", label: "Is this employee underpaid?" },
  { id: "market_value", label: "What is their market value?" },
  { id: "hire", label: "Who would likely hire them?" },
  { id: "offer", label: "How much would competitors offer?" },
  { id: "adjust", label: "What adjustment is required?" },
] as const;

type PromptId = (typeof PROMPTS)[number]["id"];

function answerFor(id: PromptId, analysis: GapAnalysis, label: string): string {
  const gap = analysis.payGapPct;
  const mv = analysis.marketValue;
  const mode = analysis.metric === "nominal" ? "fx" : analysis.metric;
  switch (id) {
    case "underpaid":
      return [
        `${label} is classified as ${PAY_GAP_LABEL[analysis.payGapClass]}`,
        gap != null
          ? `(${gap >= 0 ? "+" : ""}${gap.toFixed(1)}% vs ${analysis.benchmarkLabel}).`
          : ".",
        `Market position: ${MARKET_POSITION_LABEL[analysis.marketPosition]}.`,
        modeMethodologyLabel(mode),
      ]
        .filter(Boolean)
        .join(" ");
    case "market_value":
      if (mode === "talent") {
        return [
          `Talent Market Value for ${label}: ${mv != null ? formatINR(mv) : "unavailable"}.`,
          `Built from Market Benchmark ${formatCompactINR(analysis.marketBenchmarkValue)}`,
          `× Role Demand × Scarcity.`,
          `Current pay: ${formatINR(analysis.yourPay)}.`,
        ].join(" ");
      }
      if (mode === "market") {
        return [
          `Market Benchmark Value for ${label}: ${mv != null ? formatINR(mv) : "unavailable"}.`,
          `Formula: P50 (${formatCompactINR(analysis.marketMedian)}) × Geographic Premium (${
            analysis.geographicPremiumIndex?.toFixed(3) ?? "1"
          }) × Compensation Competitiveness (${
            analysis.compensationCompetitivenessIndex?.toFixed(3) ?? "1"
          }).`,
          `Current pay: ${formatINR(analysis.yourPay)}.`,
        ].join(" ");
      }
      if (mode === "fx") {
        return [
          `FX View for ${label}: selected benchmark is current salary × FX = ${
            mv != null ? formatINR(mv) : "unavailable"
          }.`,
          `Pure currency conversion — no scarcity, demand, or competitiveness adjustments.`,
          `Current FX pay: ${formatINR(analysis.yourPay)} · Pay gap vs FX benchmark is 0% by definition.`,
        ].join(" ");
      }
      return [
        `PPP View for ${label}: purchasing-power equivalent ${
          mv != null ? formatINR(mv) : "unavailable"
        }.`,
        `USD × PPP_Conversion_Factor only — not a hiring market value.`,
        `Current FX pay (unchanged): ${formatINR(analysis.yourPay)}.`,
      ].join(" ");
    case "hire": {
      const names = analysis.topCompetitors.map((c) => c.employerLabel).slice(0, 5);
      return names.length
        ? `Top hiring companies in this slice (ranked by median offered base): ${names.join(", ")}.`
        : "No competitor employers matched in the current filing slice.";
    }
    case "offer":
      if (!analysis.offerRangeSupported) {
        return "Expected competitor offer range is available only in Talent Market View (P75–P90 adjusted by demand and scarcity). Switch to Talent to see it.";
      }
      return [
        `Market median (P50): ${formatCompactINR(analysis.marketMedian)}.`,
        `Expected external offer range (P75–P90 × demand × scarcity): ${formatCompactINR(analysis.expectedOfferLow)} – ${formatCompactINR(analysis.expectedOfferHigh)}.`,
        analysis.riskSupported
          ? `Competitive threat: ${THREAT_LABEL[analysis.competitiveThreatTier]} (${analysis.competitiveThreatScore}/100).`
          : RISK_UNSUPPORTED_MESSAGE,
      ].join(" ");
    case "adjust":
      if (!analysis.riskSupported && (mode === "fx" || mode === "ppp")) {
        return [
          analysis.recommendedAdjustment > 0
            ? `Cash delta to ${analysis.benchmarkLabel}: +${formatINR(analysis.recommendedAdjustment)}.`
            : `At or above ${analysis.benchmarkLabel}.`,
          RISK_UNSUPPORTED_MESSAGE,
        ].join(" ");
      }
      return analysis.recommendedAdjustment > 0
        ? `Recommended adjustment to reach ${analysis.benchmarkLabel}: +${formatINR(analysis.recommendedAdjustment)} annual base. Retention risk: ${analysis.riskTier} (${analysis.riskScore}/100).`
        : `No upward cash adjustment required to reach ${analysis.benchmarkLabel}. Current package is at or above the selected benchmark.`;
    default:
      return "";
  }
}

export function CopilotPanel({
  analysis,
  label,
}: {
  analysis: GapAnalysis;
  label: string;
}) {
  const [active, setActive] = useState<PromptId>("underpaid");
  const answer = useMemo(() => answerFor(active, analysis, label), [active, analysis, label]);
  const mode = analysis.metric === "nominal" ? "fx" : analysis.metric;

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-2xl">Market Copilot</h3>
        <span className="text-[10px] uppercase tracking-[0.16em] text-mute">
          {analysis.benchmarkLabel} Q&amp;A
        </span>
      </div>
      <p className="mt-1 text-xs text-mute">{modeMethodologyLabel(mode)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`rounded-md px-2.5 py-1.5 text-xs transition ${
              active === p.id
                ? "bg-ink text-paper"
                : "bg-ink-100 text-mute hover:bg-ink-200 hover:text-ink"
            }`}
            onClick={() => setActive(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-ink/90">{answer}</p>
    </Card>
  );
}
