import { useMemo } from "react";
import { useApp, useGapAnalysis } from "../state";
import { RiskMeter } from "../components/RiskMeter";
import { Card, EmptyState, RiskBadge, SectionTitle, Stat } from "../components/ui";
import { topSourcePulls } from "../lib/analysis";
import { formatCompactINR } from "../lib/money";

export function FlightRisk() {
  const { state, dispatch } = useApp();
  const analysis = useGapAnalysis();

  const pulls = useMemo(() => {
    if (!analysis) return [];
    return topSourcePulls(analysis.aboveYou, analysis.yourPay, analysis.metric, 8);
  }, [analysis]);

  if (!analysis) {
    return (
      <EmptyState
        title="No risk score yet"
        body="Configure the incumbent on Desk to compute flight risk."
      />
    );
  }

  const narrative =
    analysis.riskTier === "critical" || analysis.riskTier === "high"
      ? `Elevated leave pressure: published market often pays more. Prioritize remediation before competing offers land.`
      : analysis.riskTier === "watch"
        ? `Near-market but not insulated. Monitor peer moves and refresh if critical skills are scarce.`
        : analysis.riskTier === "premium"
          ? `Package sits in the upper band. Flight risk from pay alone is low; watch non-comp factors.`
          : `Pay is broadly competitive for this slice. Residual risk is role-market, not acute underpay.`;

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Flight Risk"
        subtitle="Directional aid: gap to market + share of observations above you. Not a resignation predictor."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-6">
          <div className="flex flex-wrap items-center gap-2">
            <RiskBadge tier={analysis.riskTier} score={analysis.riskScore} />
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
              label="Observations above your pay"
              value={`${analysis.competitiveAbove}`}
              hint={`${analysis.competitiveAbovePct.toFixed(0)}% of matched slice`}
              tone={analysis.competitiveAbovePct >= 55 ? "danger" : "default"}
            />
          </Card>
          <Card className="p-4">
            <Stat
              label="Cash to reach P50"
              value={
                analysis.gapVsP50 != null && analysis.gapVsP50 < 0
                  ? formatCompactINR(Math.abs(analysis.gapVsP50))
                  : "₹0"
              }
              hint="Annual remediation to market median"
              tone={analysis.gapVsP50 != null && analysis.gapVsP50 < 0 ? "warn" : "ok"}
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
              See pullers
            </button>
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <h3 className="font-display text-2xl">Hottest sources paying more</h3>
        <p className="mt-1 text-xs text-mute">
          Ranked by premium vs your package among observations above you.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-mute">
              <tr className="border-b border-ink/10">
                <th className="py-2 pr-3 font-medium">Source</th>
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium tabular">n</th>
                <th className="py-2 pr-3 font-medium tabular">Median</th>
                <th className="py-2 font-medium tabular">Premium</th>
              </tr>
            </thead>
            <tbody>
              {pulls.map((p) => (
                <tr key={p.sourceName} className="border-b border-ink/5">
                  <td className="py-2.5 pr-3">
                    <div className="font-medium text-ink">{p.sourceName}</div>
                    <div className="text-[11px] text-mute">{p.sampleRoles.join(" · ")}</div>
                  </td>
                  <td className="py-2.5 pr-3 text-mute">{p.sourceType || "—"}</td>
                  <td className="py-2.5 pr-3 tabular">{p.n}</td>
                  <td className="py-2.5 pr-3 tabular">{formatCompactINR(p.medianPay)}</td>
                  <td className="py-2.5 tabular text-crimson">
                    +{formatCompactINR(p.premiumVsYou)} ({p.premiumPct.toFixed(0)}%)
                  </td>
                </tr>
              ))}
              {!pulls.length ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-mute">
                    No observations pay more than this package in the current slice.
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
