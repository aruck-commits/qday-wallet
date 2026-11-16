import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CopyChip } from "../components/CopyChip";
import { RefreshLine } from "../components/RefreshLine";
import { RawWindow } from "../components/RawWindow";
import { StatusChip } from "../components/StatusChip";
import arkivLiveJson from "../data/arkivLive.json";
import evidenceJson from "../data/demoEvidence.json";
import { ARKIV } from "../lib/chain";
import { formatAgo, truncateHash } from "../lib/format";
import { ensureLiveRefresh, useWalletStore } from "../lib/walletStore";

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

type PassportState = { open: boolean; body: unknown; loading: boolean; error: string | null };

export function RegistryScreen() {
  const live = useWalletStore((state) => state.live);
  const refreshLive = useWalletStore((state) => state.refreshLive);
  const reduce = useReducedMotion();

  useEffect(() => { void ensureLiveRefresh(); }, []);

  const arkiv = live.arkiv;
  const online = arkiv?.online === true;
  // LIVE when the entity RPC answered, UNREACHABLE after a failed refresh, COMMITTED before any refresh.
  const probeState: "live" | "unreachable" | "committed" = online ? "live" : live.refreshedAt ? "unreachable" : "committed";
  const entity = online && arkiv ? arkiv : null;
  const committed = arkivLiveJson.entity;

  const swarmRef = (entity?.attributes.swarmRef ?? committed.swarmRef ?? evidenceJson.arkiv.swarmRef) as string | null;
  const swarmUrl = `${evidenceJson.arkiv.swarmGateway}/${swarmRef ?? ""}`;
  const patchTx = evidenceJson.arkiv.patchTx;

  const [passport, setPassport] = useState<PassportState>({ open: false, body: null, loading: false, error: null });

  useEffect(() => {
    if (!passport.open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setPassport((prev) => ({ ...prev, open: false })); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [passport.open]);

  const openPassport = async () => {
    setPassport({ open: true, body: null, loading: true, error: null });
    try {
      const response = await fetch(swarmUrl);
      const text = await response.text();
      let body: unknown;
      try { body = JSON.parse(text) as unknown; } catch { body = { raw: text.slice(0, 4000) }; }
      setPassport({ open: true, body, loading: false, error: null });
    } catch (error) {
      setPassport({ open: true, body: null, loading: false, error: error instanceof Error ? error.message : String(error) });
    }
  };

  const sourceChip = <StatusChip tone={online ? "mint" : "amber"}>{online ? "LIVE" : "COMMITTED"}</StatusChip>;

  return (
    <motion.section className="screen" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.06 } } }}>
      <motion.div className="screen-heading" variants={fade}>
        <div>
          <p className="eyebrow">REGISTRY / ARKIV · RABDI</p>
          <h2>Migration registry</h2>
          <p className="screen-lede">Reads the public migration record live from Arkiv and falls back to the committed snapshot, labeled as such.</p>
        </div>
        <RefreshLine refreshing={live.refreshing} refreshedAt={live.refreshedAt} onRefresh={() => void refreshLive()} label="Refresh the live Arkiv read" />
      </motion.div>

      <motion.div className="v2-toolbar" variants={fade} aria-label="Registry toolbar">
        <span className="filter-pill">schema = {ARKIV.schema}</span>
        <span className="filter-pill">network = Rabdi ({formatBlock(ARKIV.chainId)})</span>
        <StatusChip tone={probeState === "live" ? "mint" : probeState === "unreachable" ? "red" : "amber"}>
          <i className={`v2-dot ${probeState === "live" ? "v2-dot-mint" : probeState === "unreachable" ? "v2-dot-red" : "v2-dot-amber"}`} aria-hidden="true" />
          {probeState === "live" ? "LIVE" : probeState === "unreachable" ? "UNREACHABLE" : "COMMITTED"}
        </StatusChip>
        <button type="button" className="button-primary" style={{ marginLeft: "auto" }} onClick={() => void refreshLive()} disabled={live.refreshing} aria-label="Fetch the live Arkiv entity">
          {live.refreshing ? "Fetching…" : "Fetch live entity"}
        </button>
      </motion.div>

      <motion.div className="v2-panel" variants={fade} aria-label="Migration entity">
        <div className="v2-entity-head">
          <p className="v2-kicker">ENTITY</p>
          <CopyChip value={entity?.key ?? committed.key} label="Copy entity key" />
          {sourceChip}
        </div>
        <div className="v2-irow"><b>status</b><span><StatusChip tone="mint">{entity?.attributes.status ?? committed.status}</StatusChip></span></div>
        <div className="v2-irow"><b>writer / owner</b><span className="v2-mono">{truncateHash(entity?.owner ?? arkivLiveJson.writer)}</span></div>
        <div className="v2-irow"><b>pqKeyVersion</b><span>{entity?.attributes.pqKeyVersion ?? committed.pqKeyVersion}</span></div>
        <div className="v2-irow"><b>patch tx</b><span>
          <a href={ARKIV.explorerTx(patchTx)} target="_blank" rel="noreferrer">{truncateHash(patchTx)} ↗</a>
        </span></div>
        <div className="v2-irow"><b>expiry</b><span>{entity?.expiresAtBlock ?? "—"}</span></div>
        {arkiv && !arkiv.online && arkiv.error && (
          <p className="v2-error" role="alert">live read failed: {arkiv.error} — showing the committed snapshot.</p>
        )}
        <p className="v2-note-amber" style={{ marginTop: 8 }}>
          {probeState === "live"
            ? `entity read live ${formatAgo(live.refreshedAt)} from the public Rabdi RPC.`
            : "values below are committed build-time evidence, not a live read."}
        </p>
      </motion.div>

      <motion.div className="v2-panel" style={{ marginTop: 16 }} variants={fade} aria-label="Snapshot table">
        <div className="v2-panel-head">
          <div>
            <p className="v2-kicker">SNAPSHOT</p>
            <h3>Committed migration record</h3>
          </div>
          {sourceChip}
        </div>
        <div className="v2-irow"><b>entity key</b><CopyChip value={entity?.key ?? committed.key} label="Copy entity key" /></div>
        <div className="v2-irow"><b>schema</b><span>{ARKIV.schema}</span></div>
        <div className="v2-irow"><b>swarm ref</b><CopyChip value={swarmRef} head={6} tail={6} label="Copy swarm reference" /></div>
        <div className="v2-irow"><b>query matches</b><span>{live.arkivQuery?.online ? `${live.arkivQuery.keys.length} key${live.arkivQuery.keys.length === 1 ? "" : "s"} at block ${live.arkivQuery.block ?? "—"}` : "1 (committed snapshot)"}</span></div>
        <div className="v2-key-actions">
          <button type="button" className="button-quiet" onClick={() => void openPassport()} disabled={!swarmRef} aria-label="Open the migration passport drawer">
            Open passport
          </button>
          {swarmRef && <a className="button-quiet v2-filelabel" href={swarmUrl} target="_blank" rel="noreferrer">open original ↗</a>}
        </div>
      </motion.div>

      <AnimatePresence>
        {passport.open && (
          <>
            <motion.div className="v2-drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPassport((prev) => ({ ...prev, open: false }))} />
            <motion.aside
              className="v2-drawer" role="dialog" aria-label="Migration passport"
              initial={reduce ? { opacity: 0 } : { x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={reduce ? { opacity: 0 } : { x: 60, opacity: 0 }}
              transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="v2-drawer-head">
                <div>
                  <p className="v2-kicker">PASSPORT</p>
                  <h3 style={{ margin: "4px 0 0", fontSize: 15, fontWeight: 500 }}>Migration passport · Swarm</h3>
                </div>
                <button type="button" className="button-quiet" onClick={() => setPassport((prev) => ({ ...prev, open: false }))} aria-label="Close the passport drawer">close</button>
              </div>
              <CopyChip value={swarmRef} head={6} tail={6} label="Copy swarm reference" />
              {evidenceJson.arkiv.swarmByteEqual && <StatusChip tone="mint">byte-equal read-back verified</StatusChip>}
              {passport.loading && <span className="v2-skeleton" style={{ width: 260 }} role="status" aria-label="loading passport" />}
              {passport.error && <p className="v2-error" role="alert">passport fetch failed: {passport.error}</p>}
              {passport.body ? <RawWindow title="passport JSON · public gateway" value={passport.body} /> : null}
              <a href={swarmUrl} target="_blank" rel="noreferrer">open original ↗</a>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function formatBlock(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
