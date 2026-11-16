import { Fragment } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CopyChip } from "../components/CopyChip";
import { StatusChip } from "../components/StatusChip";
import evidenceJson from "../data/demoEvidence.json";

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

type Node = {
  title: string;
  lines: string[];
  address?: string;
  offline?: boolean;
};

export function ArchitectureScreen() {
  const reduce = useReducedMotion();
  const nodes: Node[] = [
    {
      title: "Browser signer",
      lines: ["ML-DSA-44 keygen / sign / verify (FIPS 204)", "session-only keys · 2,420 B signatures"],
    },
    {
      title: "Frame tx → sidecar",
      lines: ["EIP-8141 · txType 0x06", "VERIFY (1) + SENDER (2) · ARBITRARY (0x0)", "eth_sendFrameTransaction"],
      offline: true,
    },
    {
      title: "MLDSAVerifier",
      lines: ["third-party · unaudited", "verify 2,664,784 gas (measured)"],
      address: evidenceJson.deployments.verifier,
    },
    {
      title: "QDayWallet",
      lines: ["executePq spends against the intent digest", "precompute registerA + registerT"],
      address: evidenceJson.deployments.wallet,
    },
    {
      title: "ENS / Arkiv",
      lines: ["qdaywallet.eth · pq-key on Sepolia", "qday.migration entity on Rabdi"],
      address: evidenceJson.ens.wallet,
    },
  ];

  return (
    <motion.section className="screen" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.06 } } }}>
      <motion.div className="screen-heading" variants={fade}>
        <div>
          <p className="eyebrow">ARCHITECTURE / REFERENCE MAP</p>
          <h2>How the pieces fit</h2>
          <p className="screen-lede">Intent → proof → identity → mempools → public records, with pinned addresses. Hover or focus a node to copy its address.</p>
        </div>
        <a className="unaudited-badge" href="https://github.com/aruck-commits/qday-wallet/blob/main/docs/VULNERABILITIES.md" target="_blank" rel="noreferrer">UNAUDITED CONTRACT STACK</a>
      </motion.div>

      <motion.div className="v2-arch-flow" variants={fade} aria-label="Architecture flow">
        {nodes.map((node, index) => (
          <FragmentManager key={node.title} showArrow={index < nodes.length - 1} node={node} index={index} />
        ))}
      </motion.div>

      <motion.div className="v2-arch-foot" variants={fade}>
        <div>
          <p className="v2-kicker">GAS FOOTNOTE</p>
          <strong>measured {evidenceJson.gas.measuredVerify} / pinned reference {evidenceJson.gas.pinnedRegistered} · canonical budget {evidenceJson.gas.canonicalBudget} · precompute 5,540,000 + 2,290,000</strong>
        </div>
        <a href="https://github.com/aruck-commits/qday-wallet/blob/main/docs/VULNERABILITIES.md" target="_blank" rel="noreferrer">Read limitations →</a>
      </motion.div>
    </motion.section>
  );
}

/** One node card + the arrow to the next node (arrow hidden on the last). */
function FragmentManager({ node, index, showArrow }: { node: Node; index: number; showArrow: boolean }) {
  return (
    <div className="v2-arch-node">
      <div tabIndex={0}>
        <span className="idx">NODE 0{index + 1}</span>
        <strong>
          {node.title}
          {node.offline && <StatusChip tone="amber" title="Devnet gateway did not respond at last probe — nothing here is live">OFFLINE</StatusChip>}
        </strong>
        {node.lines.map((line) => (
          <small key={line}>{line}</small>
        ))}
        {node.address && <CopyChip value={node.address} label={`Copy ${node.title} address`} />}
      </div>
      {showArrow && <span className="v2-arch-arrow" aria-hidden="true">→</span>}
    </div>
  );
}
