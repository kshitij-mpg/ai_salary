import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from "react";
import type {
  Catalog,
  GapAnalysis,
  HubId,
  IncumbentProfile,
  MarketBandRecord,
  Observation,
  PortfolioPerson,
  TargetPercentile,
  ViewId,
} from "./types";
import {
  analyzeGap,
  defaultProfile,
  incumbentMetricPay,
  sliceLabelFromProfile,
  toAnnualInr,
} from "./lib/analysis";
import { STORAGE_PORTFOLIO, STORAGE_PROFILE, STORAGE_TARGET } from "./lib/constants";
import { matchMarket, matchMarketBand } from "./lib/filters";
import { DEFAULT_HUB, isHubId, STORAGE_HUB } from "./lib/metros";

/** Expand compact ingest filings into the full Observation shape used by views. */
function hydrateObservation(raw: Partial<Observation> & { id: string; salaryInr: number }): Observation {
  const roleName = raw.roleName ?? "";
  const experienceLevel = raw.experienceLevel ?? "";
  const employer = raw.employerName ?? raw.employerGroup ?? "";
  return {
    id: raw.id,
    analyticGrain: raw.analyticGrain ?? "Filing",
    payPeriod: raw.payPeriod ?? "Annual",
    country: raw.country ?? "India",
    countryCode: raw.countryCode ?? "IN",
    stateRegion: raw.stateRegion ?? "",
    city: raw.city ?? "",
    metro: raw.metro ?? "Multi-Metro Calibrated",
    geographyLevel: raw.geographyLevel ?? "Multi-Metro",
    geographyName: raw.geographyName ?? "India · Multi-Metro Calibrated",
    roleName,
    originalRoleTitle: raw.originalRoleTitle ?? roleName,
    roleFamily: raw.roleFamily ?? "Other AI/Tech",
    experienceLevel,
    careerLevel: raw.careerLevel ?? experienceLevel,
    payType: raw.payType ?? "Base",
    compensationDefinition: raw.compensationDefinition ?? "India_Tech_Benchmark_INR",
    currency: raw.currency ?? "INR",
    salaryInr: raw.salaryInr,
    salaryPppInr: raw.salaryPppInr ?? null,
    salaryPppInrCorrected: raw.salaryPppInrCorrected ?? null,
    salaryUsd: raw.salaryUsd ?? null,
    pppSuspect: raw.pppSuspect ?? false,
    employerGroup: raw.employerGroup || employer,
    employerName: employer,
    caseNumber: raw.caseNumber,
    fxUsdInr: raw.fxUsdInr ?? null,
    fxConversionDate: raw.fxConversionDate ?? "",
    sourceName: raw.sourceName ?? "India Tech Roles Benchmark",
    sourceType: raw.sourceType ?? "India multi-metro filing",
    sourceUrl: raw.sourceUrl ?? "",
    retrievalDate: raw.retrievalDate ?? "",
    sampleSize: raw.sampleSize ?? 1,
    qualityFlag: raw.qualityFlag ?? "",
    dataQualityScore: raw.dataQualityScore ?? null,
    notes: raw.notes ?? "",
    isEmployerFiling: raw.isEmployerFiling ?? true,
    hubPay: raw.hubPay,
  };
}

function loadHub(): HubId {
  try {
    const raw = localStorage.getItem(STORAGE_HUB);
    if (isHubId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_HUB;
}

function loadTarget(): TargetPercentile {
  try {
    const raw = localStorage.getItem(STORAGE_TARGET);
    if (raw === "p25" || raw === "p50" || raw === "p75") return raw;
  } catch {
    /* ignore */
  }
  return "p50";
}

export interface AppData {
  observations: Observation[];
  marketBands: MarketBandRecord[];
  catalog: Catalog;
}

interface State {
  loading: boolean;
  error: string | null;
  data: AppData | null;
  view: ViewId;
  /** @deprecated Internal compatibility — India desk always uses market INR bands. */
  metric: "market";
  hub: HubId;
  targetPercentile: TargetPercentile;
  profile: IncumbentProfile;
  portfolio: PortfolioPerson[];
  selectedId: string | null;
  customRaisePct: number;
}

type Action =
  | { type: "loaded"; data: AppData }
  | { type: "failed"; error: string }
  | { type: "view"; view: ViewId }
  | { type: "hub"; hub: HubId }
  | { type: "targetPercentile"; targetPercentile: TargetPercentile }
  | { type: "profile"; patch: Partial<IncumbentProfile> }
  | { type: "setProfile"; profile: IncumbentProfile }
  | { type: "portfolio"; portfolio: PortfolioPerson[] }
  | { type: "addPortfolio"; person: PortfolioPerson }
  | { type: "removePortfolio"; id: string }
  | { type: "select"; id: string | null }
  | { type: "customRaise"; pct: number };

function normalizeProfile(raw: Partial<IncumbentProfile>): IncumbentProfile {
  const base = defaultProfile();
  const merged = { ...base, ...raw };
  if (merged.payType === "Base_Salary") merged.payType = "Base";
  if (merged.metro == null) merged.metro = "";
  // Force India + INR for this product release
  if (!merged.countryCode) merged.countryCode = "IN";
  if (merged.currencyInput !== "INR" && merged.countryCode === "IN") {
    merged.currencyInput = "INR";
  }
  merged.currentPayInr = toAnnualInr(merged.rawAmount, merged.currencyInput, merged.countryCode);
  return merged;
}

function loadProfile(): IncumbentProfile {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE);
    if (raw) {
      const parsed = normalizeProfile(JSON.parse(raw));
      // Migrate stale US defaults from older localStorage
      if (parsed.countryCode === "US" || !parsed.roleFamily) return defaultProfile();
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return defaultProfile();
}

function loadPortfolio(): PortfolioPerson[] {
  try {
    const raw = localStorage.getItem(STORAGE_PORTFOLIO);
    if (raw) {
      return (JSON.parse(raw) as PortfolioPerson[]).map((p) => normalizeProfile(p) as PortfolioPerson);
    }
  } catch {
    /* ignore */
  }
  return [];
}

const initial: State = {
  loading: true,
  error: null,
  data: null,
  view: "desk",
  metric: "market",
  hub: loadHub(),
  targetPercentile: loadTarget(),
  profile: loadProfile(),
  portfolio: loadPortfolio(),
  selectedId: null,
  customRaisePct: 12,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "loaded":
      return { ...state, loading: false, data: action.data, error: null };
    case "failed":
      return { ...state, loading: false, error: action.error };
    case "view":
      return { ...state, view: action.view };
    case "hub":
      return { ...state, hub: action.hub };
    case "targetPercentile":
      return { ...state, targetPercentile: action.targetPercentile };
    case "profile": {
      const next = normalizeProfile({ ...state.profile, ...action.patch });
      return { ...state, profile: next };
    }
    case "setProfile":
      return { ...state, profile: normalizeProfile(action.profile) };
    case "portfolio":
      return { ...state, portfolio: action.portfolio };
    case "addPortfolio":
      return { ...state, portfolio: [...state.portfolio, action.person] };
    case "removePortfolio":
      return { ...state, portfolio: state.portfolio.filter((p) => p.id !== action.id) };
    case "select":
      return { ...state, selectedId: action.id };
    case "customRaise":
      return { ...state, customRaisePct: action.pct };
    default:
      return state;
  }
}

const Ctx = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    const base = import.meta.env.BASE_URL;
    Promise.all([
      fetch(`${base}data/observations.json`).then((r) => {
        if (!r.ok) throw new Error(`observations.json ${r.status}`);
        return r.json();
      }),
      fetch(`${base}data/marketBands.json`).then((r) => {
        if (!r.ok) throw new Error(`marketBands.json ${r.status}`);
        return r.json();
      }),
      fetch(`${base}data/catalog.json`).then((r) => {
        if (!r.ok) throw new Error(`catalog.json ${r.status}`);
        return r.json();
      }),
    ])
      .then(([observations, marketBands, catalog]) =>
        dispatch({
          type: "loaded",
          data: {
            observations: (observations as Partial<Observation>[]).map((o) =>
              hydrateObservation(o as Partial<Observation> & { id: string; salaryInr: number }),
            ),
            marketBands,
            catalog,
          },
        }),
      )
      .catch((e: unknown) =>
        dispatch({ type: "failed", error: e instanceof Error ? e.message : "Failed to load data" }),
      );
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PROFILE, JSON.stringify(state.profile));
    } catch {
      /* ignore */
    }
  }, [state.profile]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PORTFOLIO, JSON.stringify(state.portfolio));
    } catch {
      /* ignore */
    }
  }, [state.portfolio]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HUB, state.hub);
    } catch {
      /* ignore */
    }
  }, [state.hub]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TARGET, state.targetPercentile);
    } catch {
      /* ignore */
    }
  }, [state.targetPercentile]);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp outside provider");
  return ctx;
}

export function useMarketMatch() {
  const { state } = useApp();
  return useMemo(() => {
    if (!state.data) {
      return {
        matched: [] as Observation[],
        relaxNotes: [] as string[],
        matchedBand: null as MarketBandRecord | null,
        bandRelaxNotes: [] as string[],
      };
    }
    const filingMatch = matchMarket(state.data.observations, state.profile);
    const bandMatch = matchMarketBand(state.data.marketBands, state.profile);
    return {
      matched: filingMatch.matched,
      relaxNotes: filingMatch.relaxNotes,
      matchedBand: bandMatch.band,
      bandRelaxNotes: bandMatch.relaxNotes,
    };
  }, [state.data, state.profile]);
}

export function useGapAnalysis(): GapAnalysis | null {
  const { state } = useApp();
  const { matched, matchedBand } = useMarketMatch();
  return useMemo(() => {
    const yourPay = incumbentMetricPay(state.profile, "market");
    if (!yourPay) return null;
    if (!matched.length && !matchedBand) return null;
    return analyzeGap(matched, yourPay, "market", sliceLabelFromProfile(state.profile), {
      matchedBandRecord: matchedBand,
      hubId: state.hub,
      targetPercentile: state.targetPercentile,
    });
  }, [matched, matchedBand, state.profile, state.hub, state.targetPercentile]);
}

export function useUpdateProfile() {
  const { dispatch } = useApp();
  return useCallback(
    (patch: Partial<IncumbentProfile>) => dispatch({ type: "profile", patch }),
    [dispatch],
  );
}
