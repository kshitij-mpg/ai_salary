import type { ReactNode } from "react";
import type { RiskTier, GapVerdict, MarketPosition, PayGapClass, CompetitiveThreatTier } from "../types";
import { RISK_LABEL, VERDICT_LABEL } from "../lib/constants";
import {
  MARKET_POSITION_LABEL,
  PAY_GAP_LABEL,
  THREAT_LABEL,
} from "../lib/marketBenchmark";

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow">{children}</p>;
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`panel ${className}`}>{children}</div>;
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-ink-200/80 ${className}`} />;
}

export function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-xs transition ${
        active
          ? "bg-copper text-paper font-medium"
          : "bg-ink-100 text-mute hover:bg-ink-200 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

export function RiskBadge({ tier, score }: { tier: RiskTier; score?: number }) {
  const tone: Record<RiskTier, string> = {
    critical: "badge-critical",
    high: "badge-high",
    watch: "badge-watch",
    stable: "badge-stable",
    premium: "badge-premium",
  };
  return (
    <span className={`badge ${tone[tier]}`}>
      {RISK_LABEL[tier]}
      {score != null ? ` · ${score}` : ""}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict: GapVerdict }) {
  const tone: Record<GapVerdict, string> = {
    underpaid: "badge-critical",
    at_market: "badge-stable",
    overpaid: "badge-premium",
  };
  return <span className={`badge ${tone[verdict]}`}>{VERDICT_LABEL[verdict]}</span>;
}

export function MarketPositionBadge({ position }: { position: MarketPosition }) {
  const tone: Record<MarketPosition, string> = {
    significantly_underpaid: "badge-critical",
    underpaid: "badge-high",
    market_competitive: "badge-stable",
    highly_competitive: "badge-watch",
    market_leading: "badge-premium",
  };
  return <span className={`badge ${tone[position]}`}>{MARKET_POSITION_LABEL[position]}</span>;
}

export function PayGapBadge({ gapClass }: { gapClass: PayGapClass }) {
  const tone: Record<PayGapClass, string> = {
    critical_underpayment: "badge-critical",
    high_underpayment_risk: "badge-high",
    market_aligned: "badge-stable",
    above_market: "badge-watch",
    significantly_above_market: "badge-premium",
  };
  return <span className={`badge ${tone[gapClass]}`}>{PAY_GAP_LABEL[gapClass]}</span>;
}

export function ThreatBadge({ tier, score }: { tier: CompetitiveThreatTier; score?: number }) {
  const tone: Record<CompetitiveThreatTier, string> = {
    critical: "badge-critical",
    high: "badge-high",
    medium: "badge-watch",
    low: "badge-stable",
  };
  return (
    <span className={`badge ${tone[tier]}`}>
      Threat {THREAT_LABEL[tier]}
      {score != null ? ` · ${score}` : ""}
    </span>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "danger" | "ok" | "warn";
}) {
  const color =
    tone === "danger"
      ? "text-crimson"
      : tone === "ok"
        ? "text-forest"
        : tone === "warn"
          ? "text-amber"
          : "text-ink";
  return (
    <div className="min-w-0">
      <div className="eyebrow">{label}</div>
      <div className={`mt-1 font-display text-2xl tabular leading-none ${color}`}>{value}</div>
      {hint ? <p className="mt-1.5 text-xs text-mute">{hint}</p> : null}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="mb-5">
      <h2 className="font-display text-3xl text-ink leading-tight">{title}</h2>
      {subtitle ? <p className="mt-2 max-w-2xl text-sm text-mute leading-relaxed">{subtitle}</p> : null}
    </header>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-8 text-center">
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-mute">{body}</p>
    </Card>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="eyebrow mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-ink/10 bg-paper px-3 py-2 text-sm text-ink shadow-sm outline-none focus:border-copper/50 focus:ring-2 focus:ring-copper/20";

export const selectClass = inputClass;
