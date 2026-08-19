import type { Filters, Observation } from "../types";

export const defaultFilters = (): Filters => ({
  countries: [],
  roleFamilies: [],
  roleNames: [],
  experienceLevels: [],
  payTypes: ["Base_Salary"],
  sources: [],
  cities: [],
  allowMixPayTypes: false,
  observationMedian: false,
});

function inSet(selected: string[], value: string): boolean {
  if (!selected.length) return true;
  return selected.includes(value);
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

export function mixedPayTypes(rows: Observation[]): boolean {
  const set = new Set(rows.map((o) => o.payType));
  return set.size > 1;
}
