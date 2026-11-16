import { motion, useReducedMotion } from "framer-motion";
import { RawWindow } from "../components/RawWindow";
import { Stamp } from "../components/Stamp";
import { StatusChip } from "../components/StatusChip";
import evidenceJson from "../data/demoEvidence.json";
import { useDemoStore } from "../lib/demoStore";
import { truncateHash } from "../lib/format";

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

type Staked = {
  stakeTx?: string;
  stakeExplorerUrl?: string;
  stakeWei: string;
  stakeEth: string;
  stakeRegistry: string;
  stakeReadback: boolean;
  reason: string;
};

/** Capture date derived from the evidence snapshot itself — `07 Nov 2026 · 06:26 IST`. */
const capturedAt = new Date(evidenceJson.generatedAt);
const captureDate = `${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric" }).format(capturedAt)} · ${new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).format(capturedAt)} IST`;

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

/**
 * Evidence (UI spec §6.3) — records/museum, not a wall of red. The three v2 red
 * lanes become a dated editorial timeline of captured findings, one quiet row
 * each: mono date line + entry title + one-line verdict + `CAPTURED ·
 * docs/FINDINGS.md` amber footnote chip + the verbatim raw response in a
 * COLLAPSED RawWindow. Order is chronology: canonical reject → unstaked OOG
 * reject → the stake proof (the one mint entry, serif moment) → staked OOG at
 * both limits. Red appears only on verdict stamps; the page is calm graphite.
 * The closing amber sentence states the frontier once, verbatim. No live
 * fetch, no DEVNET·OFFLINE header chip, no success lane.
 */
export function EvidenceScreen() {
  const setScreen = useDemoStore((state) => state.setScreen);
  const reduce = useReducedMotion();
  const staked = evidenceJson.demo.staked as Staked;
  // formatEth().display strips trailing zeros ("0.024"); the record states 0.0240 exactly.
  const stakeFixed4 = Number(staked.stakeEth).toFixed(4);

  return (
    <motion.section className="screen" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.06 } } }}>
      <motion.div className="screen-heading" variants={fade}>
        <div>
          <p className="eyebrow">EVIDENCE / CAPTURED EXHIBIT</p>
          <h2>What the mempools said</h2>
          <p className="screen-lede">The permanent, honest record of captured admission attempts — labeled history, no simulation, no fake acceptance. Red lives on the verdict stamps only; the page itself stays calm.</p>
        </div>
      </motion.div>

      {/* ---------- THE RECORD — dated editorial timeline ---------- */}
      <motion.div className="v3-recordlist" variants={fade} aria-label="Captured findings, in order">

        {/* 1. Canonical mempool — REJECTED · MAX_VERIFY_GAS */}
        <article className="v3-record" aria-label="Record 1: canonical mempool rejected the frame">
          <p className="v3-record-date">{captureDate}</p>
          <div className="v3-record-titlerow">
            <h3 className="v3-record-title">1. Canonical mempool</h3>
            <Stamp label="REJECTED" detail="rule: MAX_VERIFY_GAS" tone="red" />
          </div>
          <p className="v3-record-verdict">
            <span className="v2-mono">code −32000</span> — Frame transaction prefix gas budget (frames + sig cost) exceeds MAX_VERIFY_GAS.
          </p>
          <RawWindow title="captured response · eth_sendRawTransaction" value={evidenceJson.demo.canonical.raw} defaultOpen={false} />
          <div><StatusChip tone="amber" title="Captured verbatim in docs/FINDINGS.md during the ETHGlobal Mumbai build">CAPTURED · docs/FINDINGS.md</StatusChip></div>
        </article>

        {/* 2. Alt-mempool, unstaked — REJECTED · Out Of Gas */}
        <article className="v3-record" aria-label="Record 2: unstaked alt-mempool rejected the frame">
          <p className="v3-record-date">{captureDate}</p>
          <div className="v3-record-titlerow">
            <h3 className="v3-record-title">2. Alt-mempool, unstaked</h3>
            <Stamp label="REJECTED" detail="Out Of Gas" tone="red" />
          </div>
          <p className="v3-record-verdict">
            <span className="v2-mono">code −32500</span> — {evidenceJson.demo.unstaked.detail ?? "validation frame 0: ran out of gas (Out Of Gas)"}.
          </p>
          <RawWindow title="captured response · eth_sendFrameTransaction" value={evidenceJson.demo.unstaked.raw} defaultOpen={false} />
          <div><StatusChip tone="amber" title="Captured verbatim in docs/FINDINGS.md during the ETHGlobal Mumbai build">CAPTURED · docs/FINDINGS.md</StatusChip></div>
        </article>

        {/* 3. SpikeWallet stake — the one mint entry, serif moment */}
        <article className="v3-record" aria-label="Record 3: SpikeWallet stake mined, registry readback OK">
          <p className="v3-record-date">{captureDate}</p>
          <div className="v3-record-titlerow">
            <h3 className="v3-record-title">3. SpikeWallet stake</h3>
          </div>
          <p className="v3-record-mint">Mined. {stakeFixed4} ETH</p>
          <p className="v3-record-verdict">
            registry readback via <span className="v2-mono">getDepositInfo: OK</span> ·{" "}
            {staked.stakeTx && staked.stakeExplorerUrl && (
              <a href={staked.stakeExplorerUrl} target="_blank" rel="noreferrer" aria-label="Open the stake transaction on the alt-mempool explorer">tx <span className="v2-mono">{truncateHash(staked.stakeTx, 6, 4)}</span> ↗</a>
            )}
          </p>
          <RawWindow
            title="stake proof · getDepositInfo readback"
            value={{
              txHash: staked.stakeTx ?? null,
              explorerUrl: staked.stakeExplorerUrl ?? null,
              stakeWei: staked.stakeWei,
              stakeEth: staked.stakeEth,
              stakeRegistry: staked.stakeRegistry,
              stakeReadback: staked.stakeReadback,
              reason: staked.reason,
            }}
            defaultOpen={false}
          />
          <div><StatusChip tone="amber" title="Captured in docs/FINDINGS.md; stake read back on-chain via getDepositInfo">CAPTURED · registry readback</StatusChip></div>
        </article>

        {/* 4. Alt-mempool, staked — Out Of Gas at BOTH declared limits */}
        <article className="v3-record" aria-label="Record 4: staked alt-mempool still ran out of gas at both limits">
          <p className="v3-record-date">{captureDate}</p>
          <div className="v3-record-titlerow">
            <h3 className="v3-record-title">4. Alt-mempool, staked</h3>
            <Stamp label="Out Of Gas" detail="at BOTH declared limits 3,200,000 and 6,500,000" tone="amber" />
          </div>
          <p className="v3-record-verdict">
            the staked raw responses carry the literal <span className="v2-mono">{evidenceJson.demo.unstaked.detail ?? "validation frame 0: ran out of gas (Out Of Gas)"}</span> — both entries are preserved in docs/FINDINGS.md.
          </p>
          <RawWindow title="captured response · staked attempt" value={evidenceJson.demo.unstaked.raw} defaultOpen={false} />
          <div><StatusChip tone="amber" title="Captured verbatim in docs/FINDINGS.md during the ETHGlobal Mumbai build">CAPTURED · docs/FINDINGS.md</StatusChip></div>
        </article>
      </motion.div>

      {/* ---------- closing amber sentence, stated once ---------- */}
      <motion.div className="v3-evidence-close" variants={fade}>
        <p className="v3-record-close">no admitted, mined PQ frame is claimed — awaiting gateway-to-miner restore (REDEPLOY_RUNBOOK).</p>
      </motion.div>

      <motion.div className="v2-evidence-foot" variants={fade}>
        <button type="button" className="button-quiet" onClick={exportFindings} aria-label="Export the FINDINGS summary as JSON">Export FINDINGS summary (JSON)</button>
        <button type="button" className="button-quiet" onClick={() => setScreen("send")} aria-label="Try a live attempt from the Send screen">Try a live attempt from Send →</button>
      </motion.div>
    </motion.section>
  );
}
