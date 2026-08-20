import { useMemo, useState } from "react";
import { useApp, useUpdateProfile } from "../state";
import { toAnnualInr } from "../lib/analysis";
import { formatCompactINR, formatINR } from "../lib/money";
import { Chip } from "./ui";

type Currency = "INR" | "USD" | "local";
type UnitMode = "absolute" | "lakh";

const INR_PRESETS_LAKH = [12, 15, 18, 20, 22, 25, 30, 40];
const USD_PRESETS = [80_000, 100_000, 120_000, 150_000, 180_000, 220_000];

function currencySymbol(c: Currency): string {
  if (c === "USD") return "$";
  if (c === "INR") return "₹";
  return "¤";
}

function stepFor(currency: Currency, unit: UnitMode): number {
  if (currency === "USD") return 5_000;
  if (unit === "lakh") return 1;
  return 50_000;
}

/**
 * Hero-scale salary control — primary action in the incumbent filter.
 * Large input, currency chips, unit toggle, steppers, and quick presets.
 */
export function SalaryInput() {
  const { state } = useApp();
  const set = useUpdateProfile();
  const p = state.profile;
  const [unit, setUnit] = useState<UnitMode>(p.currencyInput === "INR" ? "lakh" : "absolute");

  const displayValue = useMemo(() => {
    if (!p.rawAmount) return "";
    if (p.currencyInput === "INR" && unit === "lakh") {
      const lakhs = p.rawAmount / 100_000;
      return Number.isInteger(lakhs) ? String(lakhs) : String(Math.round(lakhs * 100) / 100);
    }
    return String(p.rawAmount);
  }, [p.rawAmount, p.currencyInput, unit]);

  const analyzed = toAnnualInr(p.rawAmount, p.currencyInput, p.countryCode);

  function commitRaw(next: number) {
    set({ rawAmount: Math.max(0, Math.round(next)) });
  }

  function onTyped(raw: string) {
    const cleaned = raw.replace(/,/g, "").trim();
    if (cleaned === "") {
      commitRaw(0);
      return;
    }
    const n = Number(cleaned);
    if (!Number.isFinite(n) || n < 0) return;
    if (p.currencyInput === "INR" && unit === "lakh") {
      commitRaw(n * 100_000);
    } else {
      commitRaw(n);
    }
  }

  function bump(dir: 1 | -1) {
    const step = stepFor(p.currencyInput, unit);
    if (p.currencyInput === "INR" && unit === "lakh") {
      const lakhs = (p.rawAmount || 0) / 100_000;
      commitRaw((lakhs + dir * step) * 100_000);
    } else {
      commitRaw((p.rawAmount || 0) + dir * step);
    }
  }

  function setCurrency(c: Currency) {
    set({ currencyInput: c });
    if (c !== "INR") setUnit("absolute");
    else setUnit("lakh");
  }

  function applyPreset(amount: number, asLakh?: boolean) {
    if (asLakh) commitRaw(amount * 100_000);
    else commitRaw(amount);
  }

  return (
    <section
      className="salary-hero rounded-2xl border-2 border-copper/35 bg-gradient-to-br from-copper/10 via-paper to-paper p-4 shadow-[0_12px_40px_rgba(184,107,58,0.12)]"
      aria-label="What you pay them"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-copper">
            Your offered pay
          </p>
          <p className="mt-1 text-xs text-mute">Edit anytime — gap & risk update live</p>
        </div>
        <div className="rounded-lg bg-ink px-2.5 py-1 text-[11px] font-semibold tabular text-paper">
          {formatCompactINR(analyzed)}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Currency">
        {(
          [
            ["INR", "₹ INR"],
            ["USD", "$ USD"],
            ["local", "Local FX"],
          ] as const
        ).map(([id, label]) => (
          <Chip key={id} active={p.currencyInput === id} onClick={() => setCurrency(id)}>
            {label}
          </Chip>
        ))}
      </div>

      {p.currencyInput === "INR" ? (
        <div className="mt-3 flex rounded-xl border border-ink/10 bg-paper p-1 text-xs font-semibold">
          <button
            type="button"
            className={`flex-1 rounded-lg px-3 py-2 transition ${
              unit === "lakh" ? "bg-ink text-paper" : "text-mute hover:text-ink"
            }`}
            onClick={() => setUnit("lakh")}
          >
            Enter in Lakh
          </button>
          <button
            type="button"
            className={`flex-1 rounded-lg px-3 py-2 transition ${
              unit === "absolute" ? "bg-ink text-paper" : "text-mute hover:text-ink"
            }`}
            onClick={() => setUnit("absolute")}
          >
            Full amount
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex items-stretch gap-2">
        <button
          type="button"
          aria-label="Decrease pay"
          className="flex w-12 shrink-0 items-center justify-center rounded-xl border border-ink/15 bg-paper text-2xl font-semibold text-ink hover:border-copper hover:text-copper"
          onClick={() => bump(-1)}
        >
          −
        </button>

        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-display text-2xl text-copper">
            {currencySymbol(p.currencyInput)}
          </span>
          <input
            type="text"
            inputMode="decimal"
            className="salary-input w-full rounded-xl border-2 border-ink/15 bg-paper py-4 pl-10 pr-16 font-display text-3xl tabular leading-none text-ink outline-none transition focus:border-copper focus:ring-4 focus:ring-copper/20"
            value={displayValue}
            onChange={(e) => onTyped(e.target.value)}
            placeholder={unit === "lakh" && p.currencyInput === "INR" ? "18" : "1800000"}
            aria-label="Annual pay amount"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-wider text-mute">
            {p.currencyInput === "INR" && unit === "lakh" ? "Lakh" : "Annual"}
          </span>
        </div>

        <button
          type="button"
          aria-label="Increase pay"
          className="flex w-12 shrink-0 items-center justify-center rounded-xl border border-ink/15 bg-paper text-2xl font-semibold text-ink hover:border-copper hover:text-copper"
          onClick={() => bump(1)}
        >
          +
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.currencyInput === "INR"
          ? INR_PRESETS_LAKH.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => applyPreset(l, true)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular transition ${
                  Math.abs(p.rawAmount - l * 100_000) < 1
                    ? "border-copper bg-copper text-paper"
                    : "border-ink/10 bg-paper text-ink hover:border-copper/50"
                }`}
              >
                {l}L
              </button>
            ))
          : USD_PRESETS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => applyPreset(u)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold tabular transition ${
                  p.rawAmount === u
                    ? "border-copper bg-copper text-paper"
                    : "border-ink/10 bg-paper text-ink hover:border-copper/50"
                }`}
              >
                ${(u / 1000).toFixed(0)}k
              </button>
            ))}
      </div>

      <div className="mt-3 rounded-xl border border-dashed border-ink/15 bg-ink-50/70 px-3 py-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-mute">
            Analyzed annual (INR)
          </span>
          <span className="font-display text-xl tabular text-ink">{formatINR(analyzed)}</span>
        </div>
        {p.currencyInput !== "INR" ? (
          <p className="mt-1 text-[11px] text-mute">
            Converted with study FX for gap & flight-risk math.
          </p>
        ) : unit === "lakh" ? (
          <p className="mt-1 text-[11px] text-mute">
            {displayValue || "0"} Lakh = {formatCompactINR(analyzed)} cash equivalent.
          </p>
        ) : null}
      </div>
    </section>
  );
}
