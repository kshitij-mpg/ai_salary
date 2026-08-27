/**
 * World Bank Purchasing Power Parity (PPP) helpers for India-equivalent salary.
 *
 * USD to PPP-adjusted INR conversion uses India's GDP PPP conversion factor
 * (₹ per international dollar), not a market exchange rate.
 */

/** World Bank GDP PPP conversion factor for India (approx. ₹23 per intl $). */
export const INDIA_PPP_FACTOR = 23;

export const PPP_COMPARISON_DESCRIPTION =
  "This comparison uses the World Bank Purchasing Power Parity (PPP) conversion factor for India (₹23 per international dollar) to estimate the equivalent salary required in India for a similar purchasing power and standard of living.";

/**
 * Convert a US salary (USD) to PPP-adjusted India-equivalent INR.
 * Example: convertUsdToPppInr(100_000) === 2_300_000  → ₹23,00,000 / ₹23 lakh
 */
export function convertUsdToPppInr(usdSalary: number): number {
  if (!Number.isFinite(usdSalary)) return NaN;
  return usdSalary * INDIA_PPP_FACTOR;
}
