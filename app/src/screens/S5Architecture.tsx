import type { DemoEvidence } from "../lib/evidence";

export function S5Architecture({ evidence }: { evidence: DemoEvidence }) {
  const nodes = ["Noble signer", "frame / relayer", "MLDSAVerifier", "QDayWallet", "ENS / Arkiv"];
  return <section className="screen architecture-screen"><div className="screen-heading"><div><p className="eyebrow">S5 · ARCHITECTURE</p><h2>Intent → proof → identity.</h2><p className="screen-lede">The demo boundary is visible: local keys, expensive verification, and public migration evidence.</p></div><span className="unaudited-badge">UNAUDITED CONTRACT STACK</span></div><div className="architecture-flow">{nodes.map((node, index) => <div className="architecture-node" key={node}><div><span>0{index + 1}</span><strong>{node}</strong></div>{index < nodes.length - 1 && <b>→</b>}</div>)}</div><div className="arch-foot"><div><span className="section-kicker">GAS FOOTNOTE</span><strong>{evidence.gas.measuredVerify} measured / {evidence.gas.pinnedRegistered} reference</strong></div><a href="/docs/VULNERABILITIES.md">Read limitations ↗</a></div></section>;
}
