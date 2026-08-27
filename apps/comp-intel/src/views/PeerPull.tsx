import { useMemo } from "react";

import { useApp, useGapAnalysis } from "../state";

import { Card, EmptyState, SectionTitle } from "../components/ui";

import { topDestinations, topEmployerPulls } from "../lib/analysis";

import { formatCompactINR } from "../lib/money";



export function PeerPull() {

  const { state } = useApp();

  const analysis = useGapAnalysis();



  const employers = useMemo(() => {

    if (!analysis) return [];

    return topEmployerPulls(analysis.aboveYou, analysis.yourPay, analysis.metric, 15);

  }, [analysis]);



  const destinations = useMemo(() => {

    if (!analysis) return [];

    return topDestinations(analysis.aboveYou, analysis.yourPay, analysis.metric);

  }, [analysis]);



  if (!analysis) {

    return (

      <EmptyState

        title="No pull map yet"

        body="Desk needs an incumbent + matched market to list who pays more."

      />

    );

  }



  const cities = destinations.filter((d) => d.kind === "city");

  const metros = destinations.filter((d) => d.kind === "metro");

  const countries = destinations.filter((d) => d.kind === "country");



  return (

    <div className="space-y-8">

      <SectionTitle

        title="Who could pull them?"

        subtitle={`Named employers and geographies from LCA filings paying more than ${state.profile.label}. Competitor attraction by offered base — not confirmed offers.`}

      />



      <div className="grid gap-4 md:grid-cols-3">

        <Card className="p-4">

          <div className="eyebrow">Above-market density</div>

          <div className="mt-2 font-display text-3xl tabular">

            {analysis.competitiveAbovePct.toFixed(0)}%

          </div>

          <p className="mt-1 text-xs text-mute">of matched LCA filings pay more</p>

        </Card>

        <Card className="p-4">

          <div className="eyebrow">Employer pull signals</div>

          <div className="mt-2 font-display text-3xl tabular">{employers.length}</div>

          <p className="mt-1 text-xs text-mute">employer groups above your pay (n≥2)</p>

        </Card>

        <Card className="p-4">

          <div className="eyebrow">Geo pulls</div>

          <div className="mt-2 font-display text-3xl tabular">{cities.length + metros.length}</div>

          <p className="mt-1 text-xs text-mute">cities/metros with premiums</p>

        </Card>

      </div>



      <Card className="p-5">

        <h3 className="font-display text-2xl">Employers likely to pull (LCA filings above your pay)</h3>

        <p className="mt-1 text-xs text-mute">

          Grouped by Employer_Group from DOL LCA disclosures. Ranked by median pay premium vs your package.

        </p>

        <div className="mt-4 overflow-x-auto">

          <table className="w-full min-w-[720px] text-left text-sm">

            <thead className="text-[11px] uppercase tracking-wider text-mute">

              <tr className="border-b border-ink/10">

                <th className="py-2 pr-3">#</th>

                <th className="py-2 pr-3">Employer</th>

                <th className="py-2 pr-3">Roles seen</th>

                <th className="py-2 pr-3 tabular">Filings</th>

                <th className="py-2 pr-3 tabular">Median pay</th>

                <th className="py-2 tabular">Premium vs you</th>

              </tr>

            </thead>

            <tbody>

              {employers.map((e, i) => (

                <tr key={e.employerKey} className="border-b border-ink/5">

                  <td className="py-2.5 pr-3 tabular text-mute">{i + 1}</td>

                  <td className="py-2.5 pr-3 font-medium">{e.employerLabel}</td>

                  <td className="py-2.5 pr-3 text-mute">{e.sampleRoles.join(", ")}</td>

                  <td className="py-2.5 pr-3 tabular">{e.n}</td>

                  <td className="py-2.5 pr-3 tabular">{formatCompactINR(e.medianPay)}</td>

                  <td className="py-2.5 tabular text-crimson">

                    +{formatCompactINR(e.premiumVsYou)} · {e.premiumPct.toFixed(0)}%

                  </td>

                </tr>

              ))}

              {!employers.length ? (

                <tr>

                  <td colSpan={6} className="py-6 text-center text-mute">

                    No employer groups with n≥2 pay more in this slice.

                  </td>

                </tr>

              ) : null}

            </tbody>

          </table>

        </div>

      </Card>



      <div className="grid gap-6 lg:grid-cols-2">

        <Card className="p-5">

          <h3 className="font-display text-2xl">Cities paying more</h3>

          <PullList rows={cities} empty="No multi-filing city premiums above you." />

        </Card>

        <Card className="p-5">

          <h3 className="font-display text-2xl">Metros paying more</h3>

          <PullList rows={metros} empty="No multi-filing metro premiums above you." />

        </Card>

      </div>



      <Card className="p-5">

        <h3 className="font-display text-2xl">Countries</h3>

        <PullList rows={countries} empty="Single-country US LCA slice — no cross-country pull." />

      </Card>

    </div>

  );

}



function PullList({

  rows,

  empty,

}: {

  rows: { key: string; label: string; n: number; medianPay: number; premiumVsYou: number; premiumPct: number }[];

  empty: string;

}) {

  if (!rows.length) return <p className="mt-4 text-sm text-mute">{empty}</p>;

  return (

    <ul className="mt-4 space-y-2">

      {rows.slice(0, 8).map((r) => (

        <li

          key={r.key}

          className="flex items-center justify-between gap-3 rounded-lg border border-ink/8 px-3 py-2 text-sm"

        >

          <div className="min-w-0">

            <div className="truncate font-medium">{r.label}</div>

            <div className="text-[11px] text-mute">n={r.n}</div>

          </div>

          <div className="shrink-0 text-right tabular">

            <div>{formatCompactINR(r.medianPay)}</div>

            <div className="text-[11px] text-crimson">+{r.premiumPct.toFixed(0)}%</div>

          </div>

        </li>

      ))}

    </ul>

  );

}


