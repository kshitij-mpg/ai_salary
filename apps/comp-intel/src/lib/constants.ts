export const COUNTRY_FX_TO_INR: Record<string, number> = {
  IN: 1,
  US: 95.43,
  AE: 25.9856,
  GB: 128.9259,
  DE: 110.1453,
  AU: 67.364,
  NZ: 55.9792,
};

export const WORLD_BANK_PPP: Record<string, number> = {
  /** India: World Bank GDP PPP conversion factor (~₹23 per international dollar). */
  IN: 23,
  US: 1,
  AE: 2.32695589646038,
  GB: 0.677133,
  DE: 0.709983,
  AU: 1.398943,
  NZ: 1.472957,
};

export const FX_USD_INR = 95.43;
export const FX_DATE = "2026-08-12";

/** Alias for USD → PPP-adjusted INR (India purchasing-power equivalent). */
export { INDIA_PPP_FACTOR, convertUsdToPppInr, PPP_COMPARISON_DESCRIPTION } from "./ppp";

export const COUNTRY_ORDER = ["IN", "US", "GB", "AE", "DE", "AU", "NZ"];

export const COUNTRY_LABEL: Record<string, string> = {
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  AE: "United Arab Emirates",
  DE: "Germany",
  AU: "Australia",
  NZ: "New Zealand",
};

export const EXPERIENCE_ORDER = [
  "Entry Level (0-2 years)",
  "Mid Level (3-5 years)",
  "Senior Level (6-9 years)",
  "Lead Level (10-14 years)",
  "All Levels (unspecified)",
];

export const PAY_TYPE_LABEL: Record<string, string> = {
  Base: "Base salary (LCA offered wage)",
  Base_Salary: "Base salary",
  Total_Compensation: "Total compensation",
  Mixed: "Mixed (base + TC)",
};

/** Geography fallback minimum n for pre-aggregated market bands. */
export const GEO_THRESHOLDS = {
  city: 5,
  metro: 10,
  state: 15,
  national: 30,
} as const;

export const DIRECTIONAL_N = 30;

export const RISK_LABEL: Record<string, string> = {
  critical: "Critical retention risk",
  high: "High retention risk",
  watch: "Moderate retention risk",
  stable: "Low retention risk",
  premium: "Premium / insulated",
};

export const VERDICT_LABEL: Record<string, string> = {
  underpaid: "Underpaid vs market",
  at_market: "Market aligned",
  overpaid: "Above market",
};

export const PRODUCT_NAME = "PayRisk Desk";
export const PRODUCT_TAGLINE =
  "What is this talent worth in the market — and who could poach them?";

export const OBSERVATION_DISCLAIMER =
  "US LCA certified offered base wages — not total compensation, not confirmed offers to your employee, not individual headcount. Talent Market Value = Market Benchmark (P50 × Geographic Premium × CCI) × Role Demand × Scarcity. Market Benchmark omits demand/scarcity. FX and PPP are pure conversions. Risk scores are directional decision aids, not resignation predictions.";

export const STORAGE_PORTFOLIO = "payrisk-portfolio-v1";
export const STORAGE_PROFILE = "payrisk-profile-v1";

export const BENCHMARK_MODE_OPTIONS: {
  id: "talent" | "market" | "fx" | "ppp";
  label: string;
  title: string;
  explanation: string;
}[] = [
  {
    id: "talent",
    label: "Talent",
    title: "Talent Market View (default): Market Benchmark × Role Demand × Scarcity",
    explanation: "Retention & hiring market value",
  },
  {
    id: "market",
    label: "Market",
    title: "Market Benchmark: P50 × Geographic Premium × Compensation Competitiveness",
    explanation: "Compensation benchmark median",
  },
  {
    id: "fx",
    label: "FX ₹",
    title: "FX View: Current USD × FX_USD_INR — pure currency conversion",
    explanation: "Currency conversion",
  },
  {
    id: "ppp",
    label: "PPP ₹",
    title: "PPP View: Current USD × PPP_Conversion_Factor — purchasing power only",
    explanation: "Purchasing power equivalent",
  },
];
