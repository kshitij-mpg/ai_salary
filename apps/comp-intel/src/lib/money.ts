/** Indian grouping and compact INR display. Never coerce blank to zero. */

export function isPresent(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n);
}

function groupIndianInt(intStr: string): string {
  const neg = intStr.startsWith("-");
  const digits = neg ? intStr.slice(1) : intStr;
  if (digits.length <= 3) return (neg ? "-" : "") + digits;
  const last3 = digits.slice(-3);
  let rest = digits.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return (neg ? "-" : "") + parts.join(",") + "," + last3;
}

function trimZeros(s: string): string {
  return s.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function formatINR(n: number | null | undefined, opts?: { decimals?: number }): string {
  if (!isPresent(n)) return "—";
  const decimals = opts?.decimals ?? (Math.abs(n) >= 1 && Number.isInteger(n) ? 0 : 2);
  const abs = Math.abs(n);
  const [intPart, decPart] = abs.toFixed(decimals).split(".");
  const grouped = groupIndianInt(intPart);
  const sign = n < 0 ? "−" : "";
  if (decimals === 0 || !decPart || /^0+$/.test(decPart)) return `${sign}₹${grouped}`;
  return `${sign}₹${grouped}.${decPart}`;
}

export function formatCompactINR(n: number | null | undefined): string {
  if (!isPresent(n)) return "—";
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  if (abs >= 1e7) return `${sign}₹${trimZeros((abs / 1e7).toFixed(2))} Cr`;
  if (abs >= 1e5) return `${sign}₹${trimZeros((abs / 1e5).toFixed(1))} L`;
  return formatINR(n);
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function formatDateISO(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const mi = Number(m);
  if (!y || !mi) return iso;
  return `${d} ${months[mi - 1]} ${y}`;
}
