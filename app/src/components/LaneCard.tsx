import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function LaneCard({ lane, title, accent, active, children }: { lane: string; title: string; accent: "red" | "amber" | "green"; active: boolean; children: ReactNode }) {
  return <motion.article className={`lane-card lane-${accent} ${active ? "lane-active" : ""}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30, delay: (lane.charCodeAt(0) - 65) * 0.06 }}><header><span className="lane-index">{lane}</span><div><p className="section-kicker">LANE {lane}</p><h3>{title}</h3></div></header>{children}</motion.article>;
}
