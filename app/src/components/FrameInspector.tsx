import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { IntentRecord } from "../lib/walletStore";
import type { BuiltFrameTx } from "../lib/frame";
import { fingerprintHex } from "../lib/pq";
import { formatBytes, formatEth, formatGas, truncateHash } from "../lib/format";
import { CopyChip } from "./CopyChip";
import { RawWindow } from "./RawWindow";

const hexToBytes = (hex: string): Uint8Array =>
  Uint8Array.from(hex.replace(/^0x/, "").match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? []);

type Row = { label: string; node: ReactNode };

const rowFade = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0 },
};

/**
 * FrameInspector (UI spec §3.4): every data row KEPT — txType 0x06, VERIFY(1)
 * + SENDER(2) frames, ARBITRARY (0x0) violet scheme chip, 2,420 B signature +
 * sha256, intent digest + frame hash CopyChips, wire byte accounting, local
 * verify, wire RawWindow (divider-separated, never a nested card). Rows
 * animate in once with a 40ms stagger when the frame exists. Idle: schema
 * placeholders only — sizes, no hex.
 * `open`/`onToggle` are optional: when onToggle is absent (desktop) the panel
 * is always open; SendScreen passes them only on <768 (accordion mode).
 */
export function FrameInspector({ record, open, onToggle }: {
  record: IntentRecord | null;
  open?: boolean;
  onToggle?: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const wire = record?.wire as { signatures?: { signature?: string }[] } | undefined;
  const signatureHex = wire?.signatures?.[0]?.signature ?? null;
  const [signatureSha, setSignatureSha] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!signatureHex) { setSignatureSha(null); return; }
    void fingerprintHex(hexToBytes(signatureHex)).then((sha) => { if (alive) setSignatureSha(sha); });
    return () => { alive = false; };
  }, [signatureHex]);

  const wireBytes = record ? JSON.stringify(record.wire).length : 0;
  const shaShort = (sha: string | null) => (sha ? `${sha.slice(0, 6)}…${sha.slice(-6)}` : null);

  const expanded = onToggle === undefined ? true : open ?? false;

  const rows: Row[] = record
    ? [
        { label: "txType", node: <>0x06 · ethrex-eip8141-tracer</> },
        { label: "frames", node: <>VERIFY (1) + SENDER (2)</> },
        { label: "sig scheme", node: <span className="v2-chip v2-chip-violet">ARBITRARY (0x0)</span> },
        {
          label: "signature",
          node: <>{formatBytes(2420)} ML-DSA-44{signatureSha && <> · sha256 {shaShort(signatureSha)}</>}</>,
        },
        ...(record.frames as BuiltFrameTx["frames"]).map((entry): Row => ({
          label: entry.mode === "VERIFY" ? "verify frame" : "sender frame",
          node: entry.mode === "VERIFY"
            ? <>execution {formatGas(entry.execution)}</>
            : <>{entry.target ? truncateHash(entry.target) : "—"} · exec {formatGas(entry.execution)} · state {formatGas(entry.state ?? "0")} · value {formatEth(entry.value ?? null)?.display ?? "—"} ETH</>,
        })),
        { label: "intent digest", node: <CopyChip value={record.digest} label="Copy intent digest" /> },
        { label: "frame hash", node: <CopyChip value={record.txHash} label="Copy frame hash" /> },
        { label: "wire", node: <>{formatBytes(wireBytes)} JSON · signature {formatBytes(record.signature.bytes)}</> },
        {
          label: "local verify",
          node: record.verified
            ? <span className="v3-verifystamp">local verify · true</span>
            : <span className="v2-chip v2-chip-red">LOCAL VERIFY: FALSE</span>,
        },
      ]
    : [];

  return (
    <section className="v2-panel" aria-label="Frame inspector">
      <header className="v2-panel-head">
        <div>
          <p className="v2-kicker">FRAME INSPECTOR / EIP-8141</p>
          <h3>Frame inspector</h3>
        </div>
        {onToggle && (
          <button type="button" className="button-quiet" onClick={onToggle} aria-expanded={expanded} aria-label="Toggle frame inspector">{expanded ? "hide" : "show"}</button>
        )}
      </header>
      {expanded && (
        record ? (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.04 } } }}
          >
            {rows.map((row) => (
              <motion.div className="v2-irow" key={row.label} variants={rowFade}>
                <b>{row.label}</b>
                <span>{row.node}</span>
              </motion.div>
            ))}
            <RawWindow flat title="frame wire · eth_sendFrameTransaction" value={{ txHash: record.txHash, wire: record.wire }} />
          </motion.div>
        ) : (
          <div>
            <div className="v2-irow"><b>txType</b><span>0x06 · ethrex-eip8141-tracer</span></div>
            <div className="v2-irow"><b>frames</b><span>VERIFY (1) + SENDER (2)</span></div>
            <div className="v2-irow"><b>sig scheme</b><span className="v2-chip v2-chip-violet">ARBITRARY (0x0)</span></div>
            <div className="v2-irow"><b>signature</b><span>{formatBytes(2420)} ML-DSA-44</span></div>
            <p className="v2-caption" style={{ marginTop: 10 }}>Schema placeholders — sizes only, no hex. Build an intent to populate: intent 32 B · signature 2,420 B · frames VERIFY + SENDER.</p>
          </div>
        )
      )}
    </section>
  );
}
