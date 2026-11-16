import { formatAgo } from "../lib/format";

/** "updated 12s ago" + manual refresh (wired to refreshLive) — shared by live-data screens. */
export function RefreshLine({ refreshing, refreshedAt, onRefresh, label = "Refresh live reads" }: {
  refreshing: boolean;
  refreshedAt: number | null;
  onRefresh: () => void;
  label?: string;
}) {
  return (
    <div className="v2-refreshline">
      <span className="v2-chip">
        <i className={`v2-dot ${refreshing ? "v2-dot-amber v2-dot-pulse" : "v2-dot-mint"}`} aria-hidden="true" />
        live reads {refreshing ? "refreshing…" : `updated ${formatAgo(refreshedAt)}`}
      </span>
      <button type="button" className="button-quiet" onClick={onRefresh} disabled={refreshing} aria-label={label}>refresh</button>
    </div>
  );
}
