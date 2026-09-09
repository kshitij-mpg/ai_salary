import { useMemo } from "react";
import { useApp } from "../state";
import type { PortfolioPerson } from "../types";
import {
  Card,
  EmptyState,
  MarketPositionBadge,
  RiskBadge,
  SectionTitle,
  Stat,
} from "../components/ui";
import { analyzeGap, incumbentMetricPay, sliceLabelFromProfile, toAnnualInr } from "../lib/analysis";
import { matchMarket, matchMarketBand } from "../lib/filters";
import { portfolioMarketKpis } from "../lib/marketBenchmark";
import { downloadCsv, portfolioRiskCsv } from "../lib/export";
import { formatCompactINR } from "../lib/money";

function uid() {
  return `p_${Math.random().toString(36).slice(2, 10)}`;
}

export function PortfolioView() {
  const { state, dispatch } = useApp();

  const rows = useMemo(() => {
    if (!state.data) return [];
    return state.portfolio.map((person) => {
      const { matched } = matchMarket(state.data!.observations, person);
      const { band: matchedBand } = matchMarketBand(state.data!.marketBands, person);
      const yourPay = incumbentMetricPay(person, "market");
      const analysis =
        (matched.length || matchedBand) && yourPay
          ? analyzeGap(matched, yourPay, "market", sliceLabelFromProfile(person), {
              matchedBandRecord: matchedBand,
              hubId: state.hub,
              targetPercentile: state.targetPercentile,
            })
          : null;
      return { person, analysis };
    });
  }, [state.data, state.portfolio, state.hub, state.targetPercentile]);

  const kpis = useMemo(() => {
    const scored = rows.map((r) => r.analysis).filter((a): a is NonNullable<typeof a> => !!a);
    return portfolioMarketKpis(scored);
  }, [rows]);

  function addFromDesk() {
    const p = state.profile;
    const person: PortfolioPerson = {
      ...p,
      id: uid(),
      currentPayInr: toAnnualInr(p.rawAmount, p.currencyInput, p.countryCode),
    };
    dispatch({ type: "addPortfolio", person });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          title="Portfolio · mode-aware KPIs"
          subtitle={`Team roll-up for ${state.hub === "bengaluru" ? "Bengaluru baseline" : "selected metro"} benchmarks, pay gap, retention risk (Talent Market only), and correction budget. Recalculates when you change the hub selector or benchmark toggle.`}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={addFromDesk}>
            Add current Desk profile
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={!rows.length}
            onClick={() =>
              downloadCsv(`payrisk-portfolio-${Date.now()}.csv`, portfolioRiskCsv(rows))
            }
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="p-4">
          <Stat
            label="Market median (avg P50)"
            value={formatCompactINR(kpis.avgMarketMedian)}
          />
        </Card>
        <Card className="p-4">
          <Stat label="Selected benchmark (avg)" value={formatCompactINR(kpis.avgMarketValue)} />
        </Card>
        <Card className="p-4">
          <Stat
            label="Pay Gap % (avg)"
            value={
              kpis.avgPayGapPct != null
                ? `${kpis.avgPayGapPct >= 0 ? "+" : ""}${kpis.avgPayGapPct.toFixed(1)}%`
                : "—"
            }
            tone={kpis.avgPayGapPct != null && kpis.avgPayGapPct < -10 ? "danger" : "default"}
          />
        </Card>
        <Card className="p-4">
          <Stat
            label="Underpaid employees %"
            value={`${kpis.underpaidPct.toFixed(0)}%`}
            tone={kpis.underpaidPct > 25 ? "danger" : "default"}
          />
        </Card>
        <Card className="p-4">
          <Stat label="Above market %" value={`${kpis.aboveMarketPct.toFixed(0)}%`} tone="ok" />
        </Card>
        <Card className="p-4">
          <Stat
            label="High risk %"
            value={`${kpis.highRiskPct.toFixed(0)}%`}
            tone={kpis.highRiskPct > 20 ? "warn" : "default"}
          />
        </Card>
        <Card className="p-4">
          <Stat
            label="Critical risk %"
            value={`${kpis.criticalRiskPct.toFixed(0)}%`}
            tone={kpis.criticalRiskPct > 0 ? "danger" : "ok"}
          />
        </Card>
        <Card className="p-4">
          <Stat
            label="Retention exposure"
            value={formatCompactINR(kpis.retentionExposure)}
            hint="Σ adjustment for high/critical risk"
          />
        </Card>
        <Card className="p-4">
          <Stat
            label="Compensation correction budget"
            value={formatCompactINR(kpis.correctionBudget)}
            hint="Σ to bring all to selected-mode benchmark"
          />
        </Card>
      </div>

      {!rows.length ? (
        <EmptyState
          title="Portfolio is empty"
          body="Configure someone on Desk, then click “Add current Desk profile”."
        />
      ) : (
        <Card className="overflow-x-auto p-2">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-mute">
              <tr className="border-b border-ink/10">
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2">Slice</th>
                <th className="px-3 py-2 tabular">Pay</th>
                <th className="px-3 py-2 tabular">Benchmark</th>
                <th className="px-3 py-2">Pay gap</th>
                <th className="px-3 py-2">Position</th>
                <th className="px-3 py-2">Risk</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ person, analysis }) => (
                <tr key={person.id} className="border-b border-ink/5">
                  <td className="px-3 py-3 font-medium">{person.label}</td>
                  <td className="px-3 py-3 text-xs text-mute">
                    {person.countryCode} · {person.roleFamily} · {person.experienceLevel}
                  </td>
                  <td className="px-3 py-3 tabular">
                    {formatCompactINR(analysis?.yourPay ?? incumbentMetricPay(person, "market"))}
                  </td>
                  <td className="px-3 py-3 tabular">{formatCompactINR(analysis?.marketValue)}</td>
                  <td className="px-3 py-3">
                    {analysis?.payGapPct != null ? (
                      <div className="tabular">
                        {analysis.payGapPct >= 0 ? "+" : ""}
                        {analysis.payGapPct.toFixed(1)}%
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {analysis ? (
                      <MarketPositionBadge position={analysis.marketPosition} />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {analysis?.riskSupported ? (
                      <RiskBadge tier={analysis.riskTier} score={analysis.riskScore} />
                    ) : analysis ? (
                      <span className="text-xs text-mute">N/A · FX/PPP</span>
                    ) : (
                      <span className="text-mute">No match</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      className="text-xs text-copper hover:underline"
                      onClick={() => {
                        dispatch({ type: "setProfile", profile: { ...person } });
                        dispatch({ type: "view", view: "desk" });
                      }}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      className="ml-3 text-xs text-mute hover:text-crimson"
                      onClick={() => dispatch({ type: "removePortfolio", id: person.id })}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
