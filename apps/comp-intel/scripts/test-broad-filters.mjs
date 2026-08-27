/**
 * Regression: "All role family" and "Any Experience" use empty profile fields
 * and must still match observations + market bands.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const obs = JSON.parse(readFileSync(join(root, "public/data/observations.json"), "utf8"));
const bands = JSON.parse(readFileSync(join(root, "public/data/marketBands.json"), "utf8"));

function inSet(selected, value) {
  if (!selected.length) return true;
  return selected.includes(value);
}

function applyFilters(rows, filters) {
  const payTypes = filters.payTypes.length ? filters.payTypes : ["Base"];
  return rows.filter((o) => {
    if (!inSet(filters.countries, o.countryCode)) return false;
    if (!inSet(filters.roleFamilies, o.roleFamily)) return false;
    if (!inSet(filters.roleNames, o.roleName)) return false;
    if (!inSet(filters.experienceLevels, o.experienceLevel)) return false;
    if (payTypes.length && !payTypes.includes(o.payType)) return false;
    return true;
  });
}

function sliceCandidates(bandsList, profile) {
  return bandsList.filter(
    (b) =>
      (!profile.roleFamily || b.roleFamily === profile.roleFamily) &&
      b.payType === profile.payType &&
      b.countryCode === profile.countryCode &&
      (!profile.experienceLevel ||
        b.experienceLevel === profile.experienceLevel ||
        b.experienceLevel === "All Levels (unspecified)"),
  );
}

const profile = {
  countryCode: "US",
  roleFamily: "",
  roleName: "",
  experienceLevel: "",
  payType: "Base",
  city: "",
  metro: "",
};

const filters = {
  countries: [profile.countryCode],
  roleFamilies: profile.roleFamily ? [profile.roleFamily] : [],
  roleNames: [],
  experienceLevels: profile.experienceLevel ? [profile.experienceLevel] : [],
  payTypes: [profile.payType],
};

const matched = applyFilters(obs, filters);
const bandCandidates = sliceCandidates(bands, profile);

let failed = false;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed = true;
  } else {
    console.log("OK:", msg);
  }
}

assert(matched.length > 100, `broad filing slice has rows (got ${matched.length})`);
assert(bandCandidates.length > 10, `broad band slice has rows (got ${bandCandidates.length})`);

const families = new Set(matched.map((o) => o.roleFamily));
assert(families.size > 1, `broad role family includes multiple families (got ${families.size})`);

const levels = new Set(matched.map((o) => o.experienceLevel));
assert(levels.size > 1, `any experience includes multiple levels (got ${levels.size})`);

if (failed) process.exit(1);
console.log("\nAll broad-filter checks passed.");
