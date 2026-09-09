import { useState, type ReactNode } from "react";
import type {
  RiskTier,
  GapVerdict,
  MarketPosition,
  PayGapClass,
  CompetitiveThreatTier,
  EvidenceConfidence,
} from "../types";
import { RISK_LABEL, VERDICT_LABEL } from "../lib/constants";
import {
  MARKET_POSITION_LABEL,
  PAY_GAP_LABEL,
  THREAT_LABEL,
} from "../lib/marketBenchmark";
import {
  CONFIDENCE_LABEL,
  CONFIDENCE_TOOLTIP,
  confidenceFromSampleSize,
  evidenceBasedOnLabel,
  evidenceRecordCountLabel,
} from "../lib/evidenceConfidence";
import { formatCompactINR } from "../lib/money";

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

export function ConfidenceBadge({
  confidence,
  n,
  showTitle = true,
}: {
  confidence?: EvidenceConfidence;
  /** If provided, confidence is derived from sample size. */
  n?: number;
  showTitle?: boolean;
}) {
  const level = confidence ?? confidenceFromSampleSize(n ?? 0);
  const tone: Record<EvidenceConfidence, string> = {
    low: "badge-conf-low",
    medium: "badge-conf-medium",
    high: "badge-conf-high",
    very_high: "badge-conf-very-high",
  };
  return (
    <span
      className={`badge ${tone[level]}`}
      title={CONFIDENCE_TOOLTIP}
      aria-label={`${CONFIDENCE_LABEL[level]} confidence. ${CONFIDENCE_TOOLTIP}`}
    >
      {showTitle ? `Confidence: ${CONFIDENCE_LABEL[level]}` : CONFIDENCE_LABEL[level]}
    </span>
  );
}

export type CompetitorEvidenceMeta = {
  roleFamily?: string;
  experience?: string;
  geography?: string;
  sampleRoles?: string[];
};

/** Executive competitor card: offer + evidence language + confidence (no raw n=). */
export function CompetitorEvidenceCard({
  employerLabel,
  estimatedOffer,
  n,
  evidence,
  expandable = true,
}: {
  employerLabel: string;
  estimatedOffer: number;
  n: number;
  evidence?: CompetitorEvidenceMeta;
  expandable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const conf = confidenceFromSampleSize(n);

  return (
    <li className="rounded-lg border border-ink/8 px-3 py-2.5 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-ink">{employerLabel}</div>
          <div className="mt-1.5 eyebrow">Estimated offer</div>
          <div className="mt-0.5 font-display text-xl tabular leading-none text-ink">
            {formatCompactINR(estimatedOffer)}
          </div>
          <p className="mt-2 text-[11px] text-mute" title={CONFIDENCE_TOOLTIP}>
            {evidenceBasedOnLabel(n)}
          </p>
          <div className="mt-1.5">
            <ConfidenceBadge confidence={conf} />
          </div>
        </div>
        {expandable ? (
          <button
            type="button"
            className="shrink-0 text-[11px] font-medium text-copper hover:underline"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
          >
            {open ? "Hide evidence" : "Market evidence"}
          </button>
        ) : null}
      </div>
      {expandable && open ? (
        <dl className="mt-3 grid gap-1.5 border-t border-ink/8 pt-3 text-[11px] text-mute">
          <div className="flex justify-between gap-2">
            <dt>Evidence</dt>
            <dd className="tabular text-ink">{evidenceRecordCountLabel(n)} comparable</dd>
          </div>
          {evidence?.roleFamily ? (
            <div className="flex justify-between gap-2">
              <dt>Role family</dt>
              <dd className="text-right text-ink">{evidence.roleFamily}</dd>
            </div>
          ) : null}
          {evidence?.experience ? (
            <div className="flex justify-between gap-2">
              <dt>Experience</dt>
              <dd className="text-right text-ink">{evidence.experience}</dd>
            </div>
          ) : null}
          {evidence?.geography ? (
            <div className="flex justify-between gap-2">
              <dt>Geography</dt>
              <dd className="text-right text-ink">{evidence.geography}</dd>
            </div>
          ) : null}
          {evidence?.sampleRoles?.length ? (
            <div className="flex justify-between gap-2">
              <dt>Roles seen</dt>
              <dd className="text-right text-ink">{evidence.sampleRoles.slice(0, 3).join(" · ")}</dd>
            </div>
          ) : null}
          <p className="mt-1 leading-relaxed">{CONFIDENCE_TOOLTIP}</p>
        </dl>
      ) : null}
    </li>
  );
}

/** Compact evidence cell for tables (records + confidence badge). */
export function EvidenceCell({ n }: { n: number }) {
  return (
    <div className="space-y-1" title={CONFIDENCE_TOOLTIP}>
      <div className="tabular text-ink">{evidenceRecordCountLabel(n)}</div>
      <ConfidenceBadge n={n} showTitle={false} />
    </div>
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
