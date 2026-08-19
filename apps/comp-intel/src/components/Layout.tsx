import type { MetricMode, ViewId } from "../types";
import { FX_DATE, FX_USD_INR, OBSERVATION_DISCLAIMER } from "../lib/constants";
import { useApp } from "../state";
import { Segmented } from "./ui";

const NAV: { id: ViewId; label: string }[] = [
  { id: "brief", label: "Brief" },
  { id: "explorer", label: "Explorer" },
  { id: "compare", label: "Comparator" },
  { id: "studio", label: "Studio" },
  { id: "method", label: "Method" },
  { id: "snapshot", label: "Snapshot" },
];

export function TopBar() {
  const { state, dispatch } = useApp();
  return (
    <header className="no-print sticky top-0 z-40 border-b border-gold/10 bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3 md:px-8">
        <div className="min-w-[160px]">
          <div className="font-display text-xl tracking-wide text-gold-soft">Comp Intel</div>
          <div className="kbd-chip -mt-0.5">AI compensation atlas</div>
        </div>
        <nav className="flex flex-1 flex-wrap items-center justify-center gap-1" aria-label="Primary">
          {NAV.map((item) => {
            const on = state.view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => dispatch({ type: "view", view: item.id })}
                className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-[0.16em] transition ${
                  on ? "bg-gold/15 text-gold-soft" : "text-mute hover:text-parchment"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <Segmented<MetricMode>
            ariaLabel="Salary metric"
            value={state.metric}
            onChange={(metric) => dispatch({ type: "metric", metric })}
            options={[
              { id: "nominal", label: "FX ₹" },
              { id: "ppp", label: "PPP ₹" },
            ]}
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden rounded-full border border-gold/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-gold-soft hover:bg-gold/10 md:inline"
          >
            Print
          </button>
        </div>
      </div>
      <div className="border-t border-white/5 px-4 py-1.5 text-center text-[11px] text-mute md:px-8">
        {state.metric === "ppp"
          ? "PPP uses corrected purchasing-power INR (job country, World Bank PA.NUS.PPP). Bundled CSV PPP matches that formula for India USD rows."
          : `Nominal INR converted at study FX · 1 USD = ₹${FX_USD_INR} as of ${FX_DATE}. Not a people database.`}
      </div>
    </header>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[1600px] px-4 py-8 md:px-8 md:py-10">
      <p className="sr-only">{OBSERVATION_DISCLAIMER}</p>
      {children}
    </main>
  );
}
