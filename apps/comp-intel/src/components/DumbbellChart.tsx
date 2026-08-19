import { useMemo, useState } from "react";
import type { Observation } from "../types";
import { OBSERVATION_DISCLAIMER } from "../lib/constants";
import { formatCompactINR, formatINR, isPresent } from "../lib/money";

export interface DumbbellRow {
  id: string;
  label: string;
  sub?: string;
  fx: number | null;
  ppp: number | null;
  source: string;
  filing?: boolean;
}

export function rowsFromObservations(list: Observation[]): DumbbellRow[] {
  return list.map((o) => ({
    id: o.id,
    label: o.sourceName,
    sub: `${o.countryCode} · ${o.roleName} · ${o.experienceLevel}`,
    fx: o.salaryInr,
    ppp: o.salaryPppInrCorrected,
    source: o.sourceName,
    filing: o.isEmployerFiling,
  }));
}

export function DumbbellChart({ rows, cap = 24 }: { rows: DumbbellRow[]; cap?: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const visible = rows.slice(0, cap);
  const max = useMemo(() => {
    let m = 0;
    for (const r of visible) {
      if (isPresent(r.fx) && r.fx > m) m = r.fx;
      if (isPresent(r.ppp) && r.ppp > m) m = r.ppp;
    }
    return m > 0 ? m * 1.08 : 1;
  }, [visible]);

  const padL = 240;
  const padR = 24;
  const width = 960;
  const inner = width - padL - padR;
  const rowH = 44;
  const height = Math.max(160, visible.length * rowH + 40);
  const x = (v: number) => padL + (v / max) * inner;

  if (!visible.length) return null;

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-4 text-[11px] uppercase tracking-widest text-mute">
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-full bg-gold" /> FX nominal ₹
        </span>
        <span>
          <i className="mr-1 inline-block h-2 w-2 rounded-full bg-teal-bright" /> PPP corrected ₹
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full min-w-[720px]"
        role="img"
        aria-label="Connected dots of FX INR versus PPP-corrected INR for each source observation."
      >
        <desc>{OBSERVATION_DISCLAIMER}</desc>
        {visible.map((r, i) => {
          const cy = 28 + i * rowH;
          const a = isPresent(r.fx) ? x(r.fx) : null;
          const b = isPresent(r.ppp) ? x(r.ppp) : null;
          const label = r.label.length > 36 ? r.label.slice(0, 34) + "…" : r.label;
          return (
            <g
              key={r.id}
              onMouseEnter={() => setHover(r.id)}
              onMouseLeave={() => setHover(null)}
            >
              <text
                x={padL - 12}
                y={cy + 4}
                textAnchor="end"
                fill="#c9c3b4"
                fontSize="11"
                fontFamily="Segoe UI, system-ui, sans-serif"
              >
                {label}
              </text>
              {a != null && b != null ? (
                <line x1={a} x2={b} y1={cy} y2={cy} stroke="rgba(232,213,163,0.35)" strokeWidth="1.5" />
              ) : null}
              {a != null ? <circle cx={a} cy={cy} r={5} fill="#c9a227" /> : null}
              {b != null ? <circle cx={b} cy={cy} r={5} fill="#5ecfc0" /> : null}
            </g>
          );
        })}
      </svg>
      {hover ? (
        <p className="mt-2 text-xs text-mute">
          {(() => {
            const r = visible.find((x) => x.id === hover);
            if (!r) return null;
            return (
              <>
                <span className="text-gold-soft">{r.label}</span> · {r.sub} · FX {formatINR(r.fx)} ·
                PPP {formatINR(r.ppp)} · {OBSERVATION_DISCLAIMER}
                {r.filing ? " US LCA filing (employer-location), not a person." : ""}
              </>
            );
          })()}
        </p>
      ) : (
        <p className="mt-2 text-xs text-mute">
          Each pair is one source observation. India FX and PPP coincide after the correction.
          {rows.length > cap ? ` Showing ${cap} of ${rows.length} — tighten filters.` : ""} Compact:{" "}
          {visible[0] ? formatCompactINR(visible[0].fx) : null}
        </p>
      )}
    </div>
  );
}
