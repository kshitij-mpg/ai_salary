import { useMemo } from "react";
import { useApp, useGapAnalysis } from "../state";
import { Card, EmptyState, SectionTitle } from "../components/ui";
import { topDestinations, topSourcePulls } from "../lib/analysis";
import { formatCompactINR } from "../lib/money";

export function PeerPull() {
  const { state } = useApp();
  const analysis = useGapAnalysis();

  const sources = useMemo(() => {
    if (!analysis) return [];
    return topSourcePulls(analysis.aboveYou, analysis.yourPay, analysis.metric, 15);
  }, [analysis]);

  const destinations = useMemo(() => {
    if (!analysis) return [];
    return topDestinations(analysis.aboveYou, analysis.yourPay, analysis.metric);
  }, [analysis]);

  if (!analysis) {
    return (
      <EmptyState
        title="No pull map yet"
        body="Desk needs an incumbent + matched market to list who pays more."
      />
    );
  }

  const cities = destinations.filter((d) => d.kind === "city");
  const countries = destinations.filter((d) => d.kind === "country");
  const industries = destinations.filter((d) => d.kind === "industry");

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Who could pull them?"
        subtitle={`Destinations and sources paying more than ${state.profile.label}. Company-specific rows (Levels, LCA) are signals — not confirmed open offers.`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="eyebrow">Above-market density</div>
          <div className="mt-2 font-display text-3xl tabular">
            {analysis.competitiveAbovePct.toFixed(0)}%
          </div>
          <p className="mt-1 text-xs text-mute">of matched observations pay more</p>
        </Card>
        <Card className="p-4">
          <div className="eyebrow">Pull sources</div>
          <div className="mt-2 font-display text-3xl tabular">{sources.length}</div>
          <p className="mt-1 text-xs text-mute">distinct sources above your pay</p>
        </Card>
        <Card className="p-4">
          <div className="eyebrow">Geo / industry pulls</div>
          <div className="mt-2 font-display text-3xl tabular">{destinations.length}</div>
          <p className="mt-1 text-xs text-mute">ranked destinations with n≥2</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display text-2xl">Cities paying more</h3>
          <PullList rows={cities} empty="No multi-obs city premiums above you." />
        </Card>
        <Card className="p-5">
          <h3 className="font-display text-2xl">Countries paying more</h3>
          <PullList rows={countries} empty="No multi-obs country premiums (or slice is single-country)." />
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-display text-2xl">Industry / employer-context signals</h3>
        <p className="mt-1 text-xs text-mute">
          From Industry field on observations (Big Tech, company-specific Levels, etc.).
        </p>
        <PullList rows={industries} empty="No industry clusters with n≥2 above your pay." />
      </Card>

      <Card className="p-5">
        <h3 className="font-display text-2xl">Source league — pays more than you</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-mute">
              <tr className="border-b border-ink/10">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">Roles seen</th>
                <th className="py-2 pr-3 tabular">Median</th>
                <th className="py-2 tabular">Premium vs you</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s, i) => (
                <tr key={s.sourceName} className="border-b border-ink/5">
                  <td className="py-2.5 pr-3 tabular text-mute">{i + 1}</td>
                  <td className="py-2.5 pr-3">
                    <div className="font-medium">{s.sourceName}</div>
                    <div className="text-[11px] text-mute">
                      {s.sourceType}
                      {s.isEmployerFiling ? " · employer filing" : ""}
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-mute">{s.sampleRoles.join(", ")}</td>
                  <td className="py-2.5 pr-3 tabular">{formatCompactINR(s.medianPay)}</td>
                  <td className="py-2.5 tabular text-crimson">
                    +{formatCompactINR(s.premiumVsYou)} · {s.premiumPct.toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PullList({
  rows,
  empty,
}: {
  rows: { key: string; label: string; n: number; medianPay: number; premiumVsYou: number; premiumPct: number }[];
  empty: string;
}) {
  if (!rows.length) return <p className="mt-4 text-sm text-mute">{empty}</p>;
  return (
    <ul className="mt-4 space-y-2">
      {rows.slice(0, 8).map((r) => (
        <li
          key={r.key}
          className="flex items-center justify-between gap-3 rounded-lg border border-ink/8 px-3 py-2 text-sm"
        >
          <div className="min-w-0">
            <div className="truncate font-medium">{r.label}</div>
            <div className="text-[11px] text-mute">n={r.n}</div>
          </div>
          <div className="shrink-0 text-right tabular">
            <div>{formatCompactINR(r.medianPay)}</div>
            <div className="text-[11px] text-crimson">+{r.premiumPct.toFixed(0)}%</div>
          </div>
        </li>
      ))}
    </ul>
  );
}
