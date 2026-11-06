import { motion } from "framer-motion";
import type { DemoEvidence } from "../lib/evidence";
import type { Screen } from "../lib/demoStore";

export function S0Hero({ evidence, navigate }: { evidence: DemoEvidence; navigate: (screen: Screen) => void }) {
  return <section className="screen hero-screen"><div className="hero-copy"><p className="eyebrow">QDAY / WALLET · EVIDENCE MODE {evidence.mode}</p><motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>{evidence.hero.headline}</motion.h1><p className="hero-subtitle">{evidence.hero.subtitle}</p><blockquote>“{evidence.hero.quote}”</blockquote><div className="hero-actions"><button className="button-primary" onClick={() => navigate("console")}>Enter the console <span>→</span></button><button className="button-quiet" onClick={() => navigate("key")}>Key ceremony</button></div><div className="hero-proof"><span>captured rule</span><strong>{evidence.demo.canonical.rule ?? "UNAVAILABLE"}</strong><span>verify sample</span><strong>{evidence.gas.measuredVerify} gas</strong></div></div><div className="quantum-field" aria-hidden="true">{Array.from({ length: 64 }, (_, index) => <i key={index} style={{ animationDelay: `${(index % 8) * 80}ms` }}/>)}</div></section>;
}
