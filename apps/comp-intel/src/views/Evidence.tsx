import { useMemo, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef } from "react";
import { useGapAnalysis, useApp } from "../state";
import { Card, EmptyState, SectionTitle, inputClass } from "../components/ui";
import { downloadCsv, observationsToCsv } from "../lib/export";
import { formatCompactINR } from "../lib/money";

export function EvidenceView() {
  const analysis = useGapAnalysis();
  const { state, dispatch } = useApp();
  const [q, setQ] = useState("");
  const [aboveOnly, setAboveOnly] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

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
          o.industry.toLowerCase().includes(needle),
      );
    }
    return [...list].sort((a, b) => b.salaryInr - a.salaryInr);
  }, [analysis, q, aboveOnly]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 12,
  });

  if (!analysis) {
    return (
      <EmptyState title="No evidence slice" body="Match a market on Desk to inspect source rows." />
    );
  }

  const selected = rows.find((r) => r.id === state.selectedId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle
          title="Evidence ledger"
          subtitle={`${analysis.matched.length} matched observations · ${analysis.aboveYou.length} pay more than you`}
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

      <Card className="flex flex-wrap items-center gap-3 p-3">
        <input
          className={`${inputClass} max-w-sm`}
          placeholder="Search source, role, city, industry…"
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
          Only observations above my pay
        </label>
        <span className="text-xs text-mute tabular">{rows.length} rows</span>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <Card className="overflow-hidden">
          <div ref={parentRef} className="h-[560px] overflow-auto">
            <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
              {virtualizer.getVirtualItems().map((vi) => {
                const o = rows[vi.index]!;
                const above = o.salaryInr > analysis.yourPay;
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
                        {o.sourceName} · {o.city}, {o.countryCode}
                      </div>
                    </div>
                    <div className={`shrink-0 tabular ${above ? "text-crimson" : "text-ink"}`}>
                      {formatCompactINR(
                        state.metric === "ppp" ? o.salaryPppInrCorrected : o.salaryInr,
                      )}
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
              <dl className="space-y-2">
                <Row k="Source" v={selected.sourceName} />
                <Row k="Type" v={selected.sourceType} />
                <Row k="Industry" v={selected.industry} />
                <Row k="Experience" v={selected.experienceLevel} />
                <Row k="Pay type" v={selected.payType} />
                <Row k="Confidence" v={selected.confidenceScore} />
                <Row
                  k="Salary INR"
                  v={formatCompactINR(selected.salaryInr)}
                />
                <Row
                  k="PPP INR"
                  v={formatCompactINR(selected.salaryPppInrCorrected)}
                />
              </dl>
              {selected.sourceUrl ? (
                <a
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-xs text-copper hover:underline"
                >
                  Open source URL
                </a>
              ) : null}
              {selected.notes ? (
                <p className="rounded-lg bg-ink-50 p-3 text-xs leading-relaxed text-mute">
                  {selected.notes}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-mute">Select a row to inspect the observation.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-ink/5 py-1.5">
      <dt className="text-mute">{k}</dt>
      <dd className="text-right text-ink">{v || "—"}</dd>
    </div>
  );
}
