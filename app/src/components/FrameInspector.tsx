import { useEffect, useState } from "react";
import type { IntentRecord } from "../lib/walletStore";
import type { BuiltFrameTx } from "../lib/frame";
import { fingerprintHex } from "../lib/pq";
import { formatBytes, formatEth, formatGas, truncateHash } from "../lib/format";
import { CopyChip } from "./CopyChip";
import { RawWindow } from "./RawWindow";
import { StatusChip } from "./StatusChip";

const hexToBytes = (hex: string): Uint8Array =>
  Uint8Array.from(hex.replace(/^0x/, "").match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? []);

/**
 * The real frame, byte-accounted: VERIFY + SENDER frames, ARBITRARY scheme,
 * 2,420 B signature (sha256 computed from the signature embedded in the wire
 * form), intent digest, frame hash, wire JSON expander. Idle state shows the
 * schema placeholders only — sizes, no hex.
 */
export function FrameInspector({ record, open, onToggle }: {
  record: IntentRecord | null;
  open: boolean;
  onToggle: () => void;
}) {
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

  return (
    <section className="v2-panel" aria-label="Frame inspector">
      <header className="v2-panel-head">
        <div>
          <p className="v2-kicker">FRAME INSPECTOR</p>
          <h3>EIP-8141 frame transaction</h3>
        </div>
        <button type="button" className="button-quiet" onClick={onToggle} aria-expanded={open} aria-label="Toggle frame inspector">{open ? "hide" : "show"}</button>
      </header>
      {open && (
        <div>
          <div className="v2-irow"><b>txType</b><span>0x06 · ethrex-eip8141-tracer</span></div>
          <div className="v2-irow"><b>frames</b><span>VERIFY (1) + SENDER (2)</span></div>
          <div className="v2-irow"><b>sig scheme</b><span className="v2-chip v2-chip-violet">ARBITRARY (0x0)</span></div>
          <div className="v2-irow"><b>signature</b><span>{formatBytes(2420)} ML-DSA-44{signatureSha && <> · sha256 {shaShort(signatureSha)}</>}</span></div>
          {record ? (
            <>
              {(record.frames as BuiltFrameTx["frames"]).map((entry) => (
                <div className="v2-irow" key={entry.mode}>
                  <b>{entry.mode.toLowerCase()} frame</b>
                  <span>
                    {entry.mode === "VERIFY"
                      ? <>execution {formatGas(entry.execution)}</>
                      : <>{entry.target ? truncateHash(entry.target) : "—"} · exec {formatGas(entry.execution)} · state {formatGas(entry.state ?? "0")} · value {formatEth(entry.value ?? null)?.display ?? "—"} ETH</>}
                  </span>
                </div>
              ))}
              <div className="v2-irow"><b>intent digest</b><CopyChip value={record.digest} label="Copy intent digest" /></div>
              <div className="v2-irow"><b>frame hash</b><CopyChip value={record.txHash} label="Copy frame hash" /></div>
              <div className="v2-irow"><b>wire</b><span>{formatBytes(wireBytes)} JSON · signature {formatBytes(record.signature.bytes)}</span></div>
              <div className="v2-irow">
                <b>local verify</b>
                <span>{record.verified ? <StatusChip tone="mint">LOCAL VERIFY: TRUE</StatusChip> : <StatusChip tone="red">LOCAL VERIFY: FALSE</StatusChip>}</span>
              </div>
              <RawWindow flat title="frame wire · eth_sendFrameTransaction" value={{ txHash: record.txHash, wire: record.wire }} />
            </>
          ) : (
            <p className="v2-caption">Schema placeholders — sizes only, no hex. Build an intent to populate: intent 32 B · signature 2,420 B · frames VERIFY + SENDER.</p>
          )}
        </div>
      )}
    </section>
  );
}
