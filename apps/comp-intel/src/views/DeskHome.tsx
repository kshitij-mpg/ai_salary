import { useApp, useGapAnalysis, useMarketMatch } from "../state";
import { ProfileForm } from "../components/ProfileForm";
import { GapLadder } from "../components/GapLadder";
import { RiskMeter } from "../components/RiskMeter";
import { Card, EmptyState, RiskBadge, SectionTitle, Stat, VerdictBadge } from "../components/ui";
import { formatCompactINR, formatCount, formatINR } from "../lib/money";
import { briefingText } from "../lib/export";
import { OBSERVATION_DISCLAIMER } from "../lib/constants";

export function DeskHome() {
  const { state, dispatch } = useApp();
  const analysis = useGapAnalysis();
  const { relaxNotes } = useMarketMatch();

  return (
    <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
      <aside className="space-y-4">
        <Card className="p-5">
          <SectionTitle
            title="Incumbent"
            subtitle="Set offered pay first (large control below), then refine market filters."
          />
          <ProfileForm compact />
        </Card>
        <p className="px-1 text-[11px] leading-relaxed text-mute">{OBSERVATION_DISCLAIMER}</p>
      </aside>

      <div className="space-y-6">
        <header className="rise">
          <p className="eyebrow">Business question</p>
          <h1 className="font-display mt-2 max-w-3xl text-4xl leading-[1.1] text-ink md:text-5xl">
            Are we underpaying — and will the market take them?
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-mute leading-relaxed">
            Instant gap vs published market bands for{" "}
            <span className="text-ink font-medium">{state.profile.label}</span>. Jump to Flight Risk
            for leave pressure, Who Pulls for destinations, Scenarios for remediation cost.
          </p>
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
                  label="Your pay"
                  value={formatCompactINR(analysis.yourPay)}
                  hint={analysis.sliceLabel}
                />
              </Card>
              <Card className="p-4 rise rise-d2">
                <Stat
                  label="Market P50"
                  value={formatCompactINR(analysis.band.p50)}
                  hint={`${formatCount(analysis.band.n)} obs · ${analysis.band.sourceCount} sources`}
                />
              </Card>
              <Card className="p-4 rise rise-d3">
                <Stat
                  label="Gap vs P50"
                  value={
                    analysis.gapVsP50 != null
                      ? `${analysis.gapVsP50 >= 0 ? "+" : "−"}${formatCompactINR(Math.abs(analysis.gapVsP50))}`
                      : "—"
                  }
                  hint={
                    analysis.gapVsP50Pct != null
                      ? `${analysis.gapVsP50Pct >= 0 ? "+" : ""}${analysis.gapVsP50Pct.toFixed(1)}%`
                      : undefined
                  }
                  tone={
                    analysis.verdict === "underpaid"
                      ? "danger"
                      : analysis.verdict === "overpaid"
                        ? "ok"
                        : "default"
                  }
                />
              </Card>
              <Card className="p-4 rise rise-d4">
                <div className="eyebrow">Verdict</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <VerdictBadge verdict={analysis.verdict} />
                  <RiskBadge tier={analysis.riskTier} score={analysis.riskScore} />
                </div>
                {analysis.band.directional ? (
                  <p className="mt-3 text-xs text-amber">Directional only — n &lt; 30</p>
                ) : null}
              </Card>
            </div>

            {relaxNotes.length ? (
              <Card className="border-amber/30 bg-amber/5 p-3 text-xs text-ink/80">
                Match notes: {relaxNotes.join(" ")}
              </Card>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-5">
                <h3 className="font-display text-2xl">Market position</h3>
                <div className="mt-6">
                  <GapLadder analysis={analysis} />
                </div>
              </Card>
              <Card className="p-5">
                <RiskMeter analysis={analysis} />
              </Card>
            </div>

            <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="text-sm text-mute">
                Full amount: <span className="tabular text-ink">{formatINR(analysis.yourPay)}</span>
                {" · "}
                P25–P75:{" "}
                <span className="tabular text-ink">
                  {formatCompactINR(analysis.band.p25)} – {formatCompactINR(analysis.band.p75)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => dispatch({ type: "view", view: "flight" })}
                >
                  Open flight risk
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => dispatch({ type: "view", view: "peers" })}
                >
                  Who could pull them
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
