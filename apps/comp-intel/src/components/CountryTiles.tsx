import { COUNTRY_LABEL } from "../lib/constants";
import { formatCompactINR, formatCount } from "../lib/money";
import type { CountrySlice } from "../lib/stats";
import { NBadge } from "./ui";

function tone(value: number | null, min: number, max: number): string {
  if (value == null || max === min) return "rgba(201,162,39,0.18)";
  const t = (value - min) / (max - min);
  const a = 0.12 + t * 0.42;
  return `rgba(201,162,39,${a.toFixed(2)})`;
}

export function CountryTiles({
  slices,
  onSelect,
}: {
  slices: CountrySlice[];
  onSelect: (code: string) => void;
}) {
  const vals = slices.map((s) => s.observationMedian).filter((v): v is number => v != null);
  const min = vals.length ? Math.min(...vals) : 0;
  const max = vals.length ? Math.max(...vals) : 1;
  const nMax = Math.max(...slices.map((s) => s.n), 1);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
      {slices.map((s) => {
        const size = 28 + (Math.sqrt(s.n / nMax) * 36);
        return (
          <button
            key={s.countryCode}
            type="button"
            onClick={() => onSelect(s.countryCode)}
            className="glass rounded-2xl p-4 text-left transition hover:-translate-y-0.5 hover:border-gold/40"
            style={{ background: `linear-gradient(180deg, ${tone(s.observationMedian, min, max)}, rgba(7,11,18,0.35))` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-display text-2xl text-gold-soft">{s.countryCode}</div>
                <div className="text-[11px] text-mute">{COUNTRY_LABEL[s.countryCode] ?? s.country}</div>
              </div>
              <div
                className="rounded-full border border-gold/30"
                style={{ width: size, height: size }}
                aria-hidden
              />
            </div>
            <div className="mt-4 font-display text-2xl tabular text-parchment">
              {formatCompactINR(s.observationMedian)}
            </div>
            <div className="mt-1 text-[11px] text-mute">Observation median · {formatCount(s.n)} rows</div>
            <div className="mt-2">
              <NBadge n={s.n} />
            </div>
          </button>
        );
      })}
    </div>
  );
}
