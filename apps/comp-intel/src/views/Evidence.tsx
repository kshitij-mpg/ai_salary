import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { useGapAnalysis, useApp } from "../state";
import { Card, EmptyState, SectionTitle, Stat, ThreatBadge, inputClass } from "../components/ui";
import { downloadCsv, observationsToCsv } from "../lib/export";
import { formatCompactINR, formatINR } from "../lib/money";
import { metricValue } from "../lib/stats";
import {
  MARKET_POSITION_LABEL,
  PAY_GAP_LABEL,
  metricCurrencyLabel,
} from "../lib/marketBenchmark";

export function EvidenceView() {
  const analysis = useGapAnalysis();
  const { state, dispatch } = useApp();
  const [q, setQ] = useState("");
  const [aboveOnly, setAboveOnly] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const metric = state.metric;
  const isPpp = metric === "ppp";
  const mode = metric === "nominal" ? "fx" : metric;

  const rows = useMemo(() => {
    if (!analysis) return [];
    let list = aboveOnly ? analysis.aboveYou : analysis.matched;
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (o) =>
          o.sourceName.toLowerCase().includes(needle) ||
          o.roleName.toLowerCase().includes(needle) ||
          o.city.toLowerCase().includes(needle) ||
          o.metro.toLowerCase().includes(needle) ||
          o.employerGroup.toLowerCase().includes(needle) ||
          o.employerName.toLowerCase().includes(needle),
      );
    }
    return [...list].sort((a, b) => {
      const av = metricValue(a, metric) ?? a.salaryInr;
      const bv = metricValue(b, metric) ?? b.salaryInr;
      return bv - av;
    });
  }, [analysis, q, aboveOnly, metric]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12,
  });

  if (!analysis) {
    return (
      <EmptyState title="No evidence slice" body="Match a market on Desk to inspect LCA filing rows." />
    );
  }

  const selected = rows.find((r) => r.id === state.selectedId) ?? null;
  const selectedPay = selected ? metricValue(selected, metric) : null;
  const selectedDelta =
    selectedPay != null ? selectedPay - analysis.yourPay : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          title="Market evidence"
          subtitle={`Market salary distribution + competitor filings for this role · ${metricCurrencyLabel(mode)}. Benchmarks recalculate with mode — Talent / Market / FX / PPP use distinct formulas.`}
        />
        <button
          type="button"
          className="btn-secondary"
          onClick={() =>
            downloadCsv(
              `payrisk-evidence-${Date.now()}.csv`,
              observationsToCsv(aboveOnly ? analysis.aboveYou : analysis.matched),
            )
          }
        >
          Export slice CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <Stat label="Market median (P50)" value={formatCompactINR(analysis.marketMedian)} />
        </Card>
        <Card className="p-4">
          <Stat
            label={analysis.benchmarkLabel}
            value={formatCompactINR(analysis.marketValue)}
            hint={
              mode === "talent"
                ? "Market Benchmark × Demand × Scarcity"
                : mode === "market"
                  ? "P50 × Geo × CCI"
                  : mode === "fx"
                    ? "Current USD × FX (no adjustments)"
                    : "Current USD × PPP factor"
            }
          />
        </Card>
        <Card className="p-4">
          <Stat
            label="Pay Gap %"
            value={
              analysis.payGapPct != null
                ? `${analysis.payGapPct >= 0 ? "+" : ""}${analysis.payGapPct.toFixed(1)}%`
                : "—"
            }
            hint={PAY_GAP_LABEL[analysis.payGapClass]}
            tone={
              analysis.payGapPct != null && analysis.payGapPct < -10 ? "danger" : "default"
            }
          />
        </Card>
        <Card className="p-4">
          <Stat
            label="Expected offer"
            value={`${formatCompactINR(analysis.expectedOfferLow)} – ${formatCompactINR(analysis.expectedOfferHigh)}`}
            hint="P75–P90"
          />
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <Stat label="P25" value={formatCompactINR(analysis.band.p25)} />
        </Card>
        <Card className="p-4">
          <Stat label="P75" value={formatCompactINR(analysis.band.p75)} />
        </Card>
        <Card className="p-4">
          <Stat label="P90" value={formatCompactINR(analysis.band.p90)} />
        </Card>
        <Card className="p-4">
          <Stat label="Current salary" value={formatCompactINR(analysis.yourPay)} />
        </Card>
      </div>

      <Card className="p-4 text-sm leading-relaxed text-ink/85">
        <p>
          <strong>Market position:</strong> {MARKET_POSITION_LABEL[analysis.marketPosition]} ·{" "}
          <strong>Comp. competitiveness:</strong>{" "}
          {analysis.compensationCompetitivenessIndex?.toFixed(2) ?? "—"} ·{" "}
          <strong>Role demand:</strong> {analysis.roleDemandIndex?.toFixed(2) ?? "—"} ·{" "}
          <strong>Talent scarcity:</strong> {analysis.talentScarcityIndicator ?? "—"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {analysis.riskSupported ? (
            <ThreatBadge
              tier={analysis.competitiveThreatTier}
              score={analysis.competitiveThreatScore}
            />
          ) : (
            <span className="text-xs text-mute">Threat scoring disabled in FX/PPP</span>
          )}
          <span className="text-xs text-mute">
            Top hiring companies:{" "}
            {analysis.topCompetitors.map((c) => c.employerLabel).slice(0, 5).join(", ") || "—"}
          </span>
        </div>
      </Card>

      <Card className="flex flex-wrap items-center gap-3 p-3">
        <input
          className={`${inputClass} max-w-sm`}
          placeholder="Search employer, role, city, metro…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="flex items-center gap-2 text-xs text-mute">
          <input
            type="checkbox"
            checked={aboveOnly}
            onChange={(e) => setAboveOnly(e.target.checked)}
            className="accent-copper"
          />
          Only filings above my pay
        </label>
        <span className="text-xs text-mute tabular">{rows.length.toLocaleString()} rows</span>
        <span className="ml-auto rounded-md bg-ink/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-mute">
          Your pay ({metricCurrencyLabel(mode)}): {formatCompactINR(analysis.yourPay)}
        </span>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="overflow-hidden">
          <div ref={parentRef} className="h-[560px] overflow-auto">
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((vi) => {
                const o = rows[vi.index]!;
                const pay = metricValue(o, metric) ?? o.salaryInr;
                const above = pay > analysis.yourPay;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => dispatch({ type: "select", id: o.id })}
                    className={`absolute left-0 flex w-full items-center gap-3 border-b border-ink/5 px-4 text-left text-sm hover:bg-ink-50 ${
                      state.selectedId === o.id ? "bg-copper/10" : ""
                    }`}
                    style={{ height: vi.size, transform: `translateY(${vi.start}px)` }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{o.roleName}</div>
                      <div className="truncate text-[11px] text-mute">
                        {o.employerGroup || o.employerName} · {o.city || o.metro || o.stateRegion}
                      </div>
                    </div>
                    <div className={`shrink-0 tabular ${above ? "text-crimson" : "text-ink"}`}>
                      {formatCompactINR(pay)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        <Card className="p-5">
          {selected ? (
            <div className="space-y-3 text-sm">
              <h3 className="font-display text-2xl leading-tight">{selected.roleName}</h3>
              <p className="text-xs text-mute">{selected.originalRoleTitle}</p>

              <div className="rounded-xl border border-copper/30 bg-copper/5 p-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-copper">
                  Filing salary · {isPpp ? "PPP-adjusted INR (optional view)" : "Cash FX INR"}
                </div>
                <div className="mt-1 font-display text-2xl tabular text-ink">
                  {formatINR(selectedPay)}
                </div>
                {selectedDelta != null ? (
                  <p className="mt-1 text-[11px] text-mute">
                    {selectedDelta >= 0 ? "+" : "−"}
                    {formatCompactINR(Math.abs(selectedDelta))} vs your pay
                  </p>
                ) : null}
              </div>

              <dl className="space-y-2">
                <Row k="Employer group" v={selected.employerGroup} />
                <Row k="Employer name" v={selected.employerName} />
                <Row k="Metro" v={selected.metro} />
                <Row
                  k="City / state"
                  v={`${selected.city}${selected.stateRegion ? `, ${selected.stateRegion}` : ""}`}
                />
                <Row k="Experience" v={selected.experienceLevel} />
                <Row k="Pay type" v={selected.payType} />
                <Row k="Quality flag" v={selected.qualityFlag} />
                <Row
                  k="Salary INR (cash FX)"
                  v={formatCompactINR(selected.salaryInr)}
                  active={!isPpp}
                />
                <Row
                  k="PPP-adjusted INR (optional)"
                  v={formatCompactINR(selected.salaryPppInrCorrected)}
                  active={isPpp}
                />
                <Row k="Source" v={selected.sourceName} />
              </dl>

              {selected.sourceUrl ? (
                <a
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-xs text-copper hover:underline"
                >
                  Open DOL LCA disclosure
                </a>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-mute">Select a row to inspect the LCA filing.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v, active }: { k: string; v: string; active?: boolean }) {
  return (
    <div
      className={`flex justify-between gap-3 border-b border-ink/5 py-1.5 ${
        active ? "rounded-md bg-copper/10 px-2 -mx-2" : ""
      }`}
    >
      <dt className={active ? "font-medium text-ink" : "text-mute"}>
        {k}
        {active ? " · active" : ""}
      </dt>
      <dd className={`text-right tabular ${active ? "font-semibold text-ink" : "text-ink"}`}>
        {v || "—"}
      </dd>
    </div>
  );
}
