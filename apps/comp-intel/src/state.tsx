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
  MetricMode,
  Observation,
  PortfolioPerson,
  ViewId,
} from "./types";
import {
  analyzeGap,
  defaultProfile,
  sliceLabelFromProfile,
  toAnnualInr,
} from "./lib/analysis";
import { STORAGE_PORTFOLIO, STORAGE_PROFILE } from "./lib/constants";
import { matchMarket } from "./lib/filters";

export interface AppData {
  observations: Observation[];
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

function loadProfile(): IncumbentProfile {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILE);
    if (raw) return { ...defaultProfile(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultProfile();
}

function loadPortfolio(): PortfolioPerson[] {
  try {
    const raw = localStorage.getItem(STORAGE_PORTFOLIO);
    if (raw) return JSON.parse(raw) as PortfolioPerson[];
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
  metric: "nominal",
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
      const next = { ...state.profile, ...action.patch };
      if (
        action.patch.rawAmount != null ||
        action.patch.currencyInput != null ||
        action.patch.countryCode != null
      ) {
        next.currentPayInr = toAnnualInr(
          next.rawAmount,
          next.currencyInput,
          next.countryCode,
        );
      }
      return { ...state, profile: next };
    }
    case "setProfile":
      return { ...state, profile: action.profile };
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
      fetch(`${base}data/catalog.json`).then((r) => {
        if (!r.ok) throw new Error(`catalog.json ${r.status}`);
        return r.json();
      }),
    ])
      .then(([observations, catalog]) => dispatch({ type: "loaded", data: { observations, catalog } }))
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
    if (!state.data) return { matched: [] as Observation[], relaxNotes: [] as string[] };
    return matchMarket(state.data.observations, state.profile);
  }, [state.data, state.profile]);
}

export function useGapAnalysis(): GapAnalysis | null {
  const { state } = useApp();
  const { matched } = useMarketMatch();
  return useMemo(() => {
    if (!matched.length || !state.profile.currentPayInr) return null;
    return analyzeGap(
      matched,
      state.profile.currentPayInr,
      state.metric,
      sliceLabelFromProfile(state.profile),
    );
  }, [matched, state.profile, state.metric]);
}

export function useUpdateProfile() {
  const { dispatch } = useApp();
  return useCallback(
    (patch: Partial<IncumbentProfile>) => dispatch({ type: "profile", patch }),
    [dispatch],
  );
}
