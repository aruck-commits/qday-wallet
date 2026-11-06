import type { ReactNode } from "react";

export function LaneCard({ lane, title, accent, active, children }: { lane: string; title: string; accent: "red" | "amber" | "green"; active: boolean; children: ReactNode }) {
  return <article className={`lane-card lane-${accent} ${active ? "lane-active" : ""}`}><header><span className="lane-index">{lane}</span><div><p className="section-kicker">LANE {lane}</p><h3>{title}</h3></div></header>{children}</article>;
}
