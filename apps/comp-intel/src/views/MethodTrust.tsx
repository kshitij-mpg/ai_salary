import { FX_DATE, FX_USD_INR, OBSERVATION_DISCLAIMER, WORLD_BANK_PPP, COUNTRY_FX_TO_INR } from "../lib/constants";
import { formatINR } from "../lib/money";
import { useApp } from "../state";
import { Card, ConfidencePill, Eyebrow, GoldRule } from "../components/ui";
import type { Observation } from "../types";

function gccEntry(rows: Observation[]): Observation | undefined {
  return rows.find(
    (o) =>
      o.pppSuspect &&
      o.sourceName.includes("GCC Nexus") &&
      o.roleName === "AI Engineer" &&
      o.experienceLevel.startsWith("Entry") &&
      o.city === "National",
  );
}

export function MethodTrust() {
  const { state } = useApp();
  const gcc = gccEntry(state.data?.observations ?? []);
  const catalog = state.data?.catalog;

  return (
    <article className="mx-auto max-w-3xl space-y-10">
      <header>
        <Eyebrow>Method & trust</Eyebrow>
        <h1 className="font-display mt-3 text-5xl leading-tight">How to read this atlas without inventing a market.</h1>
        <p className="mt-4 text-sm leading-relaxed text-mute">{OBSERVATION_DISCLAIMER}</p>
      </header>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Grain</h2>
        <p className="text-sm leading-7 text-parchment/90">
          Analytic grain is <strong>Compensation_Observation</strong>. One row is one published salary
          observation from one source for country + city/state + role + experience + pay type. It is
          not a person, not a country summary, not employee-level payroll, and not a ready
          role×country percentile table. Min / median / max live on the same row because they are
          that source’s published range. Blank money fields mean unpublished — never zero.
        </p>
        <p className="text-sm leading-7 text-parchment/90">
          Most US rows are Department of Labor LCA disclosures. Those are employer-location filings,
          not employees. Company-aggregate LCA rows still describe filings, not headcount.
        </p>
      </section>

      <GoldRule />

      <section className="space-y-3">
        <h2 className="font-display text-3xl">FX</h2>
        <p className="text-sm leading-7 text-parchment/90">
          Nominal values are already in INR. Study anchor: <strong>1 USD = ₹{FX_USD_INR}</strong> as of{" "}
          {FX_DATE}. Country FX used for PPP localisation (job country, not source currency):
        </p>
        <ul className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          {Object.entries(COUNTRY_FX_TO_INR).map(([k, v]) => (
            <li key={k} className="rounded-lg border border-white/10 px-3 py-2 tabular">
              {k} · {v}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">PPP formula</h2>
        <p className="text-sm leading-7 text-parchment/90">
          World Bank conversion factor PA.NUS.PPP (latest, as specified). PPP is computed from job
          country, never from the currency the source happened to print.
        </p>
        <pre className="overflow-auto rounded-xl border border-gold/20 bg-ink-100 p-4 text-xs leading-6 text-gold-soft">
{`local_amount = Salary_INR / Country_FX_to_INR[Country_Code]
Salary_PPP_INR_Corrected = local_amount × (PPP_IN / PPP[Country_Code])

Therefore every India row: Salary_PPP_INR_Corrected = Salary_INR`}
        </pre>
        <ul className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
          {Object.entries(WORLD_BANK_PPP).map(([k, v]) => (
            <li key={k} className="rounded-lg border border-white/10 px-3 py-2 tabular">
              PPP {k} · {v}
            </li>
          ))}
        </ul>
        <p className="text-sm leading-7 text-parchment/90">
          Charts labelled PPP use <code>Salary_PPP_INR_Corrected</code> only. The bundled CSV
          column <code>Salary_PPP_INR</code> is already job-country corrected; ingest re-applies the
          same formula as a safety net. India rows published in USD are still tagged{" "}
          <code>PPP_Suspect</code> for transparency.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">India USD PPP (historical bug, fixed in CSV)</h2>
        <p className="text-sm leading-7 text-parchment/90">
          An earlier extract used <code>Salary_INR × (PPP_IN / (PPP_country × row.FX_Rate))</code>.
          When Country = IN and Currency_Original = USD (for example GCC Nexus), rupees were divided
          by 95.43 and PPP collapsed to the USD amount. The bundled{" "}
          <code>data/AI_Salary_Benchmark_ALL.csv</code> now stores job-country PPP (
          <code>Salary_PPP_INR = Salary_INR</code> for every India row).{" "}
          {catalog ? `${catalog.pppSuspectCount} rows` : "Rows"} with Country_Code=IN and
          Currency_Original=USD remain marked <code>PPP_Suspect</code>.
        </p>
        {gcc ? (
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <div className="kbd-chip">Salary_INR</div>
              <div className="mt-2 font-display text-3xl tabular">{formatINR(gcc.salaryInr)}</div>
            </Card>
            <Card>
              <div className="kbd-chip">Salary_PPP_INR (CSV)</div>
              <div className="mt-2 font-display text-3xl tabular text-teal-bright">
                {formatINR(gcc.salaryPppInr)}
              </div>
            </Card>
            <Card>
              <div className="kbd-chip">Corrected PPP</div>
              <div className="mt-2 font-display text-3xl tabular text-teal-bright">
                {formatINR(gcc.salaryPppInrCorrected)}
              </div>
            </Card>
          </div>
        ) : null}
        <p className="text-xs text-mute">
          Example: GCC Nexus AI Engineer, Entry, National — Salary_INR / CSV PPP / Corrected all
          ₹1,307,391 (was ₹13,700 before the CSV fix).
        </p>
      </section>

      <GoldRule />

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Query rules</h2>
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-7 text-parchment/90">
          <li>Filter Pay_Type first. Default is Base_Salary. Mixing base and TC requires an explicit opt-in and shows a warning.</li>
          <li>Match Country_Code + Role_Family + Experience_Level (+ City when used).</li>
          <li>Do not average across Source_Name. Default charts keep sources separate. “Observation median (not employee median)” is an optional overlay.</li>
          <li>US is ~96% of rows. There is no unweighted global average. Country tiles are equal-weighted by the current like-for-like slice, with n shown.</li>
          <li>Non-US n is small (IN 122, GB 43, AU 26, DE 19, NZ 10, AE 9). n &lt; 30 carries a “directional only” badge.</li>
          <li>Tooltips state that a mark is a source observation, not a person.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-3xl">Confidence legend</h2>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 text-sm">
            <ConfidencePill score="HIGH" /> verified primary or high-coverage filing extract
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ConfidencePill score="MEDIUM" /> secondary citation, modelled range, or thin sample
          </div>
          <div className="flex items-center gap-2 text-sm">
            <ConfidencePill score="LOW" /> use only with extra caution (none in this extract)
          </div>
        </div>
        <p className="text-sm text-mute">
          Confidence is the publisher’s verification band on the row, not a statistical interval.
        </p>
      </section>
    </article>
  );
}
