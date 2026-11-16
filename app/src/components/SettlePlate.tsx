import type { Ref } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CopyChip } from "./CopyChip";
import { CountNumber } from "./CountNumber";
import { LedgerStamp } from "./LedgerStamp";
import { RawWindow } from "./RawWindow";
import { Rosette } from "./Rosette";
import { Stamp } from "./Stamp";
import { truncateHash } from "../lib/format";
import { DEVNET } from "../lib/chain";
import type { IntentRecord } from "../lib/walletStore";

export type Outcome =
  | { kind: "offline"; detail: string | null }
  | { kind: "rejected"; raw: unknown; code: string; rule: string; hint: string | null }
  | { kind: "mined"; hash: string; tier: "A" | "B"; blockNumber: number | null };

/**
 * SettlePlate (UI spec §3.5) — the theatrical moment, and every word on it is
 * earned:
 * • mined Tier A — LedgerStamp "Admitted." + frame-hash subline + explorer
 *   link. Rendered ONLY from the gateway's real response hash.
 * • mined Tier B — "Settled." + BLOCK <n> CountUp (700ms) + rosette. Rendered
 *   ONLY after probeDevnetReceipt returns a real blockNumber. No block number
 *   is ever fabricated; a null receipt probe keeps the plate at Tier A.
 * • offline — amber "Nothing was broadcast." (no stamp): the signature, frame
 *   and local verify are real; broadcast is not. Copy verbatim from spec §9.
 * • rejected — red "The mempool refused." + v2 rectangular Stamp + the full
 *   gateway response verbatim in a RawWindow.
 * Exit: 160–180ms ease-in (AnimatePresence in SendScreen).
 */
export function SettlePlate({ outcome, record, reduce, onNewIntent, onExport, onEvidence, onRetry, stampRef }: {
  outcome: Outcome;
  record: IntentRecord | null;
  reduce: boolean;
  onNewIntent: () => void;
  onExport: () => void;
  onEvidence: () => void;
  onRetry: () => void;
  stampRef?: Ref<HTMLDivElement>;
}) {
  const entrance = reduce ? { duration: 0.15 } : { type: "spring" as const, stiffness: 260, damping: 26 };
  const exit = { opacity: 0, y: reduce ? 0 : -6, transition: { duration: 0.17, ease: "easeIn" as const } };

  if (outcome.kind === "mined") {
    const tierB = outcome.tier === "B" && outcome.blockNumber !== null;
    const amountNum = record ? Number.parseFloat(record.amountEth) : null;
    return (
      <motion.div
        className="v3-plate v3-plate-mined"
        role="status"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={exit}
        transition={entrance}
      >
        <div className="v3-plate-rosette" aria-hidden="true" style={{ color: "var(--ember)", opacity: 0.12 }}>
          <Rosette />
        </div>
        <div className="v3-plate-stamp" ref={stampRef}>
          <LedgerStamp
            word={tierB ? "Settled." : "Admitted."}
            subline={tierB
              ? <>BLOCK <CountNumber value={outcome.blockNumber as number} from={0} duration={700} reduce={reduce} /></>
              : truncateHash(outcome.hash, 6, 4)}
            tone="ember"
            width={176}
            delay={reduce ? 0 : 0.05}
          />
        </div>
        <p className="v3-plate-caption">
          {tierB
            ? `block ${outcome.blockNumber} confirmed by the devnet chain — the frame is settled into history.`
            : "the gateway accepted the frame — block confirmation follows on the explorer."}
        </p>
        <div className="v3-plate-rows">
          <div className="v2-irow"><b>amount</b><span>{amountNum !== null && Number.isFinite(amountNum) ? <CountNumber value={amountNum} decimals={4} from={0} duration={600} reduce={reduce} /> : "—"} ETH</span></div>
          <div className="v2-irow"><b>recipient</b><span>{record ? truncateHash(record.recipient) : "—"}</span></div>
          <div className="v2-irow"><b>frame hash</b><span><CopyChip value={outcome.hash} label="Copy frame hash" /></span></div>
          {record && <div className="v2-irow"><b>intent digest</b><span><CopyChip value={record.digest} label="Copy intent digest" /></span></div>}
          <div className="v2-irow"><b>gateway</b><span>{DEVNET.gateway.replace("https://", "")}</span></div>
          <div className="v2-irow"><b>signature</b><span>ML-DSA-44 session key · locally verified before broadcast</span></div>
        </div>
        <div className="v3-plate-actions">
          <a className="button-quiet" href={DEVNET.explorerTx(outcome.hash)} target="_blank" rel="noreferrer" aria-label="Open the frame transaction on the alt-mempool explorer">View on explorer ↗</a>
          <button type="button" className="button-quiet" onClick={onNewIntent} aria-label="Start a new intent">New intent</button>
        </div>
      </motion.div>
    );
  }

  if (outcome.kind === "offline") {
    return (
      <motion.div
        className="v3-plate v3-plate-offline"
        role="status"
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={exit}
        transition={entrance}
      >
        <h3 className="v3-lead-serif" style={{ color: "var(--amber)", textAlign: "center" }}>Nothing was broadcast.</h3>
        <p className="v3-plate-body" style={{ textAlign: "center", margin: "0 auto" }}>
          The gateway did not respond. Your signature, frame, and local verification are real; the network that would admit this frame has been offline since 07 Nov 2026.
        </p>
        {outcome.detail && <p className="v3-plate-detail" style={{ textAlign: "center" }}>fetch: {outcome.detail}</p>}
        <div className="v3-plate-actions">
          <button type="button" className="button-quiet" onClick={onExport} aria-label="Export the signed frame as JSON">Export signed frame (JSON)</button>
          <button type="button" className="button-quiet" onClick={onEvidence} aria-label="Open the Evidence screen">View Evidence →</button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="v3-plate v3-plate-rejected"
      role="status"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={exit}
      transition={entrance}
    >
      <h3 className="v3-lead-serif" style={{ color: "var(--red)", textAlign: "center" }}>The mempool refused.</h3>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Stamp label={`REJECTED · code ${outcome.code}`} detail={outcome.rule} tone="red" />
      </div>
      {outcome.hint && <p className="v3-plate-body" style={{ textAlign: "center", margin: "0 auto" }}>{outcome.hint}</p>}
      <RawWindow title="gateway response · verbatim" value={outcome.raw} />
      <div className="v3-plate-actions">
        <button type="button" className="button-quiet" onClick={onRetry} aria-label="Try the submission again">Try again</button>
      </div>
    </motion.div>
  );
}
