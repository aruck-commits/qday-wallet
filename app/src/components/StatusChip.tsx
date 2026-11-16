import type { ReactNode } from "react";

export type ChipTone = "mint" | "violet" | "red" | "amber" | "neutral";

/** Semantic status chip — the only accent carrier besides dots/stamps (UI spec §6). */
export function StatusChip({ tone = "neutral", title, children }: { tone?: ChipTone; title?: string; children: ReactNode }) {
  return <span className={`v2-chip v2-chip-${tone}`} title={title}>{children}</span>;
}
