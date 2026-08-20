export type CountryCode = "US" | "IN" | "GB" | "AE" | "AU" | "NZ" | "DE" | string;
export type PayType = "Base_Salary" | "Total_Compensation" | "Mixed" | string;
export type Confidence = "HIGH" | "MEDIUM" | "LOW" | string;
export type MetricMode = "nominal" | "ppp";
export type ViewId =
  | "desk"
  | "gap"
  | "flight"
  | "peers"
  | "portfolio"
  | "scenarios"
  | "evidence"
  | "method";

export type RiskTier = "critical" | "high" | "watch" | "stable" | "premium";
export type GapVerdict = "underpaid" | "at_market" | "overpaid";

export interface Observation {
  id: string;
  analyticGrain: string;
  payPeriod: string;
  country: string;
  countryCode: CountryCode;
  stateRegion: string;
  city: string;
  roleName: string;
  originalRoleTitle: string;
  roleFamily: string;
  experienceLevel: string;
  careerLevel: string;
  industry: string;
  payType: PayType;
  baseMin: number | null;
  baseMedian: number | null;
  baseMax: number | null;
  bonus: number | null;
  equity: number | null;
  totalCompensation: number | null;
  salaryInr: number;
  salaryPppInr: number | null;
  salaryPppInrCorrected: number | null;
  pppSuspect: boolean;
  currency: string;
  currencyOriginal: string;
  fxRate: number | null;
  fxRateMeaning: string;
  fxUsdInr: number | null;
  fxConversionDate: string;
  sourceName: string;
  sourceType: string;
  sourceAccessType: string;
  sourceUrl: string;
  publicationDate: string;
  retrievalDate: string;
  sampleSize: number | null;
  sampleSizeNote: string;
  confidenceScore: Confidence;
  verificationStatus: string;
  notes: string;
  isEmployerFiling: boolean;
}

export interface NamedCount {
  name: string;
  n: number;
}

export interface Catalog {
  generatedFrom: string;
  rowCount: number;
  pppSuspectCount: number;
  fxUsdInr: number;
  fxConversionDate: string;
  retrievalDate: string;
  grain: string;
  countries: { code: string; name: string; n: number }[];
  roleFamilies: NamedCount[];
  roleNames: NamedCount[];
  experienceLevels: NamedCount[];
  payTypes: NamedCount[];
  sources: { name: string; n: number; type: string }[];
  cities: { countryCode: string; name: string; n: number }[];
  confidence: NamedCount[];
  countryFxToInr: Record<string, number>;
  worldBankPpp: Record<string, number>;
}

/** Incumbent the business is assessing. */
export interface IncumbentProfile {
  label: string;
  countryCode: string;
  roleFamily: string;
  roleName: string;
  experienceLevel: string;
  city: string;
  payType: PayType;
  /** Annual pay in INR (cash / nominal). */
  currentPayInr: number;
  currencyInput: "INR" | "USD" | "local";
  /** Raw amount typed before conversion (for display). */
  rawAmount: number;
  notes: string;
}

export interface PortfolioPerson extends IncumbentProfile {
  id: string;
}

export interface Filters {
  countries: string[];
  roleFamilies: string[];
  roleNames: string[];
  experienceLevels: string[];
  payTypes: string[];
  sources: string[];
  cities: string[];
  allowMixPayTypes: boolean;
}

export interface MarketBand {
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  min: number | null;
  max: number | null;
  mean: number | null;
  n: number;
  sourceCount: number;
  directional: boolean;
}

export interface SourcePull {
  sourceName: string;
  sourceType: string;
  n: number;
  medianPay: number;
  premiumVsYou: number;
  premiumPct: number;
  isEmployerFiling: boolean;
  sampleRoles: string[];
}

export interface DestinationPull {
  key: string;
  label: string;
  kind: "city" | "country" | "industry" | "source";
  n: number;
  medianPay: number;
  premiumVsYou: number;
  premiumPct: number;
}

export interface GapAnalysis {
  yourPay: number;
  metric: MetricMode;
  band: MarketBand;
  /** 0–100 approximate percentile among observations. */
  percentileRank: number | null;
  gapVsP50: number | null;
  gapVsP50Pct: number | null;
  gapVsP25: number | null;
  gapVsP75: number | null;
  verdict: GapVerdict;
  riskTier: RiskTier;
  riskScore: number;
  riskReasons: string[];
  competitiveAbove: number;
  competitiveAbovePct: number;
  sliceLabel: string;
  matched: Observation[];
  aboveYou: Observation[];
}

export interface ScenarioResult {
  id: string;
  label: string;
  targetPay: number;
  deltaPay: number;
  deltaPct: number;
  newRiskTier: RiskTier;
  newRiskScore: number;
  newPercentile: number | null;
  closesGapToP50: boolean;
}

export interface SourceGroup {
  sourceName: string;
  sourceType: string;
  n: number;
  values: number[];
  minPublished: number | null;
  medianPublished: number | null;
  maxPublished: number | null;
  rows: Observation[];
  isEmployerFiling: boolean;
  kind: "published_range" | "observation_set";
}

export interface SourceGroup {
  sourceName: string;
  sourceType: string;
  n: number;
  values: number[];
  minPublished: number | null;
  medianPublished: number | null;
  maxPublished: number | null;
  rows: Observation[];
  isEmployerFiling: boolean;
  kind: "published_range" | "observation_set";
}
