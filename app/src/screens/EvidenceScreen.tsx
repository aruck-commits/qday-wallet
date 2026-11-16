import { motion, useReducedMotion } from "framer-motion";
import { RawWindow } from "../components/RawWindow";
import { Stamp } from "../components/Stamp";
import { StatusChip } from "../components/StatusChip";
import evidenceJson from "../data/demoEvidence.json";
import { useDemoStore } from "../lib/demoStore";
import { formatEth, formatGas, truncateHash } from "../lib/format";

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

type StakedExtra = { stakeTx?: string; stakeExplorerUrl?: string };

/** Findings export: {canonical, unstaked, staked, gas} with the raw responses embedded. */
function exportFindings() {
  const payload = {
    exportedAt: new Date().toISOString(),
    canonical: evidenceJson.demo.canonical,
    unstaked: evidenceJson.demo.unstaked,
    staked: evidenceJson.demo.staked,
    gas: evidenceJson.gas,
    source: "docs/FINDINGS.md · app/src/data/demoEvidence.json",
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "qday-findings-summary.json";
  link.click();
  URL.revokeObjectURL(link.href);
}

export function EvidenceScreen() {
  const setScreen = useDemoStore((state) => state.setScreen);
  const reduce = useReducedMotion();
  const staked = evidenceJson.demo.staked as typeof evidenceJson.demo.staked & StakedExtra;

  return (
    <motion.section className="screen" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.06 } } }}>
      <motion.div className="screen-heading" variants={fade}>
        <div>
          <p className="eyebrow">EVIDENCE / CAPTURED EXHIBIT</p>
          <h2>What the mempools said</h2>
          <p className="screen-lede">The permanent, honest record of captured admission attempts — labeled history, no simulation, no fake acceptance. The absence of a green lane is the message.</p>
        </div>
        <div className="v2-refreshline">
          <StatusChip tone="amber">DEVNET · OFFLINE</StatusChip>
          <button type="button" className="button-quiet" onClick={() => setScreen("send")} aria-label="Try a live attempt from the Send screen">Try a live attempt from Send →</button>
        </div>
      </motion.div>

      <motion.article className="v2-lane v2-lane-red" variants={fade} aria-label="Canonical mempool verdict">
        <header className="v2-lane-head">
          <h3>CANONICAL MEMPOOL</h3>
          <StatusChip tone="amber">HISTORY</StatusChip>
          <StatusChip tone="red">DEVNET · OFFLINE</StatusChip>
        </header>
        <div className="v2-lane-body">
          <Stamp label="REJECTED" detail="rule: MAX_VERIFY_GAS" tone="red" />
          <p className="v2-lane-caption">code −32000 — Frame transaction prefix gas budget (frames + sig cost) exceeds MAX_VERIFY_GAS</p>
          <RawWindow title="captured response · eth_sendRawTransaction" value={evidenceJson.demo.canonical.raw} />
          <StatusChip tone="amber">CAPTURED · docs/FINDINGS.md</StatusChip>
        </div>
      </motion.article>

      <motion.article className="v2-lane v2-lane-red" variants={fade} aria-label="Unstaked alt-mempool verdict">
        <header className="v2-lane-head">
          <h3>STANDARD ALT-MEMPOOL · UNSTAKED</h3>
          <StatusChip tone="amber">HISTORY</StatusChip>
          <StatusChip tone="red">DEVNET · OFFLINE</StatusChip>
        </header>
        <div className="v2-lane-body">
          <Stamp label="REJECTED" detail="Out Of Gas" tone="red" />
          <p className="v2-lane-caption">{evidenceJson.demo.unstaked.detail ?? "validation frame 0: ran out of gas (Out Of Gas)"}</p>
          <RawWindow title="captured response · eth_sendFrameTransaction" value={evidenceJson.demo.unstaked.raw} />
          <StatusChip tone="amber">CAPTURED · docs/FINDINGS.md</StatusChip>
        </div>
      </motion.article>

      <motion.article className="v2-lane v2-lane-amber" variants={fade} aria-label="Staked alt-mempool verdict">
        <header className="v2-lane-head">
          <h3>STANDARD ALT-MEMPOOL · STAKED</h3>
          <StatusChip tone="amber">HISTORY</StatusChip>
          <StatusChip tone="red">DEVNET · OFFLINE</StatusChip>
        </header>
        <div className="v2-lane-body">
          <Stamp label="Out Of Gas" detail={`at BOTH declared limits ${formatGas(3_200_000)} and ${formatGas(6_500_000)}`} tone="amber" />
          <p className="v2-lane-caption">
            no admitted, mined PQ frame is claimed. Awaiting gateway-to-miner restore (REDEPLOY_RUNBOOK).
            The staked raw responses carry the literal <span className="v2-mono">validation frame 0: ran out of gas (Out Of Gas)</span> — both entries are preserved in docs/FINDINGS.md.
          </p>
          <RawWindow title="captured response · staked attempt" value={evidenceJson.demo.unstaked.raw} />
          <StatusChip tone="amber">CAPTURED · docs/FINDINGS.md</StatusChip>
        </div>
      </motion.article>

      <motion.article className="v2-lane v2-stakeproof" variants={fade} aria-label="Stake proof">
        <header className="v2-lane-head">
          <h3>STAKE PROOF</h3>
          <StatusChip tone="mint">MINED</StatusChip>
        </header>
        <div className="v2-lane-body">
          <p>
            SpikeWallet stake — mined · {formatEth(staked.stakeWei)?.display ?? staked.stakeEth} ETH · registry {truncateHash(staked.stakeRegistry)} readback via getDepositInfo: OK
            {staked.stakeTx && staked.stakeExplorerUrl && <> · <a href={staked.stakeExplorerUrl} target="_blank" rel="noreferrer">tx {truncateHash(staked.stakeTx)} ↗</a></>}
          </p>
          <StatusChip tone="amber">CAPTURED · registry readback</StatusChip>
        </div>
      </motion.article>

      <motion.div className="v2-evidence-foot" variants={fade}>
        <StatusChip tone="amber">HISTORY — no live fetch on this screen</StatusChip>
        <button type="button" className="button-quiet" onClick={exportFindings} aria-label="Export the FINDINGS summary as JSON">Export FINDINGS summary (JSON)</button>
      </motion.div>
    </motion.section>
  );
}
