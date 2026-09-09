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

        subtitle={`${PRODUCT_NAME} separates Market Benchmark (what the market pays) from Talent Market Value (what you may need to pay to attract or retain). Geo Premium and Role Compensation Premium are insight-only — never salary multipliers.`}

      />



      <Card className="p-5 text-sm leading-relaxed text-ink/85">

        <p>{OBSERVATION_DISCLAIMER}</p>

      </Card>



      <section className="space-y-3">

        <h2 className="font-display text-3xl">Mode 1 — Talent Market View (default)</h2>

        <p className="text-sm leading-7 text-ink/90">

          Purpose: “What would we likely need to pay today to attract or retain this talent?”

        </p>

        <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-ink/90">

          <li>Match employee to Role Family × Experience Band × Geography → retrieve P25 / P50 / P75 / P90</li>

          <li>

            Market Benchmark = <strong>matched P50</strong> (band already includes role, geography, and

            experience — do not re-apply Geo Premium or CCI)

          </li>

          <li>

            Talent Scarcity Adjustment: Low = 1.00 · Medium = 1.05 · High = 1.10

          </li>

          <li>

            <strong>Talent Market Value</strong> = P50 × Role Demand Adjustment × Scarcity Adjustment

          </li>

          <li>Expected Offer Range = matched P75–P90 (Talent only)</li>

          <li>Retention Risk and Competitive Threat are available in this view only</li>

        </ol>

      </section>



      <section className="space-y-3">

        <h2 className="font-display text-3xl">Mode 2 — Market Benchmark View</h2>

        <p className="text-sm leading-7 text-ink/90">

          Purpose: “What does the market currently pay?”

        </p>

        <p className="text-sm leading-7 text-ink/90">

          <strong>Market Benchmark Value</strong> = matched P50 only. Display Current Salary, P25,

          P50, P75, P90, Market Benchmark Value, Pay Gap %, and Market Position. No demand, scarcity,

          Geo Premium, or CCI multipliers.

        </p>

      </section>



      <section className="space-y-3">

        <h2 className="font-display text-3xl">Mode 3 — FX View</h2>

        <p className="text-sm leading-7 text-ink/90">

          Purpose: “What is the currency equivalent?” FX Value = Current USD salary ×{" "}

          <strong>1 USD = ₹{FX_USD_INR}</strong> ({FX_DATE}). Pure currency conversion. Retention

          Risk, Competitive Threat, and Expected Offer Range are disabled.

        </p>

      </section>



      <section className="space-y-3">

        <h2 className="font-display text-3xl">Mode 4 — PPP View</h2>

        <p className="text-sm leading-7 text-ink/90">

          Purpose: “What is the purchasing power equivalent?” PPP Value = Current USD salary ×{" "}

          <strong>{INDIA_PPP_FACTOR}</strong>. No market adjustments. Retention Risk, Competitive

          Threat, and Expected Offer Range are disabled.

        </p>

        <p className="text-sm leading-7 text-ink/90">{PPP_COMPARISON_DESCRIPTION}</p>

      </section>



      <section className="space-y-3">

        <h2 className="font-display text-3xl">Indian multi-metro cost indices</h2>

        <p className="text-sm leading-7 text-ink/90">

          Target Market Hub Context Selector reads native <code>metros.*</code> INR bands relative to{" "}

          <strong>Bengaluru baseline = 1.00</strong> (same indices as{" "}

          <code>india_tech_roles_benchmark*.csv</code>). Current salary is never re-indexed. PPP mode

          ignores hub scaling (purchasing-power only).

        </p>

        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-ink/90">

          <li>Mumbai (+5% banking/real-estate structure premium) · index 1.05</li>

          <li>Delhi-NCR (−5% hub structural index adjustment) · index 0.95</li>

          <li>Hyderabad (−10% cost premium scaling index) · index 0.90</li>

          <li>Chennai (−15% enterprise systems adjustment) · index 0.85</li>

          <li>Pune (−12% product engineering scaling) · index 0.88</li>

        </ul>

      </section>



      <section className="space-y-3">

        <h2 className="font-display text-3xl">Insight-only indices (not salary multipliers)</h2>

        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-ink/90">

          <li>

            <strong>Geographic Premium</strong> — e.g. index 1.31 → “California pays 31% above the US

            national benchmark.” Market intelligence only; band P50 already reflects geography.

          </li>

          <li>

            <strong>Role Compensation Premium</strong> (formerly CCI as a multiplier) — e.g. index

            1.53 → “Pays 53% above the national Data Scientist benchmark.” Role comparison only.

          </li>

          <li>

            <strong>Role Demand Index</strong> — hiring activity vs other role families (1.00 =

            highest). Explained as a pressure signal; used inside Talent Market Value but not shown as

            a standalone salary multiplier chip.

          </li>

          <li>

            <strong>Talent Scarcity</strong> — Low / Medium / High; difficulty of finding comparable

            talent.

          </li>

        </ul>

      </section>



      <section className="space-y-3">

        <h2 className="font-display text-3xl">Pay gap</h2>

        <p className="text-sm leading-7 text-ink/90">

          Pay Gap % = (Current − Selected Benchmark) / Selected Benchmark × 100. In Market Benchmark

          View, Selected Benchmark = matched P50. Market Position uses band percentiles: Below P25

          Significantly Underpaid · P25–P50 Underpaid · P50–P75 Market Competitive · P75–P90 Highly

          Competitive · Above P90 Market Leading.

        </p>

      </section>



      <section className="space-y-3">

        <h2 className="font-display text-3xl">Retention risk (Talent Market View only)</h2>

        <p className="text-sm leading-7 text-ink/90">

          Retention Score = 40% Pay Gap + 30% Talent Scarcity + 20% Role Demand + 10% Competitor

          Premium. Classify Low / Moderate / High / Critical. Not available in Market Benchmark, FX,

          or PPP views.

        </p>

      </section>



      <section className="space-y-3">

        <h2 className="font-display text-3xl">Competitor offers</h2>

        <p className="text-sm leading-7 text-ink/90">

          CLEANED filings matched on Role Family × Experience × similar Geography. Rank employers by

          compensation. External offer estimates use <strong>P75–P90</strong>, not P50.

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


