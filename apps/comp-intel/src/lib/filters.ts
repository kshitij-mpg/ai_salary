import type {
  Filters,
  IncumbentProfile,
  MarketBandRecord,
  Observation,
} from "../types";
import { GEO_THRESHOLDS } from "./constants";

export const defaultFilters = (): Filters => ({
  countries: [],
  roleFamilies: [],
  roleNames: [],
  experienceLevels: [],
  payTypes: ["Base"],
  sources: [],
  cities: [],
  metros: [],
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
    metros: p.metro ? [p.metro] : [],
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
      : ["Base"];

  return rows.filter((o) => {
    if (!inSet(filters.countries, o.countryCode)) return false;
    if (!inSet(filters.roleFamilies, o.roleFamily)) return false;
    if (!inSet(filters.roleNames, o.roleName)) return false;
    if (!inSet(filters.experienceLevels, o.experienceLevel)) return false;
    if (payTypes.length && !payTypes.includes(o.payType)) return false;
    if (!inSet(filters.sources, o.sourceName)) return false;
    if (!inSet(filters.cities, o.city)) return false;
    if (!inSet(filters.metros, o.metro)) return false;
    return true;
  });
}

/**
 * Progressive match on LCA filings: prefer exact slice; relax city/metro/title/experience.
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
    metros: profile.metro ? [profile.metro] : [],
    allowMixPayTypes: false,
  };

  let matched = applyFilters(rows, base);
  if (matched.length >= 8) return { matched, relaxNotes };

  if (profile.city || profile.metro) {
    matched = applyFilters(rows, { ...base, cities: [], metros: [] });
    relaxNotes.push("City/metro filter relaxed — broader geography slice.");
    if (matched.length >= 8) return { matched, relaxNotes };
  }

  if (profile.roleName) {
    matched = applyFilters(rows, { ...base, cities: [], metros: [], roleNames: [] });
    relaxNotes.push("Specific role title relaxed — using role family.");
    if (matched.length >= 8) return { matched, relaxNotes };
  }

  if (profile.experienceLevel && !profile.experienceLevel.startsWith("All")) {
    const withAll = applyFilters(rows, {
      ...base,
      cities: [],
      metros: [],
      roleNames: profile.roleName ? [] : base.roleNames,
      experienceLevels: [profile.experienceLevel, "All Levels (unspecified)"],
    });
    if (withAll.length > matched.length) {
      matched = withAll;
      relaxNotes.push("Included “All Levels (unspecified)” filings.");
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
      metros: [],
      allowMixPayTypes: false,
    });
    relaxNotes.push("Experience relaxed — family × country × pay type only.");
  }

  return { matched, relaxNotes };
}

function sliceCandidates(bands: MarketBandRecord[], profile: IncumbentProfile): MarketBandRecord[] {
  return bands.filter(
    (b) =>
      (!profile.roleFamily || b.roleFamily === profile.roleFamily) &&
      b.payType === profile.payType &&
      b.countryCode === profile.countryCode &&
      (!profile.experienceLevel ||
        b.experienceLevel === profile.experienceLevel ||
        b.experienceLevel === "All Levels (unspecified)"),
  );
}

function preferExactExperience(
  candidates: MarketBandRecord[],
  profile: IncumbentProfile,
): MarketBandRecord[] {
  if (!profile.experienceLevel) return candidates;
  const exact = candidates.filter((b) => b.experienceLevel === profile.experienceLevel);
  return exact.length ? exact : candidates.filter((b) => b.experienceLevel === "All Levels (unspecified)");
}

/**
 * Pre-aggregated market band lookup with geography fallback:
 * City (n≥5) → Metro (n≥10) → State (n≥15) → National (n≥30).
 */
export function matchMarketBand(
  bands: MarketBandRecord[],
  profile: IncumbentProfile,
): { band: MarketBandRecord | null; relaxNotes: string[] } {
  const relaxNotes: string[] = [];
  const candidates = preferExactExperience(sliceCandidates(bands, profile), profile);
  if (!candidates.length) return { band: null, relaxNotes };

  const tryPick = (
    level: MarketBandRecord["geographyLevel"],
    predicate: (b: MarketBandRecord) => boolean,
    minN: number,
    note: string,
  ): MarketBandRecord | null => {
    const hits = candidates.filter(
      (b) => b.geographyLevel === level && b.sampleSize >= minN && predicate(b),
    );
    if (!hits.length) return null;
    hits.sort((a, b) => b.sampleSize - a.sampleSize);
    relaxNotes.push(note);
    return hits[0]!;
  };

  if (profile.city) {
    const city = tryPick(
      "City",
      (b) => b.city === profile.city,
      GEO_THRESHOLDS.city,
      `Matched city band (${profile.city}, n≥${GEO_THRESHOLDS.city}).`,
    );
    if (city) return { band: city, relaxNotes };
  }

  if (profile.metro) {
    const metro = tryPick(
      "Metro",
      (b) => b.metro === profile.metro,
      GEO_THRESHOLDS.metro,
      `Matched metro band (${profile.metro}, n≥${GEO_THRESHOLDS.metro}).`,
    );
    if (metro) return { band: metro, relaxNotes };
  }

  const stateFromProfile =
    profile.city || profile.metro
      ? candidates.find(
          (b) =>
            (b.city === profile.city && b.state) ||
            (b.metro === profile.metro && b.state),
        )?.state
      : "";

  if (stateFromProfile) {
    const state = tryPick(
      "State",
      (b) => b.state === stateFromProfile,
      GEO_THRESHOLDS.state,
      `Matched state band (${stateFromProfile}, n≥${GEO_THRESHOLDS.state}).`,
    );
    if (state) return { band: state, relaxNotes };
  }

  const national = tryPick(
    "National",
    () => true,
    GEO_THRESHOLDS.national,
    `Matched national band (n≥${GEO_THRESHOLDS.national}).`,
  );
  if (national) return { band: national, relaxNotes };

  relaxNotes.push("No pre-aggregated band met geography sample thresholds — using filing quantiles.");
  return { band: null, relaxNotes };
}

export function mixedPayTypes(rows: Observation[]): boolean {
  return new Set(rows.map((o) => o.payType)).size > 1;
}
