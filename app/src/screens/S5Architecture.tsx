import { motion } from "framer-motion";
import type { DemoEvidence } from "../lib/evidence";

const short = (value: string) => `${value.slice(0, 8)}...${value.slice(-6)}`;

export function S5Architecture({ evidence }: { evidence: DemoEvidence }) {
  const nodes = [{ title: "Noble signer", detail: evidence.protocol.name }, { title: "frame / relayer", detail: `${evidence.protocol.frameMode} / ${evidence.protocol.sigScheme}` }, { title: "MLDSAVerifier", detail: short(evidence.deployments.verifier) }, { title: "QDayWallet", detail: short(evidence.deployments.wallet) }, { title: "ENS / Arkiv", detail: `${evidence.ens.name} / ${evidence.arkiv.schema}` }];
  return <section className="screen architecture-screen"><div className="screen-heading"><div><p className="eyebrow">S5 / ARCHITECTURE / EVIDENCE MAP</p><h2>Intent -&gt; proof -&gt; identity.</h2><p className="screen-lede">The demo boundary is visible: local keys, expensive verification, and public migration evidence.</p></div><span className="unaudited-badge">UNAUDITED CONTRACT STACK</span></div><div className="architecture-flow">{nodes.map((node, index) => <motion.div className="architecture-node" key={node.title} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.08, duration: 0.3 }}><div><span>0{index + 1}</span><strong>{node.title}</strong><small>{node.detail}</small></div>{index < nodes.length - 1 && <b>-&gt;</b>}</motion.div>)}</div><div className="arch-foot"><div><span className="section-kicker">GAS FOOTNOTE</span><strong>{evidence.gas.measuredVerify} measured / {evidence.gas.pinnedRegistered} reference</strong></div><a href="/docs/VULNERABILITIES.md">Read limitations -&gt;</a></div></section>;
}
