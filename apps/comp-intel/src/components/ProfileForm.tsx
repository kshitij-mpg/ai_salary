import { useMemo } from "react";

import { useApp, useUpdateProfile } from "../state";

import {

  COUNTRY_LABEL,

  COUNTRY_ORDER,

  EXPERIENCE_ORDER,

  PAY_TYPE_LABEL,

} from "../lib/constants";

import { Field, inputClass, selectClass, Chip } from "./ui";

import { SalaryInput } from "./SalaryInput";



export function ProfileForm({ compact = false }: { compact?: boolean }) {

  const { state } = useApp();

  const set = useUpdateProfile();

  const catalog = state.data?.catalog;

  if (!catalog) return null;

  const p = state.profile;



  const cities = useMemo(() => {

    return catalog.cities

      .filter((c) => !p.countryCode || c.countryCode === p.countryCode)

      .slice(0, 80);

  }, [catalog.cities, p.countryCode]);



  const metros = useMemo(() => {

    return (catalog.metros ?? [])

      .filter((m) => !p.countryCode || m.countryCode === p.countryCode)

      .slice(0, 60);

  }, [catalog.metros, p.countryCode]);



  const roleNames = useMemo(() => {

    return catalog.roleNames.slice(0, 120);

  }, [catalog.roleNames]);



  const usOnly = catalog.countries.length === 1 && catalog.countries[0]?.code === "US";



  return (

    <div className="space-y-5">

      <SalaryInput />



      {usOnly ? (

        <p className="text-[11px] leading-relaxed text-mute">

          US LCA base-wage data only in this release. India and other countries require separate fact tables.

        </p>

      ) : null}



      <Field label="Incumbent label">

        <input

          className={inputClass}

          value={p.label}

          onChange={(e) => set({ label: e.target.value })}

          placeholder="e.g. Alex · DS Mid · US National"

        />

      </Field>



      <div className={`grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>

        <Field label="Country">

          <select

            className={selectClass}

            value={p.countryCode}

            onChange={(e) => set({ countryCode: e.target.value, city: "", metro: "" })}

          >

            {[...catalog.countries]

              .sort((a, b) => COUNTRY_ORDER.indexOf(a.code) - COUNTRY_ORDER.indexOf(b.code))

              .map((c) => (

                <option key={c.code} value={c.code}>

                  {COUNTRY_LABEL[c.code] ?? c.name} ({c.n.toLocaleString()} filings)

                </option>

              ))}

          </select>

        </Field>



        <Field label="Role family">

          <select

            className={selectClass}

            value={p.roleFamily}

            onChange={(e) => set({ roleFamily: e.target.value, roleName: "" })}

          >

            <option value="">All role family</option>

            {catalog.roleFamilies.map((r) => (

              <option key={r.name} value={r.name}>

                {r.name} ({r.n.toLocaleString()})

              </option>

            ))}

          </select>

        </Field>



        <Field label="Experience">

          <select

            className={selectClass}

            value={p.experienceLevel}

            onChange={(e) => set({ experienceLevel: e.target.value })}

          >

            <option value="">Any Experience</option>

            {[...catalog.experienceLevels]

              .sort(

                (a, b) =>

                  EXPERIENCE_ORDER.indexOf(a.name) - EXPERIENCE_ORDER.indexOf(b.name),

              )

              .map((e) => (

                <option key={e.name} value={e.name}>

                  {e.name} ({e.n.toLocaleString()})

                </option>

              ))}

          </select>

        </Field>



        <Field label="Metro (optional)">

          <select

            className={selectClass}

            value={p.metro}

            onChange={(e) => set({ metro: e.target.value })}

          >

            <option value="">All / national fallback</option>

            {metros.map((m) => (

              <option key={`${m.countryCode}-${m.name}`} value={m.name}>

                {m.name} ({m.n.toLocaleString()})

              </option>

            ))}

          </select>

        </Field>



        <Field label="City (optional)">

          <select

            className={selectClass}

            value={p.city}

            onChange={(e) => set({ city: e.target.value })}

          >

            <option value="">All / national</option>

            {cities.map((c) => (

              <option key={`${c.countryCode}-${c.name}`} value={c.name}>

                {c.name} ({c.n.toLocaleString()})

              </option>

            ))}

          </select>

        </Field>



        <Field label="Role title (optional)">

          <select

            className={selectClass}

            value={p.roleName}

            onChange={(e) => set({ roleName: e.target.value })}

          >

            <option value="">Any title in family</option>

            {roleNames.map((r) => (

              <option key={r.name} value={r.name}>

                {r.name} ({r.n.toLocaleString()})

              </option>

            ))}

          </select>

        </Field>



        <Field label="Pay type">

          <div className="flex flex-wrap gap-1.5">

            {catalog.payTypes.map((pt) => (

              <Chip

                key={pt.name}

                active={p.payType === pt.name}

                onClick={() => set({ payType: pt.name })}

              >

                {PAY_TYPE_LABEL[pt.name] ?? pt.name}

              </Chip>

            ))}

          </div>

        </Field>

      </div>

    </div>

  );

}


