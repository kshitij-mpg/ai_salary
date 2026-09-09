/**
 * Indian multi-metro geographic cost indices relative to Bengaluru baseline = 1.0.
 * Mirrors ai_salary/india_tech_benchmark_engine.py METRO_MULTIPLIERS.
 */

export type HubId =
  | "bengaluru"
  | "mumbai"
  | "delhi_ncr"
  | "hyderabad"
  | "chennai"
  | "pune";

export interface HubOption {
  id: HubId;
  label: string;
  shortLabel: string;
  /** Multiplier vs Bengaluru baseline Benchmark_INR_Salary */
  multiplier: number;
  /** Boardroom legend line */
  legend: string;
  /** Filing-grain column equivalent (null for baseline) */
  filingColumn: string | null;
  /** Summary-grain column prefix (null for baseline → Benchmark_INR_*) */
  summaryPrefix: string | null;
}

export const HUB_OPTIONS: HubOption[] = [
  {
    id: "bengaluru",
    label: "Bengaluru (Baseline)",
    shortLabel: "Bengaluru",
    multiplier: 1.0,
    legend: "Bengaluru — baseline India tech hub (index 1.00)",
    filingColumn: null,
    summaryPrefix: null,
  },
  {
    id: "mumbai",
    label: "Mumbai",
    shortLabel: "Mumbai",
    multiplier: 1.05,
    legend: "Mumbai (+5% banking/real-estate structure premium)",
    filingColumn: "Benchmark_INR_Mumbai",
    summaryPrefix: "Benchmark_Mumbai",
  },
  {
    id: "delhi_ncr",
    label: "Delhi-NCR",
    shortLabel: "Delhi-NCR",
    multiplier: 0.95,
    legend: "Delhi-NCR (−5% hub structural index adjustment)",
    filingColumn: "Benchmark_INR_Delhi_NCR",
    summaryPrefix: "Benchmark_Delhi_NCR",
  },
  {
    id: "hyderabad",
    label: "Hyderabad",
    shortLabel: "Hyderabad",
    multiplier: 0.9,
    legend: "Hyderabad (−10% cost premium scaling index)",
    filingColumn: "Benchmark_INR_Hyderabad",
    summaryPrefix: "Benchmark_Hyderabad",
  },
  {
    id: "chennai",
    label: "Chennai",
    shortLabel: "Chennai",
    multiplier: 0.85,
    legend: "Chennai (−15% enterprise systems adjustment)",
    filingColumn: "Benchmark_INR_Chennai",
    summaryPrefix: "Benchmark_Chennai",
  },
  {
    id: "pune",
    label: "Pune",
    shortLabel: "Pune",
    multiplier: 0.88,
    legend: "Pune (−12% product engineering scaling)",
    filingColumn: "Benchmark_INR_Pune",
    summaryPrefix: "Benchmark_Pune",
  },
];

export const DEFAULT_HUB: HubId = "bengaluru";

export const STORAGE_HUB = "payrisk-target-hub-v1";

export function hubOption(id: HubId | string | null | undefined): HubOption {
  return HUB_OPTIONS.find((h) => h.id === id) ?? HUB_OPTIONS[0]!;
}

export function hubMultiplier(id: HubId | string | null | undefined): number {
  return hubOption(id).multiplier;
}

/** Round hub-scaled INR to whole rupees (matches CSV integer casting). */
export function scaleHubInr(
  value: number | null | undefined,
  multiplier: number,
): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (multiplier === 1) return Math.round(value);
  return Math.round(value * multiplier);
}

export function isHubId(raw: string | null | undefined): raw is HubId {
  return HUB_OPTIONS.some((h) => h.id === raw);
}
