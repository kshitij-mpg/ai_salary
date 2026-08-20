import type { Filters, IncumbentProfile, Observation } from "../types";

export const defaultFilters = (): Filters => ({
  countries: [],
  roleFamilies: [],
  roleNames: [],
  experienceLevels: [],
  payTypes: ["Base_Salary"],
  sources: [],
  cities: [],
  allowMixPayTypes: false,
});

function inSet(selected: string[], value: string): boolean {
  if (!selected.length) return true;
  return selected.includes(value);
}

export function filtersFromProfile(p: IncumbentProfile): Filters {
  return {
    countries: p.countryCode ? [p.countryCode] : [],
    roleFamilies: p.roleFamily ? [p.roleFamily] : [],
    roleNames: p.roleName ? [p.roleName] : [],
    experienceLevels: p.experienceLevel ? [p.experienceLevel] : [],
    payTypes: [p.payType],
    sources: [],
    cities: p.city ? [p.city] : [],
    allowMixPayTypes: false,
  };
}

export function applyFilters(rows: Observation[], filters: Filters): Observation[] {
  const payTypes = filters.allowMixPayTypes
    ? filters.payTypes.length
      ? filters.payTypes
      : []
    : filters.payTypes.length
      ? filters.payTypes
      : ["Base_Salary"];

  return rows.filter((o) => {
    if (!inSet(filters.countries, o.countryCode)) return false;
    if (!inSet(filters.roleFamilies, o.roleFamily)) return false;
    if (!inSet(filters.roleNames, o.roleName)) return false;
    if (!inSet(filters.experienceLevels, o.experienceLevel)) return false;
    if (payTypes.length && !payTypes.includes(o.payType)) return false;
    if (!inSet(filters.sources, o.sourceName)) return false;
    if (!inSet(filters.cities, o.city)) return false;
    return true;
  });
}

/**
 * Progressive match: prefer exact slice; if thin, relax city then experience
 * "All Levels" fallback so the desk still answers.
 */
export function matchMarket(
  rows: Observation[],
  profile: IncumbentProfile,
): { matched: Observation[]; relaxNotes: string[] } {
  const relaxNotes: string[] = [];
  const base: Filters = {
    countries: profile.countryCode ? [profile.countryCode] : [],
    roleFamilies: profile.roleFamily ? [profile.roleFamily] : [],
    roleNames: profile.roleName ? [profile.roleName] : [],
    experienceLevels: profile.experienceLevel ? [profile.experienceLevel] : [],
    payTypes: [profile.payType],
    sources: [],
    cities: profile.city ? [profile.city] : [],
    allowMixPayTypes: false,
  };

  let matched = applyFilters(rows, base);
  if (matched.length >= 8) return { matched, relaxNotes };

  if (profile.city) {
    matched = applyFilters(rows, { ...base, cities: [] });
    relaxNotes.push("City filter relaxed — national / multi-city slice.");
    if (matched.length >= 8) return { matched, relaxNotes };
  }

  if (profile.roleName) {
    matched = applyFilters(rows, { ...base, cities: [], roleNames: [] });
    relaxNotes.push("Specific role title relaxed — using role family.");
    if (matched.length >= 8) return { matched, relaxNotes };
  }

  if (profile.experienceLevel && !profile.experienceLevel.startsWith("All")) {
    const withAll = applyFilters(rows, {
      ...base,
      cities: [],
      roleNames: profile.roleName ? [] : base.roleNames,
      experienceLevels: [profile.experienceLevel, "All Levels (unspecified)"],
    });
    if (withAll.length > matched.length) {
      matched = withAll;
      relaxNotes.push("Included “All Levels (unspecified)” observations.");
    }
  }

  if (matched.length < 5 && profile.roleFamily) {
    matched = applyFilters(rows, {
      countries: base.countries,
      roleFamilies: base.roleFamilies,
      roleNames: [],
      experienceLevels: [],
      payTypes: base.payTypes,
      sources: [],
      cities: [],
      allowMixPayTypes: false,
    });
    relaxNotes.push("Experience relaxed — family × country × pay type only.");
  }

  return { matched, relaxNotes };
}

export function mixedPayTypes(rows: Observation[]): boolean {
  return new Set(rows.map((o) => o.payType)).size > 1;
}
