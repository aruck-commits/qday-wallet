/** Number/address formatting for the v2 UI (see specs/UI_SPEC_V2.md §5). */

const ETH_DECIMALS = 18;

/** 4-decimal ETH display, full precision in `.full` for the tooltip. */
export function formatEth(wei: bigint | string | null): { display: string; full: string } | null {
  if (wei === null) return null;
  try {
    const value = typeof wei === "string" ? BigInt(wei) : wei;
    const negative = value < 0n;
    const abs = negative ? -value : value;
    const whole = abs / 10n ** BigInt(ETH_DECIMALS);
    const fraction = (abs % 10n ** BigInt(ETH_DECIMALS)).toString().padStart(ETH_DECIMALS, "0");
    const rounded4 = fraction.slice(0, 4);
    const display = `${negative ? "-" : ""}${whole.toString()}.${rounded4 === "0000" ? "0" : rounded4.replace(/0+$/, "") || "0"}`;
    return { display, full: `${negative ? "-" : ""}${whole.toString()}.${fraction}` };
  } catch {
    return null;
  }
}

/** `0x123456…abcd` — 6 head + 4 tail. */
export function truncateHash(hash: string | null | undefined, head = 6, tail = 4): string {
  if (!hash) return "—";
  const clean = hash.startsWith("0x") ? hash.slice(2) : hash;
  if (clean.length <= head + tail) return hash;
  return `0x${clean.slice(0, head)}…${clean.slice(-tail)}`;
}

/** 2,664,784 — plain thousands grouping (no locale quirks). */
export function formatGas(value: bigint | number | string | null): string {
  if (value === null) return "—";
  try {
    return BigInt(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  } catch {
    return "—";
  }
}

/** 2420 → "2,420 B". */
export function formatBytes(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " B";
}

/** "3 min ago" style stamp for last-refresh. */
export function formatAgo(timestamp: number | null): string {
  if (!timestamp) return "—";
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  return `${Math.round(minutes / 60)} h ago`;
}

/** gwei-precision wei input from a user string like "0.012". */
export function parseEthToWei(input: string): bigint | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{0,9})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  if (whole.length + fraction.length > 24) return null;
  return BigInt(whole + fraction.padEnd(ETH_DECIMALS, "0").slice(0, ETH_DECIMALS));
}
