/** Indian grouping (en-IN) and compact INR display. Never coerce blank to zero. */

const INR_FULL = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const INR_DEC = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

export function isPresent(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n);
}

function trimZeros(s: string): string {
  return s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function formatINR(n: number | null | undefined, opts?: { decimals?: number }): string {
  if (!isPresent(n)) return "—";
  const decimals = opts?.decimals ?? (Math.abs(n) >= 1 && Number.isInteger(n) ? 0 : 2);
  if (decimals === 0) return INR_FULL.format(Math.round(n));
  return INR_DEC.format(n);
}

/** Executive compact form: ₹43.50 Lakh · ₹1.25 Cr (en-IN digit grouping on smaller amounts). */
export function formatCompactINR(n: number | null | undefined): string {
  if (!isPresent(n)) return "—";
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${sign}₹${trimZeros((abs / 1e7).toFixed(2))} Cr`;
  if (abs >= 1e5) return `${sign}₹${trimZeros((abs / 1e5).toFixed(2))} Lakh`;
  return formatINR(n);
}

export function formatPct(n: number | null | undefined, digits = 0): string {
  if (!isPresent(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}
