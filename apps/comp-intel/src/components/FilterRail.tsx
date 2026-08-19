import { useMemo, useState } from "react";
import { COUNTRY_ORDER, PAY_TYPE_LABEL } from "../lib/constants";
import { formatCount } from "../lib/money";
import { useApp, useSetFilter } from "../state";
import { Chip } from "./ui";

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
}

function SearchList({
  label,
  items,
  selected,
  onChange,
}: {
  label: string;
  items: { name: string; n: number }[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? items.filter((i) => i.name.toLowerCase().includes(needle)) : items;
  }, [items, q]);

  return (
    <fieldset className="min-w-0">
      <legend className="kbd-chip mb-2">{label}</legend>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={`Search ${label.toLowerCase()}`}
        className="mb-2 w-full rounded-lg border border-white/10 bg-ink-50 px-2.5 py-1.5 text-xs text-parchment placeholder:text-mute/70"
      />
      <div className="max-h-40 space-y-1 overflow-auto pr-1" role="listbox" aria-multiselectable>
        {filtered.slice(0, 80).map((item) => {
          const on = selected.includes(item.name);
          return (
            <label
              key={item.name}
              className={`flex cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-xs ${
                on ? "bg-gold/10 text-gold-soft" : "text-mute hover:text-parchment"
              }`}
            >
              <input
                type="checkbox"
                className="mt-0.5 accent-gold"
                checked={on}
                onChange={() => onChange(toggle(selected, item.name))}
              />
              <span className="min-w-0 flex-1 leading-snug">{item.name}</span>
              <span className="tabular text-[10px] text-mute">{formatCount(item.n)}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FilterRail() {
  const { state, dispatch } = useApp();
  const set = useSetFilter();
  const catalog = state.data?.catalog;
  if (!catalog) return null;
  const f = state.filters;

  const countries = [...catalog.countries].sort(
    (a, b) => COUNTRY_ORDER.indexOf(a.code) - COUNTRY_ORDER.indexOf(b.code),
  );

  return (
    <aside className="glass sticky top-[96px] flex max-h-[calc(100vh-120px)] flex-col gap-5 overflow-auto rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="kbd-chip">Like-for-like filters</div>
        <button
          type="button"
          onClick={() => dispatch({ type: "resetFilters" })}
          className="text-[10px] uppercase tracking-widest text-gold-soft hover:underline"
        >
          Reset
        </button>
      </div>

      <div>
        <div className="kbd-chip mb-2">Pay type</div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Pay type">
          {catalog.payTypes.map((p) => (
            <Chip
              key={p.name}
              active={!f.allowMixPayTypes && f.payTypes.length === 1 && f.payTypes[0] === p.name}
              onClick={() =>
                set({
                  payTypes: [p.name],
                  allowMixPayTypes: false,
                })
              }
            >
              {PAY_TYPE_LABEL[p.name] ?? p.name} · {formatCount(p.n)}
            </Chip>
          ))}
          <Chip
            active={f.allowMixPayTypes}
            onClick={() =>
              set({
                allowMixPayTypes: true,
                payTypes: catalog.payTypes.map((p) => p.name),
              })
            }
          >
            Mix (opt-in)
          </Chip>
        </div>
      </div>

      <div>
        <div className="kbd-chip mb-2">Country</div>
        <div className="flex flex-wrap gap-1.5">
          {countries.map((c) => (
            <Chip
              key={c.code}
              active={f.countries.includes(c.code)}
              onClick={() => set({ countries: toggle(f.countries, c.code) })}
            >
              {c.code} · {formatCount(c.n)}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <div className="kbd-chip mb-2">Experience</div>
        <div className="flex flex-col gap-1.5">
          {catalog.experienceLevels.map((e) => (
            <Chip
              key={e.name}
              active={f.experienceLevels.includes(e.name)}
              onClick={() => set({ experienceLevels: toggle(f.experienceLevels, e.name) })}
            >
              {e.name}
            </Chip>
          ))}
        </div>
      </div>

      <label className="flex items-start gap-2 text-xs text-mute">
        <input
          type="checkbox"
          className="mt-0.5 accent-gold"
          checked={f.observationMedian}
          onChange={(e) => set({ observationMedian: e.target.checked })}
        />
        <span>
          Observation median (not employee median)
          <span className="mt-1 block text-[11px] text-mute/80">
            Optional. Median of published rows in this slice — never an employee or payroll median.
          </span>
        </span>
      </label>

      <SearchList
        label="Role family"
        items={catalog.roleFamilies}
        selected={f.roleFamilies}
        onChange={(roleFamilies) => set({ roleFamilies })}
      />
      <SearchList
        label="Role name"
        items={catalog.roleNames}
        selected={f.roleNames}
        onChange={(roleNames) => set({ roleNames })}
      />
      <SearchList
        label="Source"
        items={catalog.sources.map((s) => ({ name: s.name, n: s.n }))}
        selected={f.sources}
        onChange={(sources) => set({ sources })}
      />
      <SearchList
        label="City"
        items={catalog.cities
          .filter((c) => !f.countries.length || f.countries.includes(c.countryCode))
          .map((c) => ({ name: c.name, n: c.n }))}
        selected={f.cities}
        onChange={(cities) => set({ cities })}
      />
    </aside>
  );
}
