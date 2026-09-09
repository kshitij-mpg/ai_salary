import { useMemo } from "react";
import { useApp, useGapAnalysis } from "../state";
import { Card, EmptyState, EvidenceCell, SectionTitle, Stat } from "../components/ui";
import { COMPETITOR_DISCLAIMER } from "../lib/constants";
import { hubOption } from "../lib/metros";
import { primaryTargetCompetitors } from "../lib/indiaExecutive";
import { formatCompactINR, formatINR } from "../lib/money";

export function PeerPull() {
  const { state } = useApp();
  const analysis = useGapAnalysis();
  const hub = hubOption(state.hub);

  const competitors = useMemo(() => {
    if (!analysis) return [];
    return primaryTargetCompetitors(
      analysis.matched,
      analysis.yourPay,
      state.hub,
      20,
    );
  }, [analysis, state.hub]);

  if (!analysis) {
    return (
      <EmptyState
        title="No pull map yet"
        body="Desk needs an incumbent + matched market to list who pays more in this hub."
      />
    );
  }

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Competitors · who pulls"
        subtitle={`Losing ${state.profile.label} to whom? Filings where ${hub.shortLabel} hub pay exceeds current package.`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <Stat
            label="Above-market density"
            value={`${analysis.competitiveAbovePct.toFixed(0)}%`}
            hint="of matched Evidence filings pay more"
          />
        </Card>
        <Card className="p-4">
          <Stat
            label="Primary competitors"
            value={String(competitors.length)}
            hint={`employers with ${hub.shortLabel} hub pay > yours`}
          />
        </Card>
        <Card className="p-4">
          <Stat
            label="Your package"
            value={formatCompactINR(analysis.yourPay)}
            hint={`${hub.shortLabel} median ${formatCompactINR(analysis.marketMedian)}`}
          />
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-display text-2xl">Primary Target Market Competitors</h3>
        <p className="mt-2 text-xs leading-relaxed text-mute">{COMPETITOR_DISCLAIMER}</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-mute">
              <tr className="border-b border-ink/10">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Employer</th>
                <th className="py-2 pr-3">Roles seen</th>
                <th className="py-2 pr-3">Evidence</th>
                <th className="py-2 pr-3 tabular">Median hub offer</th>
                <th className="py-2 pr-3 tabular">P75 hub offer</th>
                <th className="py-2 tabular">Premium vs you</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((e, i) => (
                <tr key={e.employerKey} className="border-b border-ink/5">
                  <td className="py-2.5 pr-3 tabular text-mute">{i + 1}</td>
                  <td className="py-2.5 pr-3 font-medium">{e.employerLabel}</td>
                  <td className="py-2.5 pr-3 text-mute">{e.sampleRoles.join(", ") || "—"}</td>
                  <td className="py-2.5 pr-3">
                    <EvidenceCell n={e.n} />
                  </td>
                  <td className="py-2.5 pr-3 tabular">{formatCompactINR(e.medianPay)}</td>
                  <td className="py-2.5 pr-3 tabular">
                    {e.p75Pay != null ? formatCompactINR(e.p75Pay) : "—"}
                  </td>
                  <td className="py-2.5 tabular text-crimson">
                    +{formatCompactINR(e.premiumVsYou)} · {e.premiumPct.toFixed(0)}%
                  </td>
                </tr>
              ))}
              {!competitors.length ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-mute">
                    No employers in the Evidence sample offer above your {hub.shortLabel}{" "}
                    package for this role × experience.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-[11px] text-mute">
          High percentiles (P75 / max) show where talent will leak if compensation is not remediated.
          Top offer in slice:{" "}
          {competitors[0]?.maxPay != null ? formatINR(competitors[0].maxPay) : "—"}.
        </p>
      </Card>
    </div>
  );
}
