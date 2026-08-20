import type { GapAnalysis } from "../types";
import { formatCompactINR } from "../lib/money";

/** Horizontal market ladder with your pay marker. */
export function GapLadder({ analysis }: { analysis: GapAnalysis }) {
  const { band, yourPay } = analysis;
  const points = [
    { key: "P10", v: band.p10 },
    { key: "P25", v: band.p25 },
    { key: "P50", v: band.p50 },
    { key: "You", v: yourPay, you: true },
    { key: "P75", v: band.p75 },
    { key: "P90", v: band.p90 },
  ].filter((p) => p.v != null) as { key: string; v: number; you?: boolean }[];

  const vals = points.map((p) => p.v);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;

  return (
    <div className="space-y-4">
      <div className="relative h-16 rounded-xl bg-gradient-to-r from-crimson/15 via-amber/10 to-forest/20 px-2">
        <div className="absolute inset-x-4 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-ink/10" />
        {band.p25 != null && band.p75 != null ? (
          <div
            className="absolute top-1/2 h-3 -translate-y-1/2 rounded-full bg-copper/35"
            style={{
              left: `${((band.p25 - lo) / span) * 100}%`,
              width: `${((band.p75 - band.p25) / span) * 100}%`,
            }}
            title="Interquartile range P25–P75"
          />
        ) : null}
        {points.map((p) => {
          const left = ((p.v - lo) / span) * 100;
          return (
            <div
              key={p.key}
              className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${left}%` }}
            >
              <div
                className={`h-4 w-4 rounded-full border-2 ${
                  p.you
                    ? "border-ink bg-copper shadow-[0_0_0_4px_rgba(184,107,58,0.25)]"
                    : "border-paper bg-ink"
                }`}
              />
              <div
                className={`absolute left-1/2 top-5 w-16 -translate-x-1/2 text-center text-[10px] ${
                  p.you ? "font-semibold text-copper" : "text-mute"
                }`}
              >
                {p.key}
                <div className="tabular text-ink/80">{formatCompactINR(p.v)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-mute">
        Copper band = P25–P75 of matching published observations. Your marker is annual pay in the
        selected metric (FX or PPP).
      </p>
    </div>
  );
}
