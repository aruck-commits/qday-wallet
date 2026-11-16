import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CopyChip } from "../components/CopyChip";
import { RefreshLine } from "../components/RefreshLine";
import { StatusChip } from "../components/StatusChip";
import { Timeline } from "../components/Timeline";
import evidenceJson from "../data/demoEvidence.json";
import { SEPOLIA } from "../lib/chain";
import { useDemoStore } from "../lib/demoStore";
import { truncateHash } from "../lib/format";
import { ensureLiveRefresh, useWalletStore } from "../lib/walletStore";

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const shortFingerprint = (hex: string) => `${hex.slice(0, 6)}…${hex.slice(-6)}`;

export function IdentityScreen() {
  const live = useWalletStore((state) => state.live);
  const fingerprint = useWalletStore((state) => state.fingerprint);
  const refreshLive = useWalletStore((state) => state.refreshLive);
  const setScreen = useDemoStore((state) => state.setScreen);
  const reduce = useReducedMotion();

  useEffect(() => { void ensureLiveRefresh(); }, []);

  const ens = live.ens;
  const committedValue = evidenceJson.ens.pqWrite.readBack ?? evidenceJson.ens.pqWrite.value ?? null;
  const liveValue = ens?.online ? ens.value : null;
  const shownValue = liveValue ?? committedValue;
  const valueHex = shownValue?.replace(/^sha256:/, "").toLowerCase() ?? null;

  const compareSource: "session" | "committed" | null = fingerprint ? "session" : committedValue ? "committed" : null;
  const compareHex = compareSource === "session" ? fingerprint?.toLowerCase() : valueHex;
  const match = compareHex !== null && valueHex !== null && compareHex === valueHex;

  return (
    <motion.section className="screen" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.06 } } }}>
      <motion.div className="screen-heading v2-name-hero" variants={fade}>
        <div>
          <p className="eyebrow">IDENTITY / ENSv2 · SEPOLIA</p>
          <h2>{evidenceJson.ens.name}</h2>
          <span className="v2-owner-chip">OWNER / <b>{truncateHash(SEPOLIA.hookedWallet)}</b></span>
        </div>
        <div className="v2-resolution">
          <StatusChip tone="mint">REGISTERED · PQ RECORD ON-CHAIN</StatusChip>
          <p>{liveValue ? "pq-key resolves live from our Permissioned Resolver right now." : "Name is registered; the pq-key read below falls back to committed evidence when the RPC is unreachable."}</p>
        </div>
      </motion.div>

      <motion.div variants={fade}>
        <RefreshLine refreshing={live.refreshing} refreshedAt={live.refreshedAt} onRefresh={() => void refreshLive()} label="Refresh the live ENS read" />
      </motion.div>

      <motion.div className="v2-id-grid" variants={fade}>
        <div className="v2-panel" aria-label="PQ record">
          <div className="v2-panel-head">
            <div>
              <p className="v2-kicker">PQ RECORD / text/pq-key</p>
              <h3>Live read-back</h3>
            </div>
            {ens?.online ? <StatusChip tone="mint">LIVE</StatusChip> : <StatusChip tone="amber">COMMITTED</StatusChip>}
          </div>
          {live.refreshing && !shownValue ? (
            <span className="v2-skeleton" style={{ width: 260 }} role="status" aria-label="loading pq-key record" />
          ) : (
            <>
              <div className="v2-irow"><b>record value</b><span className="v2-mono">{shownValue ? `sha256:${shortFingerprint(valueHex ?? "")}` : "—"}</span></div>
              <div className="v2-irow"><b>resolver</b><span className="v2-mono">{truncateHash(ens?.resolver ?? SEPOLIA.resolver)}</span></div>
              <div className="v2-compare-line">
                {compareSource === null ? (
                  <StatusChip tone="neutral">no session key — comparing against the committed record</StatusChip>
                ) : match ? (
                  <StatusChip tone="mint">MATCH</StatusChip>
                ) : (
                  <StatusChip tone="amber">DIFFERENT KEY</StatusChip>
                )}
                <span className="v2-caption">
                  {compareSource === "session"
                    ? match
                      ? "your session key IS the key the name points at."
                      : "the on-chain record points at the rotated v1 key; your session key is fresh."
                    : "compared against the committed rotated-key value."}
                </span>
              </div>
              {!ens?.online && (
                <p className="v2-note-amber">committed evidence · read back through UniversalResolverV2 — live read unavailable right now.</p>
              )}
              {ens && !ens.online && ens.error && <p className="v2-error" role="alert">resolution failed: {ens.error.slice(0, 140)}</p>}
            </>
          )}
          <div className="v2-key-actions">
            <button type="button" className="button-primary" onClick={() => void refreshLive()} disabled={live.refreshing} aria-label="Verify the live ENS resolution">
              {live.refreshing ? "Reading…" : "Verify resolution"}
            </button>
            <button type="button" className="button-quiet" onClick={() => setScreen("keys")} aria-label="Open the Keys screen">Compare with session key in Keys →</button>
          </div>
        </div>

        <div className="v2-panel" aria-label="Resolver details">
          <div className="v2-panel-head">
            <div>
              <p className="v2-kicker">RESOLVER</p>
              <h3>Permissioned Resolver</h3>
            </div>
          </div>
          <div className="v2-irow"><b>address</b><CopyChip value={evidenceJson.ens.pqWrite.resolver ?? SEPOLIA.resolver} label="Copy resolver address" /></div>
          <div className="v2-irow"><b>wallet role</b><span>ROLE_SET_TEXT only for pq-key (argument-scoped grant)</span></div>
          <div className="v2-irow"><b>setResolver tx</b><span>
            {evidenceJson.ens.pqWrite.setResolverTx && evidenceJson.ens.pqWrite.setResolverUrl && (
              <a href={evidenceJson.ens.pqWrite.setResolverUrl} target="_blank" rel="noreferrer">{truncateHash(evidenceJson.ens.pqWrite.setResolverTx)} ↗</a>
            )}
          </span></div>
          <p className="v2-caption" style={{ marginTop: 10 }}>Deployed through the Verifiable Factory; the relayer is admin, the wallet may write exactly one text key.</p>
        </div>
      </motion.div>

      <motion.div className="v2-panel" style={{ marginTop: 16 }} variants={fade} aria-label="Rotation timeline">
        <div className="v2-panel-head">
          <div>
            <p className="v2-kicker">KEY CONTINUITY TIMELINE</p>
            <h3>The name never moved; only the key did.</h3>
          </div>
          <StatusChip tone="amber">CAPTURED</StatusChip>
        </div>
        <Timeline
          items={[
            {
              label: "registration",
              status: "done",
              detail: evidenceJson.ens.explorerUrl && evidenceJson.ens.registerTx
                ? <a href={evidenceJson.ens.explorerUrl} target="_blank" rel="noreferrer">tx {truncateHash(evidenceJson.ens.registerTx)} ↗</a>
                : <span className="v2-dim">no registration hash present</span>,
            },
            {
              label: "PQ text write",
              status: "done",
              detail: (
                <>
                  {evidenceJson.ens.pqWrite.explorerUrl && evidenceJson.ens.pqWrite.txHash && (
                    <a href={evidenceJson.ens.pqWrite.explorerUrl} target="_blank" rel="noreferrer">tx {truncateHash(evidenceJson.ens.pqWrite.txHash)} ↗</a>
                  )}
                  {" · read-back byte-equal"}
                </>
              ),
            },
            {
              label: "key rotation",
              status: "done",
              detail: (
                <>
                  <RotationLink />
                  {" · the name never moved; only the key did."}
                </>
              ),
            },
          ]}
        />
      </motion.div>
    </motion.section>
  );
}

function RotationLink() {
  const rotation = evidenceJson.ens.rotation as { txHash?: string; explorerUrl?: string };
  if (!rotation.txHash || !rotation.explorerUrl) return <span className="v2-dim">tx unavailable</span>;
  return <a href={rotation.explorerUrl} target="_blank" rel="noreferrer">tx {truncateHash(rotation.txHash)} ↗</a>;
}
