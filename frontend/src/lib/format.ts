export function fmt(n: number | null | undefined, d = 2): string {
  if (n == null || isNaN(n)) return "-";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

export function fmtInt(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "-";
  return Math.round(n).toLocaleString("en-US");
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "-";
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function fmtCompact(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "-";
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e8) return `${(n / 1e8).toFixed(0)}억`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e4) return `${(n / 1e4).toFixed(0)}만`;
  return fmtInt(n);
}

export function fmtTurnover(n: number | null | undefined, currency: string): string {
  if (n == null || isNaN(n)) return "-";
  if (currency === "KRW") {
    if (n >= 1e8) return `${(n / 1e8).toFixed(0)}억`;
    if (n >= 1e4) return `${(n / 1e4).toFixed(0)}만`;
    return fmtInt(n);
  }
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${fmtInt(n)}`;
}

export function fmtPrice(n: number | null | undefined, currency: string): string {
  if (n == null || isNaN(n)) return "-";
  const sym = currency === "KRW" ? "₩" : "$";
  if (currency === "KRW") return `${sym}${fmtInt(n)}`;
  return `${sym}${fmt(n, n < 1 ? 4 : 2)}`;
}
