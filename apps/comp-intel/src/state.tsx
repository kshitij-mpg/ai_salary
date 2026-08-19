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
import type { Catalog, Filters, MetricMode, Observation, ViewId } from "./types";
import { defaultFilters, applyFilters } from "./lib/filters";

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
  filters: Filters;
  selectedId: string | null;
  briefCountry: string;
}

type Action =
  | { type: "loaded"; data: AppData }
  | { type: "failed"; error: string }
  | { type: "view"; view: ViewId }
  | { type: "metric"; metric: MetricMode }
  | { type: "filters"; filters: Partial<Filters> }
  | { type: "resetFilters" }
  | { type: "select"; id: string | null }
  | { type: "briefCountry"; code: string }
  | { type: "drillCountry"; code: string };

const initial: State = {
  loading: true,
  error: null,
  data: null,
  view: "brief",
  metric: "nominal",
  filters: defaultFilters(),
  selectedId: null,
  briefCountry: "IN",
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
    case "filters":
      return { ...state, filters: { ...state.filters, ...action.filters } };
    case "resetFilters":
      return { ...state, filters: defaultFilters() };
    case "select":
      return { ...state, selectedId: action.id };
    case "briefCountry":
      return { ...state, briefCountry: action.code };
    case "drillCountry":
      return {
        ...state,
        view: "explorer",
        filters: { ...state.filters, countries: [action.code] },
      };
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

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp outside provider");
  return ctx;
}

export function useFiltered(): Observation[] {
  const { state } = useApp();
  return useMemo(() => {
    if (!state.data) return [];
    return applyFilters(state.data.observations, state.filters);
  }, [state.data, state.filters]);
}

export function useSetFilter() {
  const { dispatch } = useApp();
  return useCallback(
    (patch: Partial<Filters>) => dispatch({ type: "filters", filters: patch }),
    [dispatch],
  );
}
