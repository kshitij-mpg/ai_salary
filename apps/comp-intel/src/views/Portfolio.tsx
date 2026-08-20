import { useMemo } from "react";
import { useApp } from "../state";
import type { PortfolioPerson } from "../types";
import { Card, EmptyState, RiskBadge, SectionTitle, VerdictBadge } from "../components/ui";
import { analyzeGap, sliceLabelFromProfile, toAnnualInr } from "../lib/analysis";
import { matchMarket } from "../lib/filters";
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
      const analysis =
        matched.length && person.currentPayInr
          ? analyzeGap(matched, person.currentPayInr, state.metric, sliceLabelFromProfile(person))
          : null;
      return { person, analysis };
    });
  }, [state.data, state.portfolio, state.metric]);

  const summary = useMemo(() => {
    const scored = rows.filter((r) => r.analysis);
    const critical = scored.filter((r) => r.analysis!.riskTier === "critical" || r.analysis!.riskTier === "high").length;
    const under = scored.filter((r) => r.analysis!.verdict === "underpaid").length;
    const remediate = scored.reduce((sum, r) => {
      const g = r.analysis?.gapVsP50;
      return sum + (g != null && g < 0 ? Math.abs(g) : 0);
    }, 0);
    return { n: scored.length, critical, under, remediate };
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
          title="Portfolio risk board"
          subtitle="Track multiple incumbents. Persists in this browser. Export a remediation CSV for HRBP / finance."
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

      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="p-4">
          <div className="eyebrow">People</div>
          <div className="mt-1 font-display text-3xl tabular">{summary.n}</div>
        </Card>
        <Card className="p-4">
          <div className="eyebrow">High / critical</div>
          <div className="mt-1 font-display text-3xl tabular text-crimson">{summary.critical}</div>
        </Card>
        <Card className="p-4">
          <div className="eyebrow">Underpaid</div>
          <div className="mt-1 font-display text-3xl tabular text-amber">{summary.under}</div>
        </Card>
        <Card className="p-4">
          <div className="eyebrow">Σ to P50</div>
          <div className="mt-1 font-display text-3xl tabular">{formatCompactINR(summary.remediate)}</div>
        </Card>
      </div>

      {!rows.length ? (
        <EmptyState
          title="Portfolio is empty"
          body="Configure someone on Desk, then click “Add current Desk profile”."
        />
      ) : (
        <Card className="overflow-x-auto p-2">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-mute">
              <tr className="border-b border-ink/10">
                <th className="px-3 py-2">Label</th>
                <th className="px-3 py-2">Slice</th>
                <th className="px-3 py-2 tabular">Pay</th>
                <th className="px-3 py-2 tabular">P50</th>
                <th className="px-3 py-2">Gap</th>
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
                  <td className="px-3 py-3 tabular">{formatCompactINR(person.currentPayInr)}</td>
                  <td className="px-3 py-3 tabular">{formatCompactINR(analysis?.band.p50)}</td>
                  <td className="px-3 py-3">
                    {analysis ? <VerdictBadge verdict={analysis.verdict} /> : "—"}
                    {analysis?.gapVsP50Pct != null ? (
                      <div className="mt-1 text-[11px] tabular text-mute">
                        {analysis.gapVsP50Pct >= 0 ? "+" : ""}
                        {analysis.gapVsP50Pct.toFixed(1)}%
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    {analysis ? (
                      <RiskBadge tier={analysis.riskTier} score={analysis.riskScore} />
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
