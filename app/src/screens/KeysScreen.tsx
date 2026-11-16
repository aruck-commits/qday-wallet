import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CopyChip } from "../components/CopyChip";
import { CountNumber } from "../components/CountNumber";
import { ExposureCard } from "../components/ExposureCard";
import { LedgerStamp } from "../components/LedgerStamp";
import { PassphraseModal } from "../components/PassphraseModal";
import { Rosette } from "../components/Rosette";
import evidenceJson from "../data/demoEvidence.json";
import { PQ, hexlify, type Keyfile } from "../lib/pq";
import { formatBytes, truncateHash } from "../lib/format";
import { useWalletStore } from "../lib/walletStore";

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const hexFragment = (bytes: Uint8Array | undefined, count: number) =>
  bytes ? hexlify(bytes.slice(0, count)) : "";

/**
 * Keys (UI spec §4) — the bytegrid is a fingerprint RITUAL: the 16×4 grid
 * renders the first 64 hex nibbles of the REAL session-key fingerprint (cell
 * brightness = nibble value → violet alpha 0.15–1.0), waves in at 6ms stagger,
 * then the fingerprint wipes in character-by-char (18ms/char), the violet
 * "Materialized." mini stamp lands, and KeyStats counts up from 0. All v2
 * behavior (keyfile I/O, secret mask, confirms) is kept verbatim.
 */
export function KeysScreen() {
  const keypair = useWalletStore((state) => state.keypair);
  const fingerprint = useWalletStore((state) => state.fingerprint);
  const generateKey = useWalletStore((state) => state.generateKey);
  const forgetKey = useWalletStore((state) => state.forgetKey);
  const importKeyfile = useWalletStore((state) => state.importKeyfile);
  const exportKeyfile = useWalletStore((state) => state.exportKeyfile);
  const reduce = useReducedMotion() ?? false;

  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<null | { mode: "export" } | { mode: "import"; file: Keyfile }>(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [confirmForget, setConfirmForget] = useState(false);
  const [secret, setSecret] = useState<"masked" | "warn" | "shown">("masked");
  const [notice, setNotice] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // REAL fingerprint — walletStore's value is bare 64-hex; strip a sha256: prefix if present.
  const fpHex = fingerprint?.replace(/^sha256:/, "") ?? null;
  const nibbles = fpHex ? fpHex.slice(0, 64).split("") : null;
  const fpShort = fpHex ? `sha256:${fpHex.slice(0, 6)}…${fpHex.slice(-6)}` : null;
  const fpRevealChars = fpShort ? fpShort.split("") : [];

  // evidence.ts types rotation as {verdict, reason}; the committed JSON also carries the tx link.
  const rotation = evidenceJson.ens.rotation as { verdict: string; reason: string; txHash?: string; explorerUrl?: string; pqKeyVersion?: string };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } finally { setBusy(false); }
  };

  const onImportFile = async (file: File | null) => {
    setImportError(null);
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Keyfile;
      if (!parsed || parsed.format !== "qday-keyfile-v1") throw new Error("format");
      setModal({ mode: "import", file: parsed });
    } catch {
      setImportError("import file malformed — expected a qday-keyfile-v1 JSON keyfile");
    }
  };

  const submitPassphrase = async (pass: string) => {
    if (!modal) return;
    setModalBusy(true); setModalError(null);
    try {
      if (modal.mode === "export") {
        const keyfile = await exportKeyfile(pass);
        const blob = new Blob([JSON.stringify(keyfile, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "qday-keyfile.encrypted.json";
        link.click();
        URL.revokeObjectURL(link.href);
        setModal(null);
        setNotice("keyfile downloaded — it restores this session key after a refresh");
      } else {
        await importKeyfile(modal.file, pass);
        setModal(null);
        setNotice("key restored — fingerprint recomputed from the imported public key");
      }
    } catch (error) {
      setModalError(error instanceof Error && /decrypted keyfile|unknown keyfile/i.test(error.message)
        ? "decryption failed — wrong passphrase or corrupted keyfile"
        : `decryption failed — ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setModalBusy(false);
    }
  };

  const deviceState = busy ? "GENERATING…" : keypair ? "SETTLED" : "IDLE";
  const gridKey = busy ? "generating" : fpHex ?? "empty";

  return (
    <motion.section className="screen" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.06 } } }}>
      <motion.div className="screen-heading" variants={fade}>
        <div>
          <p className="eyebrow">KEYS / ML-DSA-44 CEREMONY</p>
          <h2>Where the key lives</h2>
          <p className="screen-lede">Runs the real ML-DSA-44 key ceremony in this tab: generate, fingerprint, export encrypted, import, forget. The secret never touches a network.</p>
        </div>
        <p className="v2-caption">Ceremony runs locally. No network needed.</p>
      </motion.div>

      <motion.div className="v2-keys-grid" variants={fade}>
        <div className="v2-keys-left">
          <div className="v3-keys-panelwrap">
            <div className="v3-keys-rosette" aria-hidden="true"><Rosette spin={false} /></div>
            <div className="v2-panel" aria-label="Session key device">
              <div className="v2-device-top">
                <i className={`v3-device-led ${busy ? "generating" : keypair ? "on" : ""}`} aria-hidden="true" />
                SESSION KEY DEVICE
                <span className="v2-device-state">{deviceState}</span>
              </div>

              {/* 16×4 bytegrid — first 64 hex nibbles of the REAL fingerprint */}
              <div
                key={gridKey}
                className={`v3-bytegrid ${busy ? "v3-bytegrid-generating" : ""}`}
                role="img"
                aria-label="first 64 nibbles of the pk fingerprint, rendered as a grid"
                title="first 64 nibbles of the pk fingerprint, rendered as a grid"
              >
                {Array.from({ length: 64 }, (_, index) => {
                  const nibble = !busy && nibbles ? nibbles[index] : null;
                  const value = nibble ? parseInt(nibble, 16) : 0;
                  const alpha = 0.15 + (value / 15) * 0.85;
                  return (
                    <motion.i
                      key={index}
                      initial={busy || reduce || !nibble ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={busy || reduce || !nibble ? { duration: 0 } : { delay: index * 0.006, type: "spring", stiffness: 400, damping: 28 }}
                      style={nibble ? { background: `rgba(167, 139, 250, ${alpha.toFixed(3)})` } : undefined}
                    />
                  );
                })}
              </div>

              {/* fingerprint reveal — char-by-char after the wave */}
              {fpHex && !busy && (
                <p className="v3-fpreveal" aria-label={`pk fingerprint ${fpShort}`}>
                  {fpRevealChars.map((char, index) => (
                    <motion.span
                      key={`${gridKey}-${index}`}
                      initial={reduce ? { opacity: 1 } : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={reduce ? { duration: 0 } : { delay: 0.5 + index * 0.018, duration: 0.12 }}
                    >
                      {char}
                    </motion.span>
                  ))}
                </p>
              )}
              {!fpHex && <p className="v3-fpreveal" style={{ color: "var(--muted)" }}>waiting — generate to reveal</p>}

              {/* Materialized. mini stamp */}
              {fpHex && !busy && (
                <div className="v3-ministamp" style={{ margin: "12px 0 10px" }}>
                  <LedgerStamp word="Materialized." subline="ML-DSA-44 · SESSION" tone="violet" width={96} mini delay={reduce ? 0 : 1.05} />
                </div>
              )}

              <div className="v2-irow"><b>pk fingerprint</b><span>{fpShort ?? "waiting — generate to reveal"}</span></div>
              {fpShort && (
                <div className="v2-irow"><b>copy</b><CopyChip value={fingerprint} display={fpShort} label="Copy the full public-key fingerprint" /></div>
              )}
              <div className="v2-secret-box">
                <div className="v2-secret-row">
                  <b>secret key</b>
                  <span className="v2-secret-value">
                    {secret === "shown" && keypair
                      ? `${hexFragment(keypair.secretKey, 4)}…${hexFragment(keypair.secretKey.slice(-4), 4)}`
                      : "••••••••…••••••••"}
                  </span>
                  {secret === "masked" && keypair && (
                    <button type="button" className="button-quiet" onClick={() => setSecret("warn")} aria-label="Reveal secret key fragments">reveal</button>
                  )}
                  {secret === "shown" && (
                    <button type="button" className="button-quiet" onClick={() => setSecret("masked")} aria-label="Mask the secret key again">mask</button>
                  )}
                </div>
                {secret === "warn" && (
                  <div role="alert">
                    <p className="v2-note-amber">This reveals the first and last 4 bytes of the 2,560-byte secret on screen. It stays in this tab, but a shoulder-surf is a shoulder-surf.</p>
                    <div className="v2-key-actions">
                      <button type="button" className="button-quiet" onClick={() => setSecret("shown")}>Reveal anyway</button>
                      <button type="button" className="button-quiet" onClick={() => setSecret("masked")}>Keep masked</button>
                    </div>
                  </div>
                )}
              </div>
              <div className="v2-keystats" aria-label="Key sizes">
                <div><span>public key</span><strong>{keypair && !reduce ? <CountNumber value={PQ.pkBytes} from={0} duration={600} reduce={false} format={(n) => formatBytes(Math.round(n))} /> : formatBytes(PQ.pkBytes)}</strong></div>
                <div><span>secret key</span><strong>{keypair && !reduce ? <CountNumber value={PQ.skBytes} from={0} duration={600} format={(n) => `${formatBytes(Math.round(n))} / masked`} /> : `${formatBytes(PQ.skBytes)} / masked`}</strong></div>
                <div><span>signature</span><strong>{keypair && !reduce ? <CountNumber value={PQ.sigBytes} from={0} duration={600} format={(n) => formatBytes(Math.round(n))} /> : formatBytes(PQ.sigBytes)}</strong></div>
              </div>
            </div>
          </div>

          <p className="v2-caption">The secret key lives in this tab only. Refresh clears it; the keyfile restores it.</p>

          <div className="v2-key-actions">
            {!keypair ? (
              <button type="button" className="button-primary" onClick={() => void run(generateKey)} disabled={busy} aria-busy={busy} aria-label="Generate an ML-DSA-44 session key">
                {busy ? "Generating…" : `Generate ${PQ.name} key`}
              </button>
            ) : (
              <button type="button" className="button-primary" onClick={() => setModal({ mode: "export" })} aria-label="Download the encrypted keyfile">
                Download encrypted keyfile
              </button>
            )}
            {keypair && (
              <button type="button" className="button-quiet" onClick={() => setConfirmRegenerate(true)} aria-label="Regenerate the session key">Regenerate (replaces session key)</button>
            )}
            {keypair && (
              <button type="button" className="button-quiet" onClick={() => setConfirmForget(true)} aria-label="Forget the session key">Forget key</button>
            )}
            <label className="button-quiet v2-filelabel" htmlFor="v2-keyfile-input">
              Import keyfile…
              <input
                id="v2-keyfile-input" ref={fileInput} type="file" accept=".json,application/json"
                style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden" }}
                onChange={(event) => void onImportFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
          {importError && <p className="v2-error" role="alert">{importError}</p>}
          {notice && <p className="v2-note-mint" role="status">{notice}</p>}
        </div>

        <div className="v2-keys-right">
          <ExposureCard hasKey={Boolean(keypair)} />
          <div className="v2-rotate-strip">
            Rotation record — pq-key version {rotation.pqKeyVersion ?? "1"} · rotated on-chain tx{" "}
            {rotation.txHash && rotation.explorerUrl && (
              <a href={rotation.explorerUrl} target="_blank" rel="noreferrer">{truncateHash(rotation.txHash)} ↗</a>
            )}
            {" "}· owner unchanged — the name never moved; only the key did.
          </div>
          <div className="v2-panel">
            <p className="v2-kicker">KEYFILE I/O</p>
            <p className="v2-caption" style={{ marginTop: 8 }}>
              Export encrypts {"{algo, pk, sk}"} with the keccak-stretched passphrase (demo-grade) into qday-keyfile.encrypted.json.
              Import decrypts the same file and restores the session key in memory. Nothing is stored on disk by the app itself.
            </p>
          </div>
        </div>
      </motion.div>

      {modal && (
        <PassphraseModal
          mode={modal.mode} busy={modalBusy} error={modalError}
          onCancel={() => { setModal(null); setModalError(null); }}
          onSubmit={(pass) => void submitPassphrase(pass)}
        />
      )}

      {confirmRegenerate && (
        <div className="v2-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setConfirmRegenerate(false); }}>
          <div className="v2-modal" role="dialog" aria-modal="true" aria-label="Confirm regenerate">
            <p className="v2-kicker">CONFIRM</p>
            <h3>This replaces your session key. Continue?</h3>
            <p className="v2-caption">The current key and its signed intents are wiped from this tab. Export a keyfile first if you want it back.</p>
            <div className="v2-modal-actions">
              <button type="button" className="button-quiet" onClick={() => setConfirmRegenerate(false)}>Cancel</button>
              <button type="button" className="button-primary" onClick={() => { setConfirmRegenerate(false); setSecret("masked"); void run(generateKey); }}>Replace key</button>
            </div>
          </div>
        </div>
      )}

      {confirmForget && (
        <div className="v2-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setConfirmForget(false); }}>
          <div className="v2-modal" role="dialog" aria-modal="true" aria-label="Confirm forget">
            <p className="v2-kicker">CONFIRM</p>
            <h3>Forget the session key?</h3>
            <p className="v2-caption">The secret is wiped from memory and its signed intents are cleared. Without a keyfile export, it is gone.</p>
            <div className="v2-modal-actions">
              <button type="button" className="button-quiet" onClick={() => setConfirmForget(false)}>Cancel</button>
              <button type="button" className="button-quiet" onClick={() => { setConfirmForget(false); setSecret("masked"); forgetKey(); setNotice("session key forgotten"); }}>Forget</button>
            </div>
          </div>
        </div>
      )}
    </motion.section>
  );
}
