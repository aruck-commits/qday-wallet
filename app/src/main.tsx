import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion } from "framer-motion";
import { create } from "zustand";
import evidence from "./data/demoEvidence.json";
import "./style.css";

type Store = { dryRun: boolean; setDryRun: (value: boolean) => void };
const useDemoStore = create<Store>((set) => ({ dryRun: true, setDryRun: (dryRun) => set({ dryRun }) }));
const tabs = ["Hero", "Demo Console", "Wallet Key", "Registry", "Identity", "Architecture"];

function Proof({ label, value }: { label: string; value: string | null }) {
  return <div className="proof"><span>{label}</span><strong>{value ?? "UNAVAILABLE — no fabricated proof"}</strong></div>;
}

function App() {
  const [tab, setTab] = useState(0);
  const { dryRun, setDryRun } = useDemoStore();
  const demo = evidence.demo;
  return <main>
    <header><div className="brand">QDAY / WALLET <small>ML-DSA-44</small></div><div className={dryRun ? "chip dry" : "chip live"}>{dryRun ? "DRY RUN" : "LIVE"}</div><button onClick={() => setDryRun(!dryRun)}>toggle mode</button></header>
    <nav>{tabs.map((name, i) => <button className={tab === i ? "active" : ""} onClick={() => setTab(i)} key={name}>{name}</button>)}</nav>
    <motion.section key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {tab === 0 && <><p className="eyebrow">QUANTUM-SAFE IDENTITY, LIVE MEMPOOL EVIDENCE</p><h1>“The wallet is the identity.”</h1><p>ML-DSA-44 authorization survives the canonical budget by using the standard alt-mempool’s staked path.</p><div className="count">Submission readiness · honest DRY RUN data</div></>}
      {tab === 1 && <><p className="eyebrow">S1 · THE MONEY SHOT</p><h2>Same VERIFY frame. Different admission budgets.</h2><div className="lanes"><Proof label="A · canonical" value={demo.canonical.rule}/><Proof label="B · sidecar, unstaked" value={demo.unstaked.rule}/><Proof label="C · staked sidecar" value={demo.staked.txHash}/></div><div className="gas"><span>canonical verification budget ~100k</span><i /><b>ML-DSA fast path {evidence.gas.measuredVerify} gas</b></div><p className="muted">Raw evidence is preserved in FINDINGS. The staked admission is intentionally unavailable: {demo.staked.reason}</p></>}
      {tab === 2 && <><p className="eyebrow">S2 · KEY CEREMONY</p><h2>Generate, encrypt, retain locally.</h2><p>Keys never leave this browser session in the demo path. Export is intentionally a local ceremony, not a wallet extension prompt.</p><button>Download encrypted key bundle</button></>}
      {tab === 3 && <><p className="eyebrow">S3 · ARKIV REGISTRY</p><h2>Migration passport</h2><Proof label="qday.migration entity" value={evidence.arkiv.entity}/><Proof label="Swarm passport" value={evidence.arkiv.swarmRef}/><p className="muted">No Swarm reference has been observed; the drawer stays unavailable rather than inventing content.</p></>}
      {tab === 4 && <><p className="eyebrow">S4 · ENSv2 IDENTITY</p><h2>{evidence.ens.name}</h2><Proof label="wallet owner" value={evidence.ens.wallet}/>{evidence.ens.explorerUrl && <a href={evidence.ens.explorerUrl}>View registration on Sepolia ↗</a>}<p className="muted">Registration is evidenced. PQ resolver write and rotation remain pending, not implied by the name.</p></>}
      {tab === 5 && <><p className="eyebrow">S5 · ARCHITECTURE</p><h2>Intent → ML-DSA verifier → QDayWallet → identity</h2><div className="arch">Noble signer → frame / relayer → MLDSAVerifier → QDayWallet → ENS + Arkiv</div><p className="muted">Unaudited third-party verifier dependency. Residual risks are documented; this is a hackathon prototype.</p></>}
    </motion.section>
    <footer>Limitations: unaudited verifier · residual risk remains · private keys never leave the session.</footer>
  </main>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
