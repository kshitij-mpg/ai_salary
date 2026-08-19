import { useMemo, useState } from "react";
import { DumbbellChart, rowsFromObservations } from "../components/DumbbellChart";
import { Chip, EmptyState, Eyebrow, MixWarning, NBadge } from "../components/ui";
import { AIML_FAMILIES, EXPERIENCE_ORDER, PAY_TYPE_LABEL } from "../lib/constants";
import { formatCount } from "../lib/money";
import { OBSERVATION_DISCLAIMER } from "../lib/constants";
import { useApp } from "../state";

type Mode = "countries" | "roles";

export function RoleComparator() {
  const { state } = useApp();
  const all = state.data?.observations ?? [];
  const catalog = state.data?.catalog;
  const [mode, setMode] = useState<Mode>("countries");
  const [payType, setPayType] = useState("Base_Salary");
  const [experience, setExperience] = useState("Mid Level (3-5 years)");
  const [family, setFamily] = useState("Machine Learning Engineer");
  const [countries, setCountries] = useState<string[]>(["IN", "US", "GB"]);
  const [families, setFamilies] = useState<string[]>(AIML_FAMILIES);
  const [country, setCountry] = useState("IN");
  const mix = false;

  const slice = useMemo(() => {
    return all.filter((o) => {
      if (o.payType !== payType) return false;
      if (o.experienceLevel !== experience) return false;
      if (mode === "countries") {
        if (o.roleFamily !== family) return false;
        if (!countries.includes(o.countryCode)) return false;
      } else {
        if (o.countryCode !== country) return false;
        if (!families.includes(o.roleFamily)) return false;
      }
      return true;
    });
  }, [all, payType, experience, mode, family, countries, country, families]);

  const displayRows = rowsFromObservations(slice).sort((a, b) => (b.fx ?? 0) - (a.fx ?? 0));

  function toggle(list: string[], value: string, cap: number): string[] {
    if (list.includes(value)) return list.filter((x) => x !== value);
    if (list.length >= cap) return list;
    return [...list, value];
  }

  return (
    <div className="space-y-6">
      <div>
        <Eyebrow>Role comparator</Eyebrow>
        <h1 className="font-display mt-2 text-4xl md:text-5xl">FX versus PPP, source by source</h1>
        <p className="mt-2 max-w-2xl text-sm text-mute">
          Compare two or three countries at the same role family and experience, or two or three
          role families in one country. Pay type is locked to a single selection. {OBSERVATION_DISCLAIMER}
        </p>
      </div>

      <div className="glass flex flex-wrap gap-4 rounded-2xl p-4">
        <div className="flex gap-1.5">
          <Chip active={mode === "countries"} onClick={() => setMode("countries")}>
            Countries
          </Chip>
          <Chip active={mode === "roles"} onClick={() => setMode("roles")}>
            Roles
          </Chip>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(catalog?.payTypes ?? []).map((p) => (
            <Chip key={p.name} active={payType === p.name} onClick={() => setPayType(p.name)}>
              {PAY_TYPE_LABEL[p.name] ?? p.name}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {EXPERIENCE_ORDER.map((e) => (
            <Chip key={e} active={experience === e} onClick={() => setExperience(e)}>
              {e.replace(" Level", "").replace(" (unspecified)", "")}
            </Chip>
          ))}
        </div>
      </div>

      {mode === "countries" ? (
        <div className="flex flex-wrap gap-4">
          <div>
            <div className="kbd-chip mb-2">Role family (pick one)</div>
            <div className="flex flex-wrap gap-1.5">
              {(catalog?.roleFamilies ?? []).slice(0, 10).map((r) => (
                <Chip key={r.name} active={family === r.name} onClick={() => setFamily(r.name)}>
                  {r.name}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="kbd-chip mb-2">Countries (max 3)</div>
            <div className="flex flex-wrap gap-1.5">
              {(catalog?.countries ?? []).map((c) => (
                <Chip
                  key={c.code}
                  active={countries.includes(c.code)}
                  onClick={() => setCountries(toggle(countries, c.code, 3))}
                >
                  {c.code}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          <div>
            <div className="kbd-chip mb-2">Country</div>
            <div className="flex flex-wrap gap-1.5">
              {(catalog?.countries ?? []).map((c) => (
                <Chip key={c.code} active={country === c.code} onClick={() => setCountry(c.code)}>
                  {c.code}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <div className="kbd-chip mb-2">Role families (max 3)</div>
            <div className="flex flex-wrap gap-1.5">
              {(catalog?.roleFamilies ?? []).slice(0, 10).map((r) => (
                <Chip
                  key={r.name}
                  active={families.includes(r.name)}
                  onClick={() => setFamilies(toggle(families, r.name, 3))}
                >
                  {r.name}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <NBadge n={slice.length} />
        <span className="text-xs text-mute">{formatCount(new Set(slice.map((o) => o.sourceName)).size)} sources</span>
      </div>
      <MixWarning show={mix} />

      <div className="glass rounded-2xl p-5">
        {slice.length === 0 ? (
          <EmptyState />
        ) : (
          <DumbbellChart rows={displayRows} cap={36} />
        )}
      </div>
    </div>
  );
}
