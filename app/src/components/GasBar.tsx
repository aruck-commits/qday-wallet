import { motion } from "framer-motion";

export function GasBar({ budget, measured, active }: { budget: string; measured: string; active: boolean }) {
  return <div className="gas-panel"><div className="section-kicker">VERIFY COST / CANONICAL BUDGET</div><div className="gas-values"><strong>{measured}</strong><span>vs</span><b>{budget}</b></div><div className="gas-track"><span className="gas-budget"/><motion.span className={`gas-measured ${active ? "gas-live" : ""}`} initial={{ width: 0 }} animate={{ width: active ? "92%" : "12%" }} transition={{ duration: 0.6 }}/></div><div className="gas-legend"><span><i className="dot dot-red"/>canonical ceiling</span><span><i className="dot dot-cyan"/>registered ML-DSA fast path</span></div></div>;
}
