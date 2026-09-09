import type { HubId, MetricMode, Observation, SourceGroup } from "../types";
import { DIRECTIONAL_N } from "./constants";
import { isPresent } from "./money";

export function metricValue(
  o: Observation,
  metric: MetricMode,
  hubId?: HubId,
): number | null {
  if (metric === "ppp") return o.salaryPppInrCorrected;
  if (hubId && o.hubPay?.[hubId] != null) return o.hubPay[hubId]!;
  // market, talent, fx, nominal → cash INR (Bengaluru baseline on India ingest)
  return o.salaryInr;
}

export function sortedNumbers(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = sortedNumbers(values);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function quantile(values: number[], q: number): number | null {
  if (!values.length) return null;
  const s = sortedNumbers(values);
  if (s.length === 1) return s[0]!;
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return s[lo]!;
  return s[lo]! * (hi - pos) + s[hi]! * (pos - lo);
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const arr = m.get(k);
    if (arr) arr.push(row);
    else m.set(k, [row]);
  }
  return m;
}

export function directional(n: number): boolean {
  return n > 0 && n < DIRECTIONAL_N;
}

export function groupSources(rows: Observation[], metric: MetricMode): SourceGroup[] {
  const grouped = groupBy(rows, (o) => o.employerGroup || o.employerName || o.sourceName);
  const out: SourceGroup[] = [];
  for (const [sourceName, list] of grouped) {
    const values = list.map((o) => metricValue(o, metric)).filter(isPresent);
    const kind: SourceGroup["kind"] = list.every((o) => o.isEmployerFiling)
      ? "employer_filing"
      : "observation_set";
    out.push({
      sourceName,
      sourceType: list[0]?.sourceType ?? "",
      n: list.length,
      values,
      minPublished: values.length ? Math.min(...values) : null,
      medianPublished: median(values),
      maxPublished: values.length ? Math.max(...values) : null,
      rows: list,
      isEmployerFiling: list.some((o) => o.isEmployerFiling),
      kind,
    });
  }
  return out.sort((a, b) => b.n - a.n || a.sourceName.localeCompare(b.sourceName));
}
