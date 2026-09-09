import { useApp, useGapAnalysis, useMarketMatch } from "../state";
import { ProfileForm } from "../components/ProfileForm";
import { GapLadder } from "../components/GapLadder";
import { RiskMeter } from "../components/RiskMeter";
import { CopilotPanel } from "../components/CopilotPanel";
import {
  Card,
  CompetitorEvidenceCard,
  EmptyState,
  MarketPositionBadge,
  PayGapBadge,
  RiskBadge,
  SectionTitle,
  Stat,
  ThreatBadge,
} from "../components/ui";
import { formatCompactINR, formatINR } from "../lib/money";
import { briefingText } from "../lib/export";
import { OBSERVATION_DISCLAIMER, STRATEGIC_TARGET_OPTIONS } from "../lib/constants";
import { hubOption } from "../lib/metros";
import {
  alignmentSummary,
  FLIGHT_RISK_LABEL,
  formatGapPhrase,
  scoreFlightRisk,
} from "../lib/indiaExecutive";
import {
  geographicPremiumInsight,
  roleCompensationPremiumInsight,
  roleDemandInsight,
} from "../lib/marketBenchmark";
import {
  CONFIDENCE_LABEL,
  confidenceFromSampleSize,
  evidenceBasedOnLabel,
} from "../lib/evidenceConfidence";

export function DeskHome() {
  const { state, dispatch } = useApp();
  const analysis = useGapAnalysis();
  const { relaxNotes, bandRelaxNotes } = useMarketMatch();
  const hub = hubOption(state.hub);
  const targetOpt =
    STRATEGIC_TARGET_OPTIONS.find((o) => o.id === state.targetPercentile) ??
    STRATEGIC_TARGET_OPTIONS[1]!;

  const align = analysis
    ? alignmentSummary({
        yourPay: analysis.yourPay,
        marketTarget: analysis.marketValue,
        hubId: state.hub,
        targetLabel: targetOpt.title,
      })
    : null;

  const flight = analysis
    ? scoreFlightRisk({
        payGapPct: analysis.payGapPct,
        record: analysis.matchedBandRecord,
        roleFamily: state.profile.roleFamily,
      })
    : null;

  const geoInsight = analysis
    ? geographicPremiumInsight(
        analysis.geographicPremiumIndex,
        hub.shortLabel,
        "the Bengaluru baseline",
      )
    : null;
  const cciInsight = analysis
    ? roleCompensationPremiumInsight(
        analysis.compensationCompetitivenessIndex,
        state.profile.roleFamily,
      )
    : null;
  const demandInsight = analysis ? roleDemandInsight(analysis.roleDemandIndex) : null;

  const alignToneClass =
    align?.tone === "underpaid_critical"
      ? "border-crimson/40 bg-crimson/8 text-crimson"
      : align?.tone === "underpaid_warn"
        ? "border-crimson/25 bg-crimson/5 text-ink"
        : align?.tone === "overpaid"
          ? "border-forest/30 bg-forest/8 text-ink"
          : "border-ink/10 bg-ink-50/80 text-ink";

  return (
    <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
      <aside className="space-y-4">
        <Card className="p-5">
          <SectionTitle
            title="Incumbent"
            subtitle="Set current INR compensation, then match role · experience to India Multi-Metro bands."
          />
          <ProfileForm compact />
        </Card>
        <p className="px-1 text-[11px] leading-relaxed text-mute">{OBSERVATION_DISCLAIMER}</p>
      </aside>

      <div className="space-y-6">
        <header className="rise">
          <p className="eyebrow">
            Desk · {hub.shortLabel} · {targetOpt.title}
          </p>
          <h1 className="font-display mt-2 max-w-3xl text-4xl leading-[1.1] text-ink md:text-5xl">
            If we pay this candidate X — how misaligned are they?
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-mute leading-relaxed">
            Comparing{" "}
            <span className="text-ink font-medium">{state.profile.label}</span> against the{" "}
            <span className="text-ink font-medium">{hub.label}</span>{" "}
            <span className="text-ink font-medium">{targetOpt.shortLabel}</span> strategic target.
          </p>
        </header>

        {!analysis || !align ? (
          <EmptyState
            title="No market slice yet"
            body="Adjust role family, role name, or experience band. Thin slices auto-relax filters."
          />
        ) : (
          <>
            <Card className={`border p-5 rise ${alignToneClass}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">
                Immediate alignment & gap audit · {hub.shortLabel} · {targetOpt.shortLabel}
              </p>
              <p className="mt-3 font-display text-2xl leading-snug md:text-3xl">
                Candidate is{" "}
                <strong>{align.status === "Aligned" ? "Aligned" : align.status}</strong>
                {align.status !== "Aligned" && align.gapInr != null ? (
                  <>
                    {" "}
                    by <strong>{formatINR(Math.abs(align.gapInr))}</strong> (
                    <strong>{Math.abs(align.gapPct ?? 0).toFixed(0)}%</strong>) against the local{" "}
                    <strong>{hub.shortLabel}</strong> market target.
                  </>
                ) : (
                  <>
                    {" "}
                    against the local <strong>{hub.shortLabel}</strong> market target.
                  </>
                )}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-md bg-paper/70 px-2.5 py-1 tabular">
                  Paying {formatCompactINR(analysis.yourPay)}
                </span>
                <span className="rounded-md bg-paper/70 px-2.5 py-1 tabular">
                  {hub.shortLabel} {targetOpt.shortLabel}{" "}
                  {formatCompactINR(analysis.marketValue)}
                </span>
                <span className="rounded-md bg-paper/70 px-2.5 py-1 tabular">
                  {formatGapPhrase(align.gapInr)}
                </span>
                {flight ? (
                  <span className="rounded-md bg-paper/70 px-2.5 py-1">
                    {FLIGHT_RISK_LABEL[flight.level]}
                  </span>
                ) : null}
              </div>
              {align.tone === "underpaid_critical" ? (
                <p className="mt-3 text-sm font-medium">
                  Underpayment exceeds 15% — remediation recommended before competitor pull
                  intensifies.
                </p>
              ) : null}
            </Card>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="p-4 rise rise-d1">
                <Stat
                  label="Current salary"
                  value={formatCompactINR(analysis.yourPay)}
                  hint="Incumbent annual INR · fixed across hubs"
                />
              </Card>
              <Card className="p-4 rise rise-d2">
                <Stat
                  label={`${hub.shortLabel} ${targetOpt.shortLabel} target`}
                  value={formatCompactINR(analysis.marketValue)}
                  hint={`metros.${state.hub}.${state.targetPercentile} · ${evidenceBasedOnLabel(analysis.band.n)} · ${CONFIDENCE_LABEL[confidenceFromSampleSize(analysis.band.n)]}`}
                />
              </Card>
              <Card className="p-4 rise rise-d3">
                <Stat
                  label={`Pay gap vs ${targetOpt.shortLabel}`}
                  value={
                    analysis.payGapPct != null
                      ? `${analysis.payGapPct >= 0 ? "+" : ""}${analysis.payGapPct.toFixed(1)}%`
                      : "—"
                  }
                  hint="(Incumbent − strategic target) / target"
                  tone={
                    analysis.payGapPct != null && analysis.payGapPct < -15
                      ? "danger"
                      : analysis.payGapPct != null && analysis.payGapPct < -10
                        ? "warn"
                        : analysis.payGapPct != null && analysis.payGapPct > 10
                          ? "ok"
                          : "default"
                  }
                />
              </Card>
              <Card className="p-4 rise rise-d4">
                <Stat
                  label={`Cash to close ${targetOpt.shortLabel}`}
                  value={
                    analysis.recommendedAdjustment > 0
                      ? formatCompactINR(analysis.recommendedAdjustment)
                      : "₹0"
                  }
                  tone={analysis.recommendedAdjustment > 0 ? "warn" : "ok"}
                />
              </Card>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Card className="p-4">
                <Stat label={`${hub.shortLabel} P25`} value={formatCompactINR(analysis.band.p25)} />
              </Card>
              <Card className="p-4">
                <Stat label={`${hub.shortLabel} P50`} value={formatCompactINR(analysis.band.p50)} />
              </Card>
              <Card className="p-4">
                <Stat label={`${hub.shortLabel} P75`} value={formatCompactINR(analysis.band.p75)} />
              </Card>
              <Card className="p-4">
                <Stat
                  label="Offer range (P75–P90)"
                  value={`${formatCompactINR(analysis.expectedOfferLow)} – ${formatCompactINR(analysis.expectedOfferHigh)}`}
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
                <div className="eyebrow">Flight risk</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <RiskBadge tier={analysis.riskTier} score={analysis.riskScore} />
                  <ThreatBadge
                    tier={analysis.competitiveThreatTier}
                    score={analysis.competitiveThreatScore}
                  />
                </div>
              </Card>
              <Card className="p-4">
                <Stat
                  label="Filings above pay"
                  value={`${analysis.competitiveAbovePct.toFixed(0)}%`}
                  hint={`${analysis.competitiveAbove} of ${analysis.matched.length} in Evidence sample`}
                />
              </Card>
            </div>

            {geoInsight || cciInsight || demandInsight || analysis.talentScarcityIndicator ? (
              <Card className="p-4 text-sm leading-relaxed text-ink/85">
                <div className="eyebrow mb-2">Market intelligence</div>
                {demandInsight ? (
                  <p className="mb-1">
                    <strong>Role demand:</strong> {demandInsight}
                  </p>
                ) : null}
                {analysis.talentScarcityIndicator ? (
                  <p className="mb-1">
                    <strong>Talent scarcity:</strong> {analysis.talentScarcityIndicator}
                  </p>
                ) : null}
                {geoInsight ? (
                  <p className="mb-1">
                    <strong>Hub index:</strong> {geoInsight}
                  </p>
                ) : null}
                {cciInsight ? (
                  <p>
                    <strong>Role compensation premium:</strong> {cciInsight}
                  </p>
                ) : null}
              </Card>
            ) : null}

            {relaxNotes.length || bandRelaxNotes.length ? (
              <Card className="border-amber/30 bg-amber/5 p-3 text-xs text-ink/80">
                Match notes: {[...bandRelaxNotes, ...relaxNotes].join(" ")}
              </Card>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-5">
                <h3 className="font-display text-2xl">Market position ladder</h3>
                <p className="mt-1 text-xs text-mute">
                  Current vs {hub.shortLabel} P25 / P50 / P75.
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
              <h3 className="font-display text-2xl">Employee market profile</h3>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <Detail k="Current salary" v={formatINR(analysis.yourPay)} />
                <Detail k={`${hub.shortLabel} P50`} v={formatCompactINR(analysis.band.p50)} />
                <Detail k={`${hub.shortLabel} P25`} v={formatCompactINR(analysis.band.p25)} />
                <Detail k={`${hub.shortLabel} P75`} v={formatCompactINR(analysis.band.p75)} />
                <Detail k="Gap phrase" v={formatGapPhrase(align.gapInr)} />
                <Detail
                  k="Flight risk"
                  v={flight ? `${FLIGHT_RISK_LABEL[flight.level]} (${flight.score})` : "—"}
                />
              </dl>

              <h4 className="mt-6 font-display text-xl">Top competitors (preview)</h4>
              <ul className="mt-3 space-y-2">
                {analysis.topCompetitors.length ? (
                  analysis.topCompetitors.map((c) => (
                    <CompetitorEvidenceCard
                      key={c.employerKey}
                      employerLabel={c.employerLabel}
                      estimatedOffer={c.medianPay}
                      n={c.n}
                      evidence={{
                        roleFamily: state.profile.roleFamily || undefined,
                        experience: state.profile.experienceLevel || undefined,
                        geography: hub.shortLabel,
                        sampleRoles: c.sampleRoles,
                      }}
                    />
                  ))
                ) : (
                  <li className="text-sm text-mute">No employer groups above pay in this slice.</li>
                )}
              </ul>
            </Card>

            <CopilotPanel analysis={analysis} label={state.profile.label} />

            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm text-mute">
                Full amount: <span className="tabular text-ink">{formatINR(analysis.yourPay)}</span>
                {" · "}
                {hub.shortLabel} median:{" "}
                <span className="tabular text-ink">{formatINR(analysis.marketMedian)}</span>
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
