import { AIML_FAMILIES, COUNTRY_LABEL, FX_DATE, FX_USD_INR, OBSERVATION_DISCLAIMER } from "../lib/constants";
import { formatCompactINR, formatCount, formatINR } from "../lib/money";
import { groupSources, median, topRoles } from "../lib/stats";
import { useApp } from "../state";
import { Card, Eyebrow, GoldRule, NBadge } from "../components/ui";
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

export function ClientSnapshot() {
  const { state } = useApp();
  const all = state.data?.observations ?? [];
  const catalog = state.data?.catalog;
  const gcc = gccEntry(all);
  const indiaBase = all.filter((o) => o.countryCode === "IN" && o.payType === "Base_Salary");
  const roles = topRoles(indiaBase, "nominal", 5);
  const usIn = all.filter(
    (o) =>
      o.payType === "Base_Salary" &&
      o.experienceLevel === "Mid Level (3-5 years)" &&
      AIML_FAMILIES.includes(o.roleFamily) &&
      (o.countryCode === "US" || o.countryCode === "IN"),
  );

  return (
    <div className="print-sheet mx-auto max-w-5xl space-y-8">
      <header className="flex items-end justify-between gap-6">
        <div>
          <Eyebrow>Client snapshot</Eyebrow>
          <h1 className="font-display mt-2 text-5xl">Comp Intel · AI pay atlas</h1>
          <p className="mt-3 max-w-xl text-sm text-mute">{OBSERVATION_DISCLAIMER}</p>
        </div>
        <div className="text-right text-xs text-mute">
          <div>FX {FX_DATE}</div>
          <div>1 USD = ₹{FX_USD_INR}</div>
          <div>Retrieval 12–13 Aug 2026</div>
        </div>
      </header>
      <GoldRule />
      <div className="grid grid-cols-4 gap-4">
        <Stat k="Countries" v={formatCount(catalog?.countries.length ?? 0)} />
        <Stat k="Observations" v={formatCount(catalog?.rowCount ?? 0)} />
        <Stat k="US share" v="~96%" />
        <Stat k="PPP flags" v={formatCount(catalog?.pppSuspectCount ?? 0)} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <Eyebrow>India · base salary · top families</Eyebrow>
          <ul className="mt-4 space-y-2 text-sm">
            {roles.map((r) => (
              <li key={r.roleFamily} className="flex justify-between gap-3">
                <span>{r.roleFamily}</span>
                <span className="tabular text-gold-soft">
                  {formatCompactINR(r.observationMedian)} · n={r.n}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-3">
            <NBadge n={indiaBase.length} />
          </div>
        </Card>
        <Card>
          <Eyebrow>US vs India · mid AI/ML · base</Eyebrow>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(["IN", "US"] as const).map((code) => {
              const slice = usIn.filter((o) => o.countryCode === code);
              const sources = groupSources(slice, "nominal");
              return (
                <div key={code}>
                  <div className="font-display text-xl">{COUNTRY_LABEL[code]}</div>
                  <NBadge n={slice.length} />
                  <ul className="mt-2 space-y-1 text-xs">
                    {sources.slice(0, 4).map((g) => (
                      <li key={g.sourceName} className="flex justify-between gap-2">
                        <span className="truncate">{g.sourceName}</span>
                        <span className="tabular">{formatCompactINR(g.medianPublished ?? median(g.values))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {gcc ? (
        <Card>
          <Eyebrow>PPP before / after · GCC Nexus AI Engineer entry</Eyebrow>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-mute">Salary_INR</div>
              <div className="font-display text-3xl tabular">{formatINR(gcc.salaryInr)}</div>
            </div>
            <div>
              <div className="text-xs text-mute">Old PPP</div>
              <div className="font-display text-3xl tabular text-rose">{formatINR(gcc.salaryPppInr)}</div>
            </div>
            <div>
              <div className="text-xs text-mute">Corrected PPP</div>
              <div className="font-display text-3xl tabular text-teal-bright">
                {formatINR(gcc.salaryPppInrCorrected)}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <p className="text-center text-[11px] text-mute">
        Do not present a global average. Non-US samples are directional where n &lt; 30. Default
        views never mix base salary with total compensation.
      </p>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="kbd-chip">{k}</div>
      <div className="mt-1 font-display text-3xl tabular">{v}</div>
    </div>
  );
}
