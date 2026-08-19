import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Observation } from "../types";
import { formatCompactINR, formatCount } from "../lib/money";
import { ConfidencePill, PayTypeLabel } from "./ui";

const COLS = "64px 100px 140px 150px 100px 88px 88px 88px 88px 1.2fr 90px 70px";

export function SourceTable({
  rows,
  onOpen,
}: {
  rows: Observation[];
  onOpen: (id: string) => void;
}) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 14,
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-gold/15">
      <div
        className="grid min-w-[1100px] items-center gap-2 border-b border-gold/15 bg-ink-100 px-3 py-2 text-[10px] uppercase tracking-widest text-mute"
        style={{ gridTemplateColumns: COLS }}
      >
        <span>Country</span>
        <span>City</span>
        <span>Role</span>
        <span>Experience</span>
        <span>Pay type</span>
        <span className="text-right">Min</span>
        <span className="text-right">Median / ₹</span>
        <span className="text-right">Max</span>
        <span className="text-right">PPP corr.</span>
        <span>Source</span>
        <span>Conf.</span>
        <span className="text-right">Sample</span>
      </div>
      <div ref={parentRef} className="h-[min(640px,calc(100vh-280px))] min-w-[1100px] overflow-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
          {virtualizer.getVirtualItems().map((vi) => {
            const o = rows[vi.index]!;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onOpen(o.id)}
                className="absolute left-0 grid w-full items-center gap-2 border-b border-white/5 px-3 text-left text-xs hover:bg-gold/5"
                style={{
                  height: vi.size,
                  transform: `translateY(${vi.start}px)`,
                  gridTemplateColumns: COLS,
                }}
              >
                <span className="text-gold-soft">
                  {o.countryCode}
                  {o.pppSuspect ? (
                    <span className="ml-1 text-[9px] uppercase tracking-wide text-rose">flag</span>
                  ) : null}
                </span>
                <span className="truncate text-mute" title={o.city}>
                  {o.city}
                </span>
                <span className="truncate" title={o.roleName}>
                  {o.roleName}
                </span>
                <span className="truncate text-mute" title={o.experienceLevel}>
                  {o.experienceLevel}
                </span>
                <span>
                  <PayTypeLabel type={o.payType} />
                </span>
                <span className="text-right tabular">{formatCompactINR(o.baseMin)}</span>
                <span className="text-right tabular text-parchment">{formatCompactINR(o.salaryInr)}</span>
                <span className="text-right tabular">{formatCompactINR(o.baseMax)}</span>
                <span className="text-right tabular text-teal-bright">
                  {formatCompactINR(o.salaryPppInrCorrected)}
                </span>
                <span className="truncate text-mute" title={o.sourceName}>
                  {o.sourceName}
                </span>
                <ConfidencePill score={o.confidenceScore} />
                <span className="text-right tabular text-mute">
                  {o.sampleSize != null ? formatCount(o.sampleSize) : "—"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
