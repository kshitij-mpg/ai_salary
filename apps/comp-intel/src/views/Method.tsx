import { Card, SectionTitle } from "../components/ui";
import {
  DIRECTIONAL_N,
  FX_DATE,
  FX_USD_INR,
  OBSERVATION_DISCLAIMER,
  PRODUCT_NAME,
} from "../lib/constants";

export function MethodView() {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <SectionTitle
        title="Method & trust"
        subtitle={`${PRODUCT_NAME} turns published compensation observations into under/over-pay and flight-risk decision aids.`}
      />

      <Card className="p-5 text-sm leading-relaxed text-ink/85">
        <p>{OBSERVATION_DISCLAIMER}</p>
      </Card>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Business questions answered</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-ink/90">
          <li>
            <strong>Under / over?</strong> Compare your annual package to the distribution of matching
            source observations (P10–P90). Gap vs P50 is the headline.
          </li>
          <li>
            <strong>Flight risk?</strong> Score blends gap %, percentile rank, and share of
            observations paying more. Tiers are directional — not attrition forecasts.
          </li>
          <li>
            <strong>To whom?</strong> Rank sources, cities, countries, and industry contexts where
            published pay exceeds yours.
          </li>
          <li>
            <strong>What to do?</strong> Scenarios estimate annual cost to reach P25 / P50 / P75 or a
            custom raise %.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Matching rules</h2>
        <p className="text-sm leading-7 text-ink/90">
          Default slice: country + role family + experience + pay type (+ city / title when set). If
          the sample is thin, the engine progressively relaxes city → title → includes “All Levels”
          → family×country only — and surfaces match notes on Desk.
        </p>
        <p className="text-sm leading-7 text-ink/90">
          n &lt; {DIRECTIONAL_N} is flagged directional. Sources are never silently averaged into one
          “market rate”; Gap Lab keeps per-source medians.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">FX & PPP</h2>
        <p className="text-sm leading-7 text-ink/90">
          Nominal analysis uses <code>Salary_INR</code> with study FX{" "}
          <strong>1 USD = ₹{FX_USD_INR}</strong> ({FX_DATE}). PPP mode uses job-country World Bank
          PA.NUS.PPP factors so cross-border comparisons reflect purchasing power in India terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">What this is not</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-ink/90">
          <li>Not a people database or HRIS payroll extract.</li>
          <li>Not a guarantee that a specific company will make an offer.</li>
          <li>Not legal advice on equal pay / pay transparency statutes.</li>
          <li>US LCA rows are employer-location filings, not employee headcount.</li>
        </ul>
      </section>
    </article>
  );
}
