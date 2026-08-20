import type { GapAnalysis } from "../types";

export function RiskMeter({ analysis }: { analysis: GapAnalysis }) {
  const score = analysis.riskScore;
  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="eyebrow">Flight risk score</div>
          <div className="mt-1 font-display text-5xl tabular leading-none text-ink">{score}</div>
          <p className="mt-1 text-xs text-mute">0 = sticky · 100 = acute leave risk</p>
        </div>
        <div className="text-right text-xs text-mute">
          <div>
            Competitive density above you:{" "}
            <span className="font-medium text-ink tabular">
              {analysis.competitiveAbovePct.toFixed(0)}%
            </span>
          </div>
          <div>
            Approx. percentile:{" "}
            <span className="font-medium text-ink tabular">
              {analysis.percentileRank != null ? `${analysis.percentileRank}` : "—"}
            </span>
          </div>
        </div>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-ink/10">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${score}%`,
            background:
              score >= 75
                ? "linear-gradient(90deg,#9f1239,#dc2626)"
                : score >= 58
                  ? "linear-gradient(90deg,#c2410c,#ea580c)"
                  : score >= 42
                    ? "linear-gradient(90deg,#a16207,#ca8a04)"
                    : "linear-gradient(90deg,#166534,#16a34a)",
          }}
        />
      </div>
      <ul className="mt-4 space-y-2">
        {analysis.riskReasons.map((r) => (
          <li key={r} className="flex gap-2 text-sm text-ink/80">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-copper" />
            <span>{r}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
