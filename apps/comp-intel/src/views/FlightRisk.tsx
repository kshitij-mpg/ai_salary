import { useMemo } from "react";

import { useApp, useGapAnalysis } from "../state";
import { RiskMeter } from "../components/RiskMeter";
import {
  Card,
  EmptyState,
  RiskBadge,
  SectionTitle,
  Stat,
  ThreatBadge,
} from "../components/ui";
import { RISK_UNSUPPORTED_MESSAGE, topCompetitorCompanies } from "../lib/marketBenchmark";
import { formatCompactINR } from "../lib/money";

export function FlightRisk() {
  const { state, dispatch } = useApp();
  const analysis = useGapAnalysis();

  const competitors = useMemo(() => {
    if (!analysis) return [];
    return analysis.topCompetitors.length
      ? analysis.topCompetitors
      : topCompetitorCompanies(analysis.matched, analysis.metric, 5);
  }, [analysis]);

  if (!analysis) {
    return (
      <EmptyState
        title="No retention score yet"
        body="Configure the incumbent on Desk to compute retention risk."
      />
    );
  }

  const narrative = !analysis.riskSupported
    ? RISK_UNSUPPORTED_MESSAGE
    : analysis.riskTier === "critical" || analysis.riskTier === "high"
      ? `Elevated retention risk: pay gap and talent pressure suggest competitors can win this person.`
      : analysis.riskTier === "watch"
        ? `Moderate risk. Monitor competitor offers (P75–P90) and scarce-skill demand.`
        : analysis.riskTier === "premium"
          ? `Package sits above market pressure. Retention risk from pay alone is low.`
          : `Pay is broadly competitive vs ${analysis.benchmarkLabel}. Residual risk is role-market, not acute underpay.`;

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Retention risk"
        subtitle={
          analysis.riskSupported
            ? "Score = 40% pay gap + 30% talent scarcity + 20% role demand + 10% compensation competitiveness. Drivers listed below."
            : RISK_UNSUPPORTED_MESSAGE
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            {analysis.riskSupported ? (
              <>
                <RiskBadge tier={analysis.riskTier} score={analysis.riskScore} />
                <ThreatBadge
                  tier={analysis.competitiveThreatTier}
                  score={analysis.competitiveThreatScore}
                />
              </>
            ) : (
              <span className="rounded-md bg-ink/10 px-2 py-1 text-xs text-mute">
                Risk disabled · FX/PPP
              </span>
            )}
            <span className="text-xs text-mute">{state.profile.label}</span>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/85">{narrative}</p>
          <div className="mt-6">
            <RiskMeter analysis={analysis} />
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <Stat
              label={`Pay gap vs ${analysis.benchmarkLabel}`}
              value={
                analysis.payGapPct != null
                  ? `${analysis.payGapPct >= 0 ? "+" : ""}${analysis.payGapPct.toFixed(1)}%`
                  : "—"
              }
              hint="Primary retention driver (40% weight) when risk is enabled"
              tone={
                analysis.payGapPct != null && analysis.payGapPct < -10 ? "danger" : "default"
              }
            />
          </Card>
          <Card className="p-4">
            <Stat
              label={`Cash to reach ${analysis.benchmarkLabel}`}
              value={
                analysis.recommendedAdjustment > 0
                  ? formatCompactINR(analysis.recommendedAdjustment)
                  : "₹0"
              }
              hint="Annual remediation"
              tone={analysis.recommendedAdjustment > 0 ? "warn" : "ok"}
            />
          </Card>
          <Card className="p-4">
            <Stat
              label="Expected competitor offer"
              value={
                analysis.offerRangeSupported
                  ? `${formatCompactINR(analysis.expectedOfferLow)} – ${formatCompactINR(analysis.expectedOfferHigh)}`
                  : "—"
              }
              hint={
                analysis.offerRangeSupported
                  ? "P75–P90 × demand × scarcity (Talent only)"
                  : "Available only in Talent Market View"
              }
            />
          </Card>
          <Card className="flex gap-2 p-4">
            <button
              type="button"
              className="btn-primary flex-1"
              onClick={() => dispatch({ type: "view", view: "scenarios" })}
            >
              Model a raise
            </button>
            <button
              type="button"
              className="btn-secondary flex-1"
              onClick={() => dispatch({ type: "view", view: "peers" })}
            >
              See competitors
            </button>
          </Card>
        </div>
      </div>

      {analysis.riskSupported ? (
        <Card className="p-5">
          <h3 className="font-display text-2xl">Threat drivers</h3>
          <ul className="mt-3 space-y-2">
            {analysis.competitiveThreatReasons.map((r, i) => (
              <li key={i} className="flex gap-2 text-sm text-ink/80">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-crimson" />
                {r}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="p-5">
        <h3 className="font-display text-2xl">Top competitor companies</h3>
        <p className="mt-1 text-xs text-mute">
          Same role family / experience / geography from CLEANED filings, ranked by median salary.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-mute">
              <tr className="border-b border-ink/10">
                <th className="py-2 pr-3 font-medium">Employer</th>
                <th className="py-2 pr-3 font-medium">Roles</th>
                <th className="py-2 pr-3 font-medium tabular">Filings</th>
                <th className="py-2 font-medium tabular">Median offer</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((p) => (
                <tr key={p.employerKey} className="border-b border-ink/5">
                  <td className="py-2.5 pr-3 font-medium text-ink">{p.employerLabel}</td>
                  <td className="py-2.5 pr-3 text-mute">{p.sampleRoles.join(" · ")}</td>
                  <td className="py-2.5 pr-3 tabular">{p.n}</td>
                  <td className="py-2.5 tabular">{formatCompactINR(p.medianPay)}</td>
                </tr>
              ))}
              {!competitors.length ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-mute">
                    No competitor employers in the current slice.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
