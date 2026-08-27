import { Card, SectionTitle } from "../components/ui";
import {
  DIRECTIONAL_N,
  FX_DATE,
  FX_USD_INR,
  GEO_THRESHOLDS,
  INDIA_PPP_FACTOR,
  OBSERVATION_DISCLAIMER,
  PPP_COMPARISON_DESCRIPTION,
  PRODUCT_NAME,
} from "../lib/constants";

export function MethodView() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SectionTitle
        title="Method & trust"
        subtitle={`${PRODUCT_NAME} recalculates every KPI when you switch benchmark mode. Talent Market is the default hiring/retention value; Market / FX / PPP each use a separate formula.`}
      />

      <Card className="p-5 text-sm leading-relaxed text-ink/85">
        <p>{OBSERVATION_DISCLAIMER}</p>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Mode 1 — Talent Market View (default)</h2>
        <p className="text-sm leading-7 text-ink/90">
          Purpose: “What would I need to pay today to attract or retain this talent?”
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-ink/90">
          <li>
            Market Benchmark = P50 × Geographic Premium Index × Compensation Competitiveness Index
          </li>
          <li>
            Talent Scarcity Multiplier: Low = 1.00 · Medium = 1.10 · High = 1.20
          </li>
          <li>
            <strong>Talent Market Value</strong> = Market Benchmark × Role Demand factor × Scarcity
            Multiplier (highest of all views)
          </li>
          <li>
            Expected Offer Range = P75–P90 × Role Demand × Scarcity (Talent only)
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Mode 2 — Market Benchmark View</h2>
        <p className="text-sm leading-7 text-ink/90">
          Purpose: “How does this employee compare to the market median?”
        </p>
        <p className="text-sm leading-7 text-ink/90">
          <strong>Market Benchmark Value</strong> = P50 × Geographic Premium × Compensation
          Competitiveness. Lower than Talent Market; higher than PPP.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Mode 3 — FX View</h2>
        <p className="text-sm leading-7 text-ink/90">
          Purpose: “What is the direct currency equivalent?” FX Value = Current USD salary ×{" "}
          <strong>1 USD = ₹{FX_USD_INR}</strong> ({FX_DATE}). No scarcity, demand, or competitiveness
          adjustments — pure currency conversion of the incumbent’s pay. Pay gap vs FX benchmark is 0%.
          Current salary display stays at this FX amount in every mode.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Mode 4 — PPP View</h2>
        <p className="text-sm leading-7 text-ink/90">
          Purpose: “What is the purchasing power equivalent?” PPP Value = Current USD salary ×{" "}
          <strong>{INDIA_PPP_FACTOR}</strong>. No market adjustments. Current salary (FX) stays
          unchanged; only the benchmark switches to PPP.
        </p>
        <p className="text-sm leading-7 text-ink/90">{PPP_COMPARISON_DESCRIPTION}</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Pay gap (all modes)</h2>
        <p className="text-sm leading-7 text-ink/90">
          Pay Gap % = (Current − Selected Benchmark) / Selected Benchmark × 100. Selected Benchmark
          changes with the active mode, so gap %, recommendations, and KPIs all refresh.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Retention risk</h2>
        <p className="text-sm leading-7 text-ink/90">
          Retention Score = 40% Pay Gap + 30% Talent Scarcity + 20% Role Demand + 10% Compensation
          Competitiveness — only in Talent Market and Market Benchmark views. FX/PPP show: “Risk
          calculations are benchmark-based and not supported in FX/PPP mode.”
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Expected value hierarchy</h2>
        <p className="text-sm leading-7 text-ink/90">
          For the same employee: Talent Market ≥ Market Benchmark &gt; FX View &gt; PPP View. Absolute
          values must differ across modes.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Data sources</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-ink/90">
          <li>
            <strong>Market bands</strong> —{" "}
            <code>deliverables/analytics_ready/AI_Talent_Benchmark_MARKET_BANDS.csv</code>
          </li>
          <li>
            <strong>Filings (competitors / evidence)</strong> —{" "}
            <code>deliverables/analytics_ready/AI_Talent_Benchmark_CLEANED.csv</code>
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Matching rules</h2>
        <p className="text-sm leading-7 text-ink/90">
          Geography fallback: City (n≥{GEO_THRESHOLDS.city}) → Metro (n≥{GEO_THRESHOLDS.metro}) →
          State (n≥{GEO_THRESHOLDS.state}) → National (n≥{GEO_THRESHOLDS.national}). n &lt;{" "}
          {DIRECTIONAL_N} flagged directional.
        </p>
      </section>
    </article>
  );
}
