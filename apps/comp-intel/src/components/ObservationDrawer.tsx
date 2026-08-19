import { formatDateISO, formatINR, isPresent } from "../lib/money";
import type { Observation } from "../types";
import { ConfidencePill, Eyebrow, GoldRule } from "./ui";

export function ObservationDrawer({
  row,
  onClose,
}: {
  row: Observation | null;
  onClose: () => void;
}) {
  if (!row) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal aria-labelledby="drawer-title">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close drawer" onClick={onClose} />
      <aside className="relative h-full w-full max-w-lg overflow-auto border-l border-gold/20 bg-ink-50 p-6 shadow-glass">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Eyebrow>Source observation</Eyebrow>
            <h2 id="drawer-title" className="font-display mt-2 text-3xl text-parchment">
              {row.roleName}
            </h2>
            <p className="mt-1 text-sm text-mute">
              {row.country} · {row.city} · {row.experienceLevel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-gold/30 px-3 py-1 text-xs uppercase tracking-widest text-gold-soft"
          >
            Close
          </button>
        </div>
        <GoldRule className="my-5" />
        <p className="text-sm text-mute">
          This is a published compensation observation from <span className="text-gold-soft">{row.sourceName}</span>
          — not a person
          {row.isEmployerFiling ? ", except that US LCA rows are employer-location filings" : ""}.
        </p>
        <dl className="mt-5 space-y-3 text-sm">
          <Row k="Pay type" v={row.payType.replaceAll("_", " ")} />
          <Row k="Salary_INR (nominal)" v={formatINR(row.salaryInr)} />
          <Row k="Salary_PPP_INR (CSV)" v={formatINR(row.salaryPppInr)} />
          <Row k="Salary_PPP_INR_Corrected" v={formatINR(row.salaryPppInrCorrected)} />
          <Row k="PPP_Suspect" v={row.pppSuspect ? "Yes — India row published in USD" : "No"} />
          <Row k="Published min / median / max" v={`${formatINR(row.baseMin)}  /  ${formatINR(row.baseMedian)}  /  ${formatINR(row.baseMax)}`} />
          <Row k="Bonus / equity / TC" v={`${formatINR(row.bonus)}  /  ${formatINR(row.equity)}  /  ${formatINR(row.totalCompensation)}`} />
          <Row k="Original currency" v={row.currencyOriginal || "—"} />
          <Row k="FX" v={row.fxRateMeaning || "—"} />
          <Row k="FX date" v={row.fxConversionDate || "—"} />
          <Row k="Source type" v={row.sourceType || "—"} />
          <Row k="Access" v={row.sourceAccessType || "—"} />
          <Row k="Published" v={formatDateISO(row.publicationDate)} />
          <Row k="Retrieved" v={formatDateISO(row.retrievalDate)} />
          <Row k="Sample" v={isPresent(row.sampleSize) ? String(row.sampleSize) : row.sampleSizeNote || "—"} />
          <div className="flex items-center justify-between gap-4">
            <dt className="text-mute">Confidence</dt>
            <dd>
              <ConfidencePill score={row.confidenceScore} />
            </dd>
          </div>
        </dl>
        {row.sourceUrl ? (
          <a
            href={row.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-block text-sm text-teal-bright underline decoration-teal/40 underline-offset-4"
          >
            Open source URL
          </a>
        ) : null}
        <div className="mt-5">
          <Eyebrow>Notes</Eyebrow>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-parchment/90">{row.notes || "—"}</p>
        </div>
        <p className="mt-6 font-mono text-[10px] text-mute">Record_ID {row.id}</p>
      </aside>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-2">
      <dt className="text-mute">{k}</dt>
      <dd className="max-w-[60%] text-right text-parchment">{v}</dd>
    </div>
  );
}
