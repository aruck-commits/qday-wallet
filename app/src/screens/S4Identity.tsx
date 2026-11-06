import { EmptyProof } from "../components/EmptyProof";
import { Timeline } from "../components/Timeline";
import { TxChip } from "../components/TxChip";
import type { DemoEvidence } from "../lib/evidence";

export function S4Identity({ evidence }: { evidence: DemoEvidence }) {
  return <section className="screen identity-screen"><div className="identity-hero"><div><p className="eyebrow">S4 · ENSv2 IDENTITY</p><h2>{evidence.ens.name}</h2><span className="owner-chip">OWNER · {evidence.ens.wallet}</span></div><div className="resolution-card"><span className="section-kicker">RESOLUTION STATE</span><strong>REGISTERED</strong><p>Ownership evidence is present; PQ text mutation remains unavailable.</p></div></div><div className="identity-grid"><div><p className="section-kicker">KEY CONTINUITY TIMELINE</p><Timeline items={[{ label: "registration", status: "done", detail: <TxChip value={evidence.ens.registerTx} href={evidence.ens.explorerUrl} label="REGISTER"/> }, { label: "PQ text write", status: "pending", detail: <EmptyProof label="PENDING" reason={evidence.ens.pqWrite.reason}/> }, { label: "key rotation", status: "pending", detail: <EmptyProof label="PENDING" reason={evidence.ens.rotation.reason}/> } ]}/></div><div className="pq-record"><p className="section-kicker">PQ RECORD / text/pq-key</p><EmptyProof label="UNAVAILABLE" reason={evidence.ens.pqWrite.reason}/><p className="identity-caption">The name never moved; the missing write is shown as a limitation, not a fabricated record.</p></div></div></section>;
}
