import { useMemo, useState } from "react";
import { FilterRail } from "../components/FilterRail";
import { CountryTiles } from "../components/CountryTiles";
import { ObservationDrawer } from "../components/ObservationDrawer";
import { RangeChart } from "../components/RangeChart";
import { EmptyState, Eyebrow, MixWarning, NBadge } from "../components/ui";
import { mixedPayTypes } from "../lib/filters";
import { formatCount } from "../lib/money";
import { equalWeightedCountries, groupSources } from "../lib/stats";
import { OBSERVATION_DISCLAIMER } from "../lib/constants";
import { useApp, useFiltered } from "../state";

export function MarketExplorer() {
  const { state, dispatch } = useApp();
  const rows = useFiltered();
  const [sourceFocus, setSourceFocus] = useState<string | null>(null);
  const mixed = state.filters.allowMixPayTypes && mixedPayTypes(rows);
  const groups = useMemo(
    () => groupSources(sourceFocus ? rows.filter((r) => r.sourceName === sourceFocus) : rows, state.metric),
    [rows, state.metric, sourceFocus],
  );
  const tiles = useMemo(() => equalWeightedCountries(rows, state.metric), [rows, state.metric]);
  const selected = rows.find((r) => r.id === state.selectedId) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <FilterRail />
      <div className="min-w-0 space-y-6">
        <div>
          <Eyebrow>Market explorer</Eyebrow>
          <h1 className="font-display mt-2 text-4xl md:text-5xl">Like-for-like slice</h1>
          <p className="mt-2 max-w-2xl text-sm text-mute">
            {OBSERVATION_DISCLAIMER} Country tiles are equal-weighted: colour is the observation
            median inside the current filters, not a US-weighted global average.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <NBadge n={rows.length} />
            <span className="text-xs text-mute">{formatCount(groups.length)} sources · metric {state.metric === "ppp" ? "PPP corrected" : "Salary_INR"}</span>
            {sourceFocus ? (
              <button
                type="button"
                className="text-xs text-gold-soft underline"
                onClick={() => setSourceFocus(null)}
              >
                Clear source drill ({sourceFocus})
              </button>
            ) : null}
          </div>
        </div>
        <MixWarning show={mixed} />
        {rows.length === 0 ? (
          <EmptyState onReset={() => dispatch({ type: "resetFilters" })} />
        ) : (
          <>
            <CountryTiles
              slices={tiles}
              onSelect={(code) => {
                dispatch({ type: "drillCountry", code });
                setSourceFocus(null);
              }}
            />
            <div className="glass rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-display text-2xl">Range by source</h2>
                <p className="text-[11px] text-mute">Click a band to isolate that source</p>
              </div>
              <RangeChart
                groups={groups}
                showObsMedian={state.filters.observationMedian}
                onSelectSource={(name) => setSourceFocus(name)}
              />
            </div>
          </>
        )}
      </div>
      <ObservationDrawer row={selected} onClose={() => dispatch({ type: "select", id: null })} />
    </div>
  );
}
