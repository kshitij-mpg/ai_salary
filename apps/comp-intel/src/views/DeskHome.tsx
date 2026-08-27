import { useApp, useGapAnalysis, useMarketMatch } from "../state";
import { ProfileForm } from "../components/ProfileForm";
import { GapLadder } from "../components/GapLadder";
import { RiskMeter } from "../components/RiskMeter";
import { CopilotPanel } from "../components/CopilotPanel";
import {
  Card,
  EmptyState,
  MarketPositionBadge,
  PayGapBadge,
  RiskBadge,
  SectionTitle,
  Stat,
  ThreatBadge,
} from "../components/ui";
import { formatCompactINR, formatCount, formatINR } from "../lib/money";
import { briefingText } from "../lib/export";
import { BENCHMARK_MODE_OPTIONS, OBSERVATION_DISCLAIMER } from "../lib/constants";
import {
  modeBenchmarkLabel,
  modeMethodologyLabel,
  RISK_UNSUPPORTED_MESSAGE,
} from "../lib/marketBenchmark";

export function DeskHome() {
  const { state, dispatch } = useApp();
  const analysis = useGapAnalysis();
  const { relaxNotes, bandRelaxNotes } = useMarketMatch();
  const mode = state.metric === "nominal" ? "fx" : state.metric;
  const modeOpt = BENCHMARK_MODE_OPTIONS.find((o) => o.id === mode);
  const modeTitle =
    mode === "talent"
      ? "Talent Market View · default"
      : mode === "market"
        ? "Market Benchmark View"
        : mode === "fx"
          ? "FX View"
          : "PPP View";

  return (
    <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
      <aside className="space-y-4">
        <Card className="p-5">
          <SectionTitle
            title="Incumbent"
            subtitle="Set current compensation, then match role · experience · location to Market Bands."
          />
          <ProfileForm compact />
        </Card>
        <p className="px-1 text-[11px] leading-relaxed text-mute">{OBSERVATION_DISCLAIMER}</p>
      </aside>

      <div className="space-y-6">
        <header className="rise">
          <p className="eyebrow">{modeTitle}</p>
          <h1 className="font-display mt-2 max-w-3xl text-4xl leading-[1.1] text-ink md:text-5xl">
            What is this talent worth in the market?
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-mute leading-relaxed">
            {modeOpt?.explanation ?? "Mode-specific benchmark"}. Assessing{" "}
            <span className="text-ink font-medium">{state.profile.label}</span>.
          </p>
          <p className="mt-2 text-[11px] text-mute">{modeMethodologyLabel(mode)}</p>
        </header>

        {!analysis ? (
          <EmptyState
            title="No market slice yet"
            body="Adjust country, role family, experience, or pay type. Thin slices auto-relax city / title."
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="p-4 rise rise-d1">
                <Stat
                  label="Current salary"
                  value={formatCompactINR(analysis.yourPay)}
                  hint="Cash FX · fixed across modes"
                />
              </Card>
              <Card className="p-4 rise rise-d2">
                <Stat
                  label="Market median (P50)"
                  value={formatCompactINR(analysis.marketMedian)}
                  hint={
                    analysis.bandGeographyLevel
                      ? `${analysis.bandGeographyLevel} band · n=${analysis.band.n.toLocaleString()}`
                      : `${formatCount(analysis.band.n)} filings · computed band`
                  }
                />
              </Card>
              <Card className="p-4 rise rise-d3">
                <Stat
                  label={analysis.benchmarkLabel}
                  value={formatCompactINR(analysis.marketValue)}
                  hint={
                    mode === "talent"
                      ? "Market Benchmark × Demand × Scarcity"
                      : mode === "market"
                        ? `P50 × Geo ${analysis.geographicPremiumIndex?.toFixed(2) ?? "1"} × CCI ${analysis.compensationCompetitivenessIndex?.toFixed(2) ?? "1"}`
                        : mode === "fx"
                          ? "Current USD × FX_USD_INR (no market adjustments)"
                          : "Current USD × PPP_Conversion_Factor"
                  }
                />
              </Card>
              <Card className="p-4 rise rise-d4">
                <Stat
                  label="Pay Gap %"
                  value={
                    analysis.payGapPct != null
                      ? `${analysis.payGapPct >= 0 ? "+" : ""}${analysis.payGapPct.toFixed(1)}%`
                      : "—"
                  }
                  hint={`(Current − ${modeBenchmarkLabel(mode)}) / benchmark`}
                  tone={
                    analysis.payGapPct != null && analysis.payGapPct < -10
                      ? "danger"
                      : analysis.payGapPct != null && analysis.payGapPct > 10
                        ? "ok"
                        : "default"
                  }
                />
              </Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="p-4">
                <div className="eyebrow">Market position</div>
                <div className="mt-2">
                  <MarketPositionBadge position={analysis.marketPosition} />
                </div>
              </Card>
              <Card className="p-4">
                <div className="eyebrow">Pay gap class</div>
                <div className="mt-2">
                  <PayGapBadge gapClass={analysis.payGapClass} />
                </div>
              </Card>
              <Card className="p-4">
                <div className="eyebrow">Retention risk</div>
                <div className="mt-2">
                  {analysis.riskSupported ? (
                    <RiskBadge tier={analysis.riskTier} score={analysis.riskScore} />
                  ) : (
                    <p className="text-xs leading-relaxed text-mute">{RISK_UNSUPPORTED_MESSAGE}</p>
                  )}
                </div>
              </Card>
              <Card className="p-4">
                <div className="eyebrow">Competitive threat</div>
                <div className="mt-2">
                  {analysis.riskSupported ? (
                    <ThreatBadge
                      tier={analysis.competitiveThreatTier}
                      score={analysis.competitiveThreatScore}
                    />
                  ) : (
                    <p className="text-xs leading-relaxed text-mute">Not available in FX/PPP mode.</p>
                  )}
                </div>
              </Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Card className="p-4">
                <Stat
                  label="Expected offer range"
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
              <Card className="p-4">
                <Stat
                  label="Recommended adjustment"
                  value={
                    analysis.recommendedAdjustment > 0
                      ? `+${formatCompactINR(analysis.recommendedAdjustment)}`
                      : "₹0"
                  }
                  hint={`Cash to reach ${analysis.benchmarkLabel}`}
                  tone={analysis.recommendedAdjustment > 0 ? "warn" : "ok"}
                />
              </Card>
              <Card className="p-4">
                <Stat
                  label="Correction budget (this role)"
                  value={formatCompactINR(analysis.recommendedAdjustment)}
                  hint="Annual base remediation exposure"
                />
              </Card>
            </div>

            {relaxNotes.length || bandRelaxNotes.length ? (
              <Card className="border-amber/30 bg-amber/5 p-3 text-xs text-ink/80">
                Match notes: {[...bandRelaxNotes, ...relaxNotes].join(" ")}
                {analysis.compensationDefinition ? (
                  <span className="mt-1 block text-mute">
                    {analysis.compensationDefinition} — offered base wage, not total compensation.
                  </span>
                ) : null}
              </Card>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-5">
                <h3 className="font-display text-2xl">Market position ladder</h3>
                <p className="mt-1 text-xs text-mute">
                  Current vs P25 / P50 / P75 / P90. Marker also shows {analysis.benchmarkLabel} when
                  available.
                </p>
                <div className="mt-6">
                  <GapLadder analysis={analysis} />
                </div>
              </Card>
              <Card className="p-5">
                <RiskMeter analysis={analysis} />
              </Card>
            </div>

            <Card className="p-5">
              <h3 className="font-display text-2xl">Employee market detail</h3>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                <Detail k="Current salary" v={formatINR(analysis.yourPay)} />
                <Detail k="Market median (P50)" v={formatINR(analysis.marketMedian)} />
                <Detail k="P25" v={formatCompactINR(analysis.band.p25)} />
                <Detail k="P75" v={formatCompactINR(analysis.band.p75)} />
                <Detail k="P90" v={formatCompactINR(analysis.band.p90)} />
                <Detail k={analysis.benchmarkLabel} v={formatINR(analysis.marketValue)} />
                {mode === "talent" ? (
                  <Detail
                    k="Market Benchmark (ref)"
                    v={formatINR(analysis.marketBenchmarkValue)}
                  />
                ) : null}
                <Detail
                  k="Role demand"
                  v={
                    analysis.roleDemandIndex != null
                      ? analysis.roleDemandIndex.toFixed(3)
                      : "—"
                  }
                />
                <Detail k="Talent scarcity" v={analysis.talentScarcityIndicator ?? "—"} />
                <Detail
                  k="Comp. competitiveness"
                  v={
                    analysis.compensationCompetitivenessIndex != null
                      ? analysis.compensationCompetitivenessIndex.toFixed(3)
                      : "—"
                  }
                />
                <Detail
                  k="Geographic premium"
                  v={
                    analysis.geographicPremiumIndex != null
                      ? analysis.geographicPremiumIndex.toFixed(3)
                      : "—"
                  }
                />
              </dl>

              <h4 className="mt-6 font-display text-xl">Top competitors</h4>
              <ul className="mt-2 space-y-1 text-sm">
                {analysis.topCompetitors.length ? (
                  analysis.topCompetitors.map((c) => (
                    <li
                      key={c.employerKey}
                      className="flex justify-between gap-3 border-b border-ink/5 py-1.5"
                    >
                      <span>
                        {c.employerLabel}
                        <span className="text-mute"> · n={c.n}</span>
                      </span>
                      <span className="tabular">{formatCompactINR(c.medianPay)}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-mute">No employer groups in matched filings.</li>
                )}
              </ul>
            </Card>

            <CopilotPanel analysis={analysis} label={state.profile.label} />

            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm text-mute">
                Full amount: <span className="tabular text-ink">{formatINR(analysis.yourPay)}</span>
                {" · "}
                {analysis.benchmarkLabel}:{" "}
                <span className="tabular text-ink">{formatINR(analysis.marketValue)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => dispatch({ type: "view", view: "flight" })}
                >
                  Open retention risk
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => dispatch({ type: "view", view: "peers" })}
                >
                  Who would hire them
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    const text = briefingText(analysis, state.profile.label);
                    void navigator.clipboard?.writeText(text);
                  }}
                >
                  Copy brief
                </button>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function Detail({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-ink/5 py-1.5">
      <dt className="text-mute">{k}</dt>
      <dd className="text-right tabular text-ink">{v}</dd>
    </div>
  );
}
