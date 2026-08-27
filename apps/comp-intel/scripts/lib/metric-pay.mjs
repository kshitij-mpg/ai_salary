/**

 * Shared incumbent metric-pay logic (mirrors src/lib/analysis.ts for Node tests).

 *

 * Current salary is ALWAYS cash FX INR — benchmark mode must not change it.

 * PPP equivalent of current salary is a separate helper used only as the PPP benchmark.

 */

export const FX_USD_INR = 95.43;

export const INDIA_PPP_FACTOR = 23;



export function convertUsdToPppInr(usdSalary) {

  if (!Number.isFinite(usdSalary)) return NaN;

  return usdSalary * INDIA_PPP_FACTOR;

}



export function toAnnualInr(amount, currencyInput, countryCode) {

  if (!Number.isFinite(amount) || amount <= 0) return 0;

  if (currencyInput === "INR") return amount;

  if (currencyInput === "USD") return amount * FX_USD_INR;

  const fx = { IN: 1, US: FX_USD_INR }[countryCode] ?? FX_USD_INR;

  return amount * fx;

}



export function toAnnualUsd(amount, currencyInput, countryCode) {

  if (!Number.isFinite(amount) || amount <= 0) return 0;

  if (currencyInput === "USD") return amount;

  return toAnnualInr(amount, currencyInput, countryCode) / FX_USD_INR;

}



export function salaryPppInrCorrected(salaryInr, countryCode) {

  if (!Number.isFinite(salaryInr) || salaryInr <= 0) return 0;

  if (countryCode === "IN") return salaryInr;

  return convertUsdToPppInr(salaryInr / FX_USD_INR);

}



/** Current salary — always FX. Mode argument ignored (kept for call-site compatibility). */

export function incumbentMetricPay(profile, _metric) {

  const nominalInr =

    profile.currentPayInr ??

    toAnnualInr(profile.rawAmount, profile.currencyInput, profile.countryCode);

  return nominalInr || 0;

}



/** PPP benchmark of current salary (USD × PPP factor). */

export function incumbentPppPay(profile) {

  const nominalInr = incumbentMetricPay(profile);

  if (!nominalInr) return 0;

  if (profile.countryCode === "IN") return nominalInr;

  const usd = toAnnualUsd(profile.rawAmount, profile.currencyInput, profile.countryCode);

  return convertUsdToPppInr(usd);

}



export function selectedBenchmarkValue(mode, p50Fx, record, currentFx) {

  const geo = record?.geographicPremiumIndex > 0 ? record.geographicPremiumIndex : 1;

  const cci =

    record?.compensationCompetitivenessIndex > 0

      ? record.compensationCompetitivenessIndex

      : 1;

  const scarcityKey = String(record?.talentScarcityIndicator ?? "")

    .trim()

    .toLowerCase();

  let scarcity = 1;

  if (scarcityKey === "critical" || scarcityKey === "very high") scarcity = 1.25;

  else if (scarcityKey === "high") scarcity = 1.2;

  else if (scarcityKey === "medium" || scarcityKey === "moderate") scarcity = 1.1;

  const d = record?.roleDemandIndex;

  const demand = d == null || !Number.isFinite(d) || d < 0 ? 1 : d >= 1 ? d : 1 + d;

  const market = Math.round(p50Fx * geo * cci * 100) / 100;

  const talent = Math.round(market * demand * scarcity * 100) / 100;

  const normalized = mode === "nominal" ? "fx" : mode;

  if (normalized === "talent") return talent;

  if (normalized === "market") return market;

  if (normalized === "fx") return Math.round(currentFx * 100) / 100;

  if (normalized === "ppp") {

    return Math.round(convertUsdToPppInr(currentFx / FX_USD_INR) * 100) / 100;

  }

  return p50Fx;

}


