import type { ReactNode } from "react";
import { DIRECTIONAL_N, PAY_TYPE_LABEL } from "../lib/constants";
import { formatCompactINR, formatCount, formatINR } from "../lib/money";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="kbd-chip">{children}</div>;
}

export function GoldRule({ className = "" }: { className?: string }) {
  return <div className={`hairline ${className}`} />;
}

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return <div className={`glass rounded-2xl ${padded ? "p-5 md:p-6" : ""} ${className}`}>{children}</div>;
}

export function Kpi({
  label,
  value,
  hint,
  delay = "",
}: {
  label: string;
  value: string;
  hint?: string;
  delay?: string;
}) {
  return (
    <div className={`rise ${delay} min-h-[104px]`}>
      <div className="kbd-chip">{label}</div>
      <div className="mt-2 font-display text-4xl leading-none text-parchment md:text-5xl tabular">{value}</div>
      {hint ? <div className="mt-2 text-xs text-mute">{hint}</div> : null}
    </div>
  );
}

export function NBadge({ n }: { n: number }) {
  const directional = n > 0 && n < DIRECTIONAL_N;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/20 bg-gold/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold-soft">
      <span className="tabular">n={formatCount(n)}</span>
      {directional ? (
        <span className="rounded-full bg-gold/15 px-1.5 py-px text-[9px] text-gold">Directional only</span>
      ) : null}
    </span>
  );
}

export function ConfidencePill({ score }: { score: string }) {
  const tone =
    score === "HIGH"
      ? "border-teal/40 text-teal-bright"
      : score === "MEDIUM"
        ? "border-gold/40 text-gold-soft"
        : "border-rose/40 text-rose";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${tone}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${score === "HIGH" ? "bg-teal-bright" : score === "MEDIUM" ? "bg-gold" : "bg-rose"}`}
        aria-hidden
      />
      {score || "—"}
    </span>
  );
}

export function PayTypeLabel({ type }: { type: string }) {
  return <span>{PAY_TYPE_LABEL[type] ?? type.replaceAll("_", " ")}</span>;
}

export function MixWarning({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      role="status"
      className="rounded-xl border border-rose/40 bg-rose/10 px-4 py-3 text-sm text-parchment"
    >
      You are mixing pay types in one view. Base salary and total compensation are not like-for-like.
      Switch back to a single pay type unless the mix is intentional.
    </div>
  );
}

export function EmptyState({ onReset }: { onReset?: () => void }) {
  return (
    <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-gold/25 px-6 text-center">
      <div className="kbd-chip">No observations in this slice</div>
      <p className="mt-3 max-w-md text-sm text-mute">
        Widen filters — start with pay type, then country, role family, and experience. Blank money
        fields are unpublished, never zero.
      </p>
      {onReset ? (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 rounded-full border border-gold/40 px-4 py-1.5 text-xs uppercase tracking-widest text-gold-soft hover:bg-gold/10"
        >
          Reset to base salary
        </button>
      ) : null}
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/5 ${className}`} />;
}

export function Money({
  n,
  compact = false,
  className = "",
}: {
  n: number | null | undefined;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={`tabular ${className}`} title={formatINR(n)}>
      {compact ? formatCompactINR(n) : formatINR(n)}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-full border border-gold/20 bg-ink-100 p-0.5"
    >
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`rounded-full px-3 py-1 text-xs tracking-wide transition ${
              on ? "bg-gold text-ink" : "text-mute hover:text-parchment"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition ${
        active
          ? "border-gold bg-gold/15 text-gold-soft"
          : "border-white/10 text-mute hover:border-gold/30 hover:text-parchment"
      }`}
    >
      {children}
    </button>
  );
}
