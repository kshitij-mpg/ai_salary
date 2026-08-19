import { useMemo, useState } from "react";
import { FilterRail } from "../components/FilterRail";
import { ObservationDrawer } from "../components/ObservationDrawer";
import { SourceTable } from "../components/SourceTable";
import { EmptyState, Eyebrow, MixWarning, NBadge } from "../components/ui";
import { downloadCsv, observationsToCsv } from "../lib/export";
import { mixedPayTypes } from "../lib/filters";
import { formatCount } from "../lib/money";
import { useApp, useFiltered } from "../state";

export function SourceStudio() {
  const { state, dispatch } = useApp();
  const rows = useFiltered();
  const [q, setQ] = useState("");
  const mixed = state.filters.allowMixPayTypes && mixedPayTypes(rows);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((o) =>
      [o.roleName, o.sourceName, o.city, o.country, o.notes, o.id].join(" ").toLowerCase().includes(needle),
    );
  }, [rows, q]);
  const selected = filtered.find((r) => r.id === state.selectedId) ?? rows.find((r) => r.id === state.selectedId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <FilterRail />
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Eyebrow>Source studio</Eyebrow>
            <h1 className="font-display mt-2 text-4xl">Observation ledger</h1>
            <p className="mt-2 text-sm text-mute">
              Virtualized table of {formatCount(filtered.length)} rows. Click a row for notes, URL, FX,
              original currency, and the PPP flag. Blank money fields stay blank.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                `comp-intel-slice-${filtered.length}.csv`,
                observationsToCsv(filtered),
              )
            }
            className="rounded-full border border-gold/40 px-4 py-2 text-[11px] uppercase tracking-widest text-gold-soft hover:bg-gold/10"
          >
            Export filtered CSV
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <NBadge n={filtered.length} />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search role, source, city, notes…"
            className="min-w-[240px] flex-1 rounded-full border border-white/10 bg-ink-100 px-4 py-2 text-sm"
          />
        </div>
        <MixWarning show={mixed} />
        {filtered.length === 0 ? (
          <EmptyState onReset={() => dispatch({ type: "resetFilters" })} />
        ) : (
          <SourceTable rows={filtered} onOpen={(id) => dispatch({ type: "select", id })} />
        )}
      </div>
      <ObservationDrawer row={selected} onClose={() => dispatch({ type: "select", id: null })} />
    </div>
  );
}
