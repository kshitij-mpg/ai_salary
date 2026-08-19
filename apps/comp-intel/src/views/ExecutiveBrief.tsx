import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AIML_FAMILIES, COUNTRY_LABEL, FX_DATE, FX_USD_INR, OBSERVATION_DISCLAIMER } from "../lib/constants";
import { formatCompactINR, formatCount, formatINR } from "../lib/money";
import { groupSources, median, topRoles } from "../lib/stats";
import { useApp } from "../state";
import { Card, Chip, ConfidencePill, Eyebrow, GoldRule, Kpi, Money, NBadge } from "../components/ui";
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

export function ExecutiveBrief() {
  const { state, dispatch } = useApp();
  const all = state.data?.observations ?? [];
  const catalog = state.data?.catalog;
  const metric = state.metric;
  const country = state.briefCountry;

  const countryRows = all.filter((o) => o.countryCode === country && o.payType === "Base_Salary");
  const roles = topRoles(countryRows, metric, 5);

  const usIn = all.filter(
    (o) =>
      o.payType === "Base_Salary" &&
      o.experienceLevel === "Mid Level (3-5 years)" &&
      AIML_FAMILIES.includes(o.roleFamily) &&
      (o.countryCode === "US" || o.countryCode === "IN"),
  );

  const gcc = gccEntry(all);
  const countries = catalog?.countries ?? [];

  const barData = roles.map((r) => ({
    name: r.roleFamily.replace("Machine Learning Engineer", "ML Eng").replace("AI Engineer", "AI Eng"),
    full: r.roleFamily,
    value: r.observationMedian ?? 0,
    n: r.n,
  }));

  return (
    <div>
      <section className="rise pb-10">
        <Eyebrow>Client briefing · source intelligence</Eyebrow>
        <h1 className="font-display mt-4 max-w-4xl text-5xl leading-[0.95] text-parchment md:text-7xl">
          Seven-market AI pay,
          <span className="italic text-gold-soft"> observed</span>
          — not modelled as people.
        </h1>
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-mute md:text-base">
          Every row is a published compensation observation: one source, one role, one location band,
          one pay type. Min / median / max on a row are that source’s published range. This is not a
          people database, not payroll, and not a ready percentile table.
        </p>
        <GoldRule className="mt-8" />
        <div className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-4">
          <Kpi label="Countries" value={formatCount(countries.length)} hint="IN · US · GB · AE · DE · AU · NZ" delay="rise-d1" />
          <Kpi
            label="Observations"
            value={formatCount(catalog?.rowCount ?? 0)}
            hint={`${formatCount(catalog?.countries.find((c) => c.code === "US")?.n ?? 0)} are US — never unweighted global averages`}
            delay="rise-d2"
          />
          <Kpi
            label="Role families"
            value={formatCount(catalog?.roleFamilies.length ?? 0)}
            hint={`${formatCount(catalog?.roleNames.length ?? 0)} standardized role names`}
            delay="rise-d3"
          />
          <Kpi label="As of" value="Aug 2026" hint={`FX 12 Aug 2026 · 1 USD = ₹${FX_USD_INR}`} delay="rise-d4" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          "Grain is Compensation_Observation. One row ≠ one person.",
          "Filter pay type first. Default views are base salary only.",
          "Sources stay separate. We do not average GCC Nexus with AmbitionBox.",
          "PPP charts use the corrected column. India rows equal Salary_INR.",
        ].map((line) => (
          <Card key={line} className="text-sm leading-relaxed text-parchment/90">
            {line}
          </Card>
        ))}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Eyebrow>Top roles snapshot</Eyebrow>
              <h2 className="font-display mt-2 text-3xl">Base salary · {COUNTRY_LABEL[country] ?? country}</h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(catalog?.countries ?? []).map((c) => (
                <Chip
                  key={c.code}
                  active={country === c.code}
                  onClick={() => dispatch({ type: "briefCountry", code: c.code })}
                >
                  {c.code}
                </Chip>
              ))}
            </div>
          </div>
          <p className="mt-2 text-xs text-mute">
            Observation median within this country, base salary only. Sources are not blended into a
            single market rate. n shown per family.
          </p>
          {countryRows.length < 30 ? (
            <div className="mt-3">
              <NBadge n={countryRows.length} />
            </div>
          ) : (
            <div className="mt-3">
              <NBadge n={countryRows.length} />
            </div>
          )}
          <div className="mt-6 h-64">
            {barData.length ? (
              <ResponsiveContainer>
                <BarChart data={barData} layout="vertical" margin={{ left: 12, right: 12 }}>
                  <CartesianGrid stroke="rgba(232,213,163,0.08)" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatCompactINR(Number(v))}
                    stroke="#9a9484"
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis type="category" dataKey="name" width={88} stroke="#9a9484" tick={{ fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: "rgba(201,162,39,0.06)" }}
                    content={({ payload }) => {
                      const d = payload?.[0]?.payload as (typeof barData)[0] | undefined;
                      if (!d) return null;
                      return (
                        <div className="rounded-lg border border-gold/20 bg-ink-100 px-3 py-2 text-xs">
                          <div className="text-gold-soft">{d.full}</div>
                          <div>Observation median {formatINR(d.value)}</div>
                          <div>n={d.n} source observations — not employees.</div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="value" fill="#c9a227" radius={[0, 6, 6, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-mute">No base-salary observations for this country.</p>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-7">
          <Eyebrow>Like-for-like · US vs India</Eyebrow>
          <h2 className="font-display mt-2 text-3xl">Mid-level AI / ML · base vs base</h2>
          <p className="mt-2 text-xs text-mute">
            Pay type Base_Salary · Experience Mid Level (3–5 years) · Role family AI Engineer or
            Machine Learning Engineer. Sources plotted separately. {OBSERVATION_DISCLAIMER}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {(["IN", "US"] as const).map((code) => {
              const slice = usIn.filter((o) => o.countryCode === code);
              const bySource = groupSources(slice, metric);
              return (
                <div key={code} className="rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-display text-2xl text-gold-soft">{COUNTRY_LABEL[code]}</div>
                    <NBadge n={slice.length} />
                  </div>
                  <ul className="mt-4 space-y-3">
                    {bySource.slice(0, 8).map((g) => {
                      const mid = g.medianPublished ?? median(g.values);
                      return (
                        <li key={g.sourceName} className="flex items-start justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <div className="truncate text-parchment" title={g.sourceName}>
                              {g.sourceName}
                            </div>
                            <div className="text-[11px] text-mute">
                              {g.n} observation{g.n === 1 ? "" : "s"}
                              {g.isEmployerFiling ? " · LCA filings" : ""} ·{" "}
                              {g.rows[0]?.roleFamily}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="tabular text-gold-soft">
                              <Money n={mid} compact />
                            </div>
                            {g.n > 1 && g.kind === "observation_set" ? (
                              <div className="text-[10px] text-mute">obs. mid</div>
                            ) : (
                              <div className="text-[10px] text-mute">source</div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {bySource.length > 8 ? (
                    <p className="mt-3 text-[11px] text-mute">{bySource.length - 8} more sources in Explorer.</p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </Card>
      </section>

      {gcc ? (
        <section className="mt-8">
          <Card>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <Eyebrow>PPP correction · worked example</Eyebrow>
                <h2 className="font-display mt-2 text-3xl">GCC Nexus · AI Engineer · Entry · India</h2>
                <p className="mt-2 max-w-2xl text-sm text-mute">
                  Source published USD percentiles; Salary_INR is already FX-converted. Bundled CSV
                  PPP and the ingest safety column both use job country (India), so they equal
                  Salary_INR for every India row.
                </p>
              </div>
              <ConfidencePill score={gcc.confidenceScore} />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-gold/20 p-4">
                <div className="kbd-chip">Salary_INR</div>
                <div className="mt-2 font-display text-4xl tabular">{formatINR(gcc.salaryInr)}</div>
                <div className="mt-1 text-xs text-mute">{formatCompactINR(gcc.salaryInr)}</div>
              </div>
              <div className="rounded-xl border border-teal/40 p-4">
                <div className="kbd-chip">Salary_PPP_INR (CSV)</div>
                <div className="mt-2 font-display text-4xl tabular text-teal-bright">
                  {formatINR(gcc.salaryPppInr)}
                </div>
                <div className="mt-1 text-xs text-mute">Job-country PPP in bundled extract</div>
              </div>
              <div className="rounded-xl border border-teal/40 p-4">
                <div className="kbd-chip">Salary_PPP_INR_Corrected</div>
                <div className="mt-2 font-display text-4xl tabular text-teal-bright">
                  {formatINR(gcc.salaryPppInrCorrected)}
                </div>
                <div className="mt-1 text-xs text-mute">Equals Salary_INR for all India rows</div>
              </div>
            </div>
          </Card>
        </section>
      ) : null}

      <p className="mt-8 text-center text-xs text-mute">
        FX as of {FX_DATE}. US is ~96% of rows — country comparisons in Explorer are equal-weighted
        by the selected like-for-like slice, never a global average.
      </p>
    </div>
  );
}
