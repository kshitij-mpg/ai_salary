import { useMemo, useState } from "react";
import type { SourceGroup } from "../types";
import { OBSERVATION_DISCLAIMER } from "../lib/constants";
import { formatCompactINR, formatCount, formatINR, isPresent } from "../lib/money";
import { median } from "../lib/stats";
import { NBadge } from "./ui";

function domainMax(groups: SourceGroup[], showObsMedian: boolean): number {
  let m = 0;
  for (const g of groups) {
    const hi = Math.max(
      g.maxPublished ?? 0,
      g.minPublished ?? 0,
      g.medianPublished ?? 0,
      ...g.values,
      showObsMedian ? median(g.values) ?? 0 : 0,
    );
    if (hi > m) m = hi;
  }
  return m > 0 ? m * 1.08 : 1;
}

export function RangeChart({
  groups,
  showObsMedian,
  onSelectSource,
}: {
  groups: SourceGroup[];
  showObsMedian: boolean;
  onSelectSource?: (name: string) => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const visible = groups.slice(0, 18);
  const max = useMemo(() => domainMax(visible, showObsMedian), [visible, showObsMedian]);
  const rowH = 56;
  const padL = 220;
  const padR = 28;
  const width = 920;
  const inner = width - padL - padR;
  const height = Math.max(180, visible.length * rowH + 48);

  const x = (v: number) => padL + (v / max) * inner;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  if (!visible.length) return null;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[720px]"
        role="img"
        aria-label="Min to max published ranges by source. Each band is a source observation set, not employees."
      >
        <title>Source range bands</title>
        <desc>{OBSERVATION_DISCLAIMER}</desc>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={28} y2={height - 8} stroke="rgba(232,213,163,0.08)" />
            <text x={x(t)} y={18} fill="#9a9484" fontSize="10" textAnchor="middle" fontFamily="Segoe UI, system-ui, sans-serif">
              {formatCompactINR(t)}
            </text>
          </g>
        ))}
        {visible.map((g, i) => {
          const cy = 40 + i * rowH;
          const lo =
            g.kind === "published_range"
              ? g.minPublished
              : g.values.length
                ? Math.min(...g.values)
                : null;
          const hi =
            g.kind === "published_range"
              ? g.maxPublished
              : g.values.length
                ? Math.max(...g.values)
                : null;
          const mid = g.kind === "published_range" ? (g.medianPublished ?? median(g.values)) : median(g.values);
          const obsMed = showObsMedian ? median(g.values) : null;
          const active = hover === g.sourceName;
          const label = g.sourceName.length > 34 ? g.sourceName.slice(0, 32) + "…" : g.sourceName;
          const step = Math.max(1, Math.floor(g.values.length / 80));
          const sample = g.values.filter((_, idx) => idx % step === 0).slice(0, 80);
          return (
            <g
              key={g.sourceName}
              onMouseEnter={() => setHover(g.sourceName)}
              onMouseLeave={() => setHover(null)}
              onClick={() => onSelectSource?.(g.sourceName)}
              className="cursor-pointer"
            >
              <text
                x={padL - 12}
                y={cy + 4}
                textAnchor="end"
                fill={active ? "#e8d5a3" : "#c9c3b4"}
                fontSize="11"
                fontFamily="Segoe UI, system-ui, sans-serif"
              >
                {label}
              </text>
              {isPresent(lo) && isPresent(hi) ? (
                <rect
                  x={x(lo)}
                  y={cy - 7}
                  width={Math.max(2, x(hi) - x(lo))}
                  height={14}
                  rx={7}
                  fill={g.kind === "published_range" ? "rgba(201,162,39,0.22)" : "rgba(94,207,192,0.18)"}
                  stroke={active ? "#e8d5a3" : "rgba(201,162,39,0.45)"}
                />
              ) : null}
              {g.kind === "observation_set" && sample.length > 1
                ? sample.map((v, idx) => (
                    <circle
                      key={idx}
                      cx={x(v)}
                      cy={cy}
                      r={2.2}
                      fill="rgba(94,207,192,0.55)"
                    />
                  ))
                : null}
              {isPresent(mid) ? (
                <circle cx={x(mid)} cy={cy} r={5} fill="#c9a227" stroke="#070b12" strokeWidth="1.5" />
              ) : null}
              {isPresent(obsMed) ? (
                <rect x={x(obsMed) - 1} y={cy - 12} width="2" height="24" fill="#5ecfc0" />
              ) : null}
            </g>
          );
        })}
      </svg>
      {hover ? (
        <div className="mt-2 rounded-lg border border-gold/20 bg-ink-100 px-3 py-2 text-xs text-mute">
          <span className="text-gold-soft">{hover}</span>
          {" · "}
          {OBSERVATION_DISCLAIMER}{" "}
          {visible.find((g) => g.sourceName === hover)?.n
            ? `n=${formatCount(visible.find((g) => g.sourceName === hover)!.n)}.`
            : ""}
          {(() => {
            const g = visible.find((x) => x.sourceName === hover);
            if (!g) return null;
            return (
              <span>
                {" "}
                Mid {formatINR(g.medianPublished ?? median(g.values))}
                {g.isEmployerFiling ? " · US LCA employer-location filings, not people." : ""}
              </span>
            );
          })()}
        </div>
      ) : (
        <p className="mt-2 text-xs text-mute">
          Gold pill = published min–max. Gold dot = published midpoint / primary Salary_INR. Teal
          dots = individual observations from the same source. {groups.length > 18
            ? `Showing 18 of ${formatCount(groups.length)} sources — filter to see the rest.`
            : null}
        </p>
      )}
      {visible.some((g) => g.n >= 1) ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {visible.slice(0, 6).map((g) => (
            <NBadge key={g.sourceName} n={g.n} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
