import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GapAnalysis } from "../types";
import { histogramBuckets, metricOf } from "../lib/analysis";
import { formatCompactINR } from "../lib/money";
import { isPresent } from "../lib/money";

export function PayHistogram({ analysis }: { analysis: GapAnalysis }) {
  const values = analysis.matched
    .map((o) => metricOf(o, analysis.metric))
    .filter(isPresent);
  const buckets = histogramBuckets(values, 14);
  const data = buckets.map((b, i) => ({
    name: formatCompactINR(b.x0),
    n: b.n,
    mid: (b.x0 + b.x1) / 2,
    containsYou: analysis.yourPay >= b.x0 && (i === buckets.length - 1 ? analysis.yourPay <= b.x1 : analysis.yourPay < b.x1),
  }));

  if (!data.length) {
    return <p className="text-sm text-mute">No values to chart.</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(12,26,46,0.08)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} interval="preserveStartEnd" />
          <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#6b7280" }} width={28} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(12,26,46,0.1)",
              fontSize: 12,
            }}
            formatter={(v: number) => [v, "Observations"]}
          />
          <ReferenceLine
            x={data.find((d) => d.containsYou)?.name}
            stroke="#b86b3a"
            strokeDasharray="4 4"
          />
          <Bar dataKey="n" radius={[4, 4, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.containsYou ? "#b86b3a" : "#0c1a2e"} fillOpacity={d.containsYou ? 1 : 0.55} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
