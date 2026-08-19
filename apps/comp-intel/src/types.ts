export type CountryCode = "US" | "IN" | "GB" | "AE" | "AU" | "NZ" | "DE" | string;
export type PayType = "Base_Salary" | "Total_Compensation" | "Mixed" | string;
export type Confidence = "HIGH" | "MEDIUM" | "LOW" | string;
export type MetricMode = "nominal" | "ppp";
export type ViewId = "brief" | "explorer" | "compare" | "studio" | "method" | "snapshot";

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

export interface Filters {
  countries: string[];
  roleFamilies: string[];
  roleNames: string[];
  experienceLevels: string[];
  payTypes: string[];
  sources: string[];
  cities: string[];
  allowMixPayTypes: boolean;
  observationMedian: boolean;
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
