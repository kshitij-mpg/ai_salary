import type { ReactNode } from "react";
import { useApp } from "../state";
import type { HubId, TargetPercentile, ViewId } from "../types";
import { PRODUCT_NAME, PRODUCT_TAGLINE, STRATEGIC_TARGET_OPTIONS } from "../lib/constants";
import { HUB_OPTIONS, hubOption } from "../lib/metros";
import { formatCompactINR } from "../lib/money";

const NAV: { id: ViewId; label: string; hint: string }[] = [
  { id: "desk", label: "Desk", hint: "Alignment & gap audit" },
  { id: "gap", label: "Gap Lab", hint: "Market position ladder" },
  { id: "flight", label: "Retention", hint: "Flight risk" },
  { id: "peers", label: "Competitors", hint: "Who would hire them" },
  { id: "scenarios", label: "Scenarios", hint: "Correction cost" },
  { id: "portfolio", label: "Portfolio", hint: "Team risk board" },
  { id: "evidence", label: "Evidence", hint: "Market evidence" },
  { id: "method", label: "Method", hint: "How to trust it" },
];

export function TopBar() {
  const { state, dispatch } = useApp();
  const activeHub = hubOption(state.hub);
  const activeTarget =
    STRATEGIC_TARGET_OPTIONS.find((o) => o.id === state.targetPercentile) ??
    STRATEGIC_TARGET_OPTIONS[1]!;
  const currentFx = state.profile.currentPayInr;

  return (
    <header className="sticky top-0 z-40 border-b border-ink/8 bg-paper/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-4 px-5 py-3 lg:px-8">
        <div className="mr-2 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-xl tracking-tight text-ink">{PRODUCT_NAME}</span>
            <span className="hidden text-[10px] uppercase tracking-[0.2em] text-copper sm:inline">
              India multi-metro
            </span>
          </div>
          <p className="truncate text-xs text-mute">{PRODUCT_TAGLINE}</p>
        </div>

        <nav className="flex min-w-0 flex-1 flex-wrap gap-1" aria-label="Primary">
          {NAV.map((item) => {
            const on = state.view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                title={item.hint}
                onClick={() => dispatch({ type: "view", view: item.id })}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  on ? "bg-ink text-paper" : "text-mute hover:bg-ink-50 hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex flex-col items-end gap-1.5">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <label className="flex min-w-[12rem] flex-col gap-0.5 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mute">
                Active Market Hub Context Selector
              </span>
              <select
                className="rounded-lg border border-ink/15 bg-paper px-2.5 py-1.5 text-xs font-medium text-ink shadow-sm outline-none transition focus:border-copper focus:ring-1 focus:ring-copper/40"
                value={state.hub}
                aria-label="Active Market Hub Context Selector"
                title={`${activeHub.label} · index ${activeHub.multiplier.toFixed(2)} vs Bengaluru`}
                onChange={(e) => dispatch({ type: "hub", hub: e.target.value as HubId })}
              >
                {HUB_OPTIONS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              title="Edit offered pay on Desk"
              onClick={() => dispatch({ type: "view", view: "desk" })}
              className="hidden items-center gap-2 rounded-xl border-2 border-copper/40 bg-copper/10 px-3 py-2 text-left transition hover:border-copper hover:bg-copper/15 md:flex"
            >
              <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-copper">
                Paying
              </span>
              <span className="font-display text-base tabular leading-none text-ink">
                {formatCompactINR(currentFx)}
              </span>
            </button>

            <div className="flex flex-col gap-0.5 text-left">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-mute">
                Strategic Compensation Target
              </span>
              <div
                className="flex rounded-lg border border-ink/10 p-0.5 text-xs"
                role="group"
                aria-label="Strategic Compensation Target"
                title={activeTarget.explanation}
              >
                {STRATEGIC_TARGET_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={state.targetPercentile === opt.id}
                    className={`rounded-md px-2.5 py-1 ${
                      state.targetPercentile === opt.id
                        ? "bg-copper text-paper"
                        : "text-mute hover:text-ink"
                    }`}
                    onClick={() =>
                      dispatch({
                        type: "targetPercentile",
                        targetPercentile: opt.id as TargetPercentile,
                      })
                    }
                    title={`${opt.title} — ${opt.explanation}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="hidden max-w-xl text-right text-[10px] text-mute lg:block">
            <span className="font-medium text-ink/70">{activeHub.shortLabel}</span>
            {" · "}
            <span className="font-medium text-ink/70">{activeTarget.title}</span>
            {" · "}
            {activeTarget.explanation}
          </p>
        </div>
      </div>
    </header>
  );
}

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-8">
      <div className="rise">{children}</div>
    </main>
  );
}
