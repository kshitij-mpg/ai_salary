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
  IncumbentProfile,
  MarketBandRecord,
  MetricMode,
  Observation,
  PortfolioPerson,
  ViewId,
} from "./types";
import {
  analyzeGap,
  defaultProfile,
  incumbentMetricPay,
  sliceLabelFromProfile,
  toAnnualInr,
} from "./lib/analysis";
import { STORAGE_PORTFOLIO, STORAGE_PROFILE } from "./lib/constants";
import { matchMarket, matchMarketBand } from "./lib/filters";

const STORAGE_METRIC = "payrisk-benchmark-mode-v3";

function normalizeMetric(raw: string | null): MetricMode {
  if (raw === "market" || raw === "talent" || raw === "fx" || raw === "ppp") return raw;
  if (raw === "nominal") return "fx"; // legacy FX toggle
  return "talent";
}

function loadMetric(): MetricMode {
  try {
    const raw = localStorage.getItem(STORAGE_METRIC);
    if (raw) return normalizeMetric(raw);
    // Migrate legacy keys once
    const legacyV2 = localStorage.getItem("payrisk-benchmark-mode-v2");
    if (legacyV2) return normalizeMetric(legacyV2);
    const legacy = localStorage.getItem("payrisk-metric-v1");
    if (legacy) return normalizeMetric(legacy);
  } catch {
    /* ignore */
  }
  return "talent";
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
  metric: MetricMode;
  profile: IncumbentProfile;
  portfolio: PortfolioPerson[];
  selectedId: string | null;
  customRaisePct: number;
}

type Action =
  | { type: "loaded"; data: AppData }
  | { type: "failed"; error: string }
  | { type: "view"; view: ViewId }
  | { type: "metric"; metric: MetricMode }
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
  merged.currentPayInr = toAnnualInr(merged.rawAmount, merged.currencyInput, merged.countryCode);
  return merged;
}

function loadProfile(): IncumbentProfile {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE);
    if (raw) return normalizeProfile(JSON.parse(raw));
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
  metric: loadMetric(),
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
    case "metric":
      return { ...state, metric: action.metric };
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
        dispatch({ type: "loaded", data: { observations, marketBands, catalog } }),
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
      localStorage.setItem(STORAGE_METRIC, state.metric);
    } catch {
      /* ignore */
    }
  }, [state.metric]);

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
    const yourPay = incumbentMetricPay(state.profile, state.metric);
    if (!yourPay) return null;
    if (!matched.length && !matchedBand) return null;
    return analyzeGap(
      matched,
      yourPay,
      state.metric,
      sliceLabelFromProfile(state.profile),
      { matchedBandRecord: matchedBand },
    );
  }, [matched, matchedBand, state.profile, state.metric]);
}

export function useUpdateProfile() {
  const { dispatch } = useApp();
  return useCallback(
    (patch: Partial<IncumbentProfile>) => dispatch({ type: "profile", patch }),
    [dispatch],
  );
}
