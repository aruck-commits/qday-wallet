import { motion } from "framer-motion";

export function Stamp({ label, detail, tone = "red", active = true }: { label: string; detail?: string; tone?: "red" | "amber" | "green" | "violet"; active?: boolean }) {
  return <motion.div className={`stamp stamp-${tone} ${active ? "stamp-active" : ""}`} initial={{ opacity: 0, scale: 1.35, rotate: -6 }} animate={{ opacity: active ? 1 : 0.45, scale: 1, rotate: -6 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}><strong>{label}</strong>{detail && <span>{detail}</span>}</motion.div>;
}
