import { useGapAnalysis, useApp } from "../state";
import { GapLadder } from "../components/GapLadder";
import { PayHistogram } from "../components/PayHistogram";
import { Card, EmptyState, SectionTitle, Stat } from "../components/ui";
import { formatCompactINR, formatINR } from "../lib/money";
import { groupSources } from "../lib/stats";

export function GapLab() {
  const analysis = useGapAnalysis();
  const { state } = useApp();

  if (!analysis) {
    return (
      <EmptyState
        title="Set an incumbent on Desk first"
        body="Gap Lab needs a matched market slice and a current pay amount."
      />
    );
  }

  const sources = groupSources(analysis.matched, analysis.metric).slice(0, 15);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Gap Lab"
        subtitle={`Where ${state.profile.label} sits against published observations — not an employee percentile table.`}
      />

      <div className="grid gap-4 md:grid-cols-5">
        {(
          [
            ["P10", analysis.band.p10],
            ["P25", analysis.band.p25],
            ["P50", analysis.band.p50],
            ["P75", analysis.band.p75],
            ["P90", analysis.band.p90],
          ] as const
        ).map(([k, v]) => (
          <Card key={k} className="p-4">
            <Stat label={k} value={formatCompactINR(v)} />
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h3 className="font-display text-2xl">Ladder</h3>
        <div className="mt-8 pb-8">
          <GapLadder analysis={analysis} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="font-display text-2xl">Observation distribution</h3>
          <p className="mt-1 text-xs text-mute">Histogram of matching source values. Copper bar includes your pay.</p>
          <div className="mt-4">
            <PayHistogram analysis={analysis} />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-display text-2xl">Under / over by source</h3>
          <p className="mt-1 text-xs text-mute">Your pay vs each source’s observation median.</p>
          <div className="mt-4 max-h-80 space-y-2 overflow-auto pr-1">
            {sources.map((s) => {
              const med = s.medianPublished;
              const delta = med != null ? analysis.yourPay - med : null;
              const pct = med && delta != null ? (delta / med) * 100 : null;
              return (
                <div
                  key={s.sourceName}
                  className="flex items-start justify-between gap-3 rounded-lg border border-ink/8 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink">{s.sourceName}</div>
                    <div className="text-[11px] text-mute">
                      n={s.n} · {s.sourceType || "source"}
                      {s.isEmployerFiling ? " · LCA filing" : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right tabular">
                    <div>{formatCompactINR(med)}</div>
                    <div
                      className={`text-[11px] ${
                        pct != null && pct < -8
                          ? "text-crimson"
                          : pct != null && pct > 8
                            ? "text-forest"
                            : "text-mute"
                      }`}
                    >
                      {pct != null
                        ? `${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% vs you`
                        : "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-display text-2xl">Gap math</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div>
            <dt className="eyebrow">vs P25</dt>
            <dd className="mt-1 tabular">{formatINR(analysis.gapVsP25)}</dd>
          </div>
          <div>
            <dt className="eyebrow">vs P50</dt>
            <dd className="mt-1 tabular">{formatINR(analysis.gapVsP50)}</dd>
          </div>
          <div>
            <dt className="eyebrow">vs P75</dt>
            <dd className="mt-1 tabular">{formatINR(analysis.gapVsP75)}</dd>
          </div>
          <div>
            <dt className="eyebrow">Obs. paying more</dt>
            <dd className="mt-1 tabular">
              {analysis.competitiveAbove} / {analysis.matched.length}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-mute">
          Values use {analysis.metric === "ppp" ? "PPP-corrected INR" : "nominal INR (FX)"}. Source
          medians use published midpoints when present, else observation set median.
        </p>
      </Card>
    </div>
  );
}
