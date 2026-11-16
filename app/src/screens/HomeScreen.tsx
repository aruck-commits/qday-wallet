import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CopyChip } from "../components/CopyChip";
import { ethStringToWei, LedgerStrip } from "../components/LedgerStrip";
import { RefreshLine } from "../components/RefreshLine";
import { Rosette } from "../components/Rosette";
import { StatusChip } from "../components/StatusChip";
import evidenceJson from "../data/demoEvidence.json";
import { ensureLiveRefresh, useWalletStore } from "../lib/walletStore";
import { useDemoStore } from "../lib/demoStore";
import { SEPOLIA } from "../lib/chain";
import { formatEth, truncateHash } from "../lib/format";

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const glyphLetter = (kind: string) => ({ deploy: "D", precompute: "P", stake: "S", "ens-register": "E", entity: "A", patch: "A", passport: "W" })[kind] ?? "T";

/**
 * Home (UI spec §5) — product landing: serif hero (verbatim copy, neutral
 * rosette at 6%) → LedgerStrip (four live values, count-ups on change) →
 * three text-led capability cards → THE RECORD (editorial index of the 11
 * captured artifacts + the permanent amber not-achieved line) → session
 * intents. One primary CTA: Send with a PQ key (or Generate).
 */
export function HomeScreen() {
  const live = useWalletStore((state) => state.live);
  const intents = useWalletStore((state) => state.intents);
  const keypair = useWalletStore((state) => state.keypair);
  const fingerprint = useWalletStore((state) => state.fingerprint);
  const refreshLive = useWalletStore((state) => state.refreshLive);
  const setScreen = useDemoStore((state) => state.setScreen);
  const reduce = useReducedMotion() ?? false;

  useEffect(() => { void ensureLiveRefresh(); }, []);

  const sepolia = live.sepolia;
  const participantWei = sepolia?.online ? ethStringToWei(sepolia.balances.participant ?? "") : null;
  const lastGood = useRef<{ block: string | null; wei: bigint | null }>({ block: null, wei: null });
  useEffect(() => {
    if (sepolia?.online) lastGood.current = { block: sepolia.blockNumber, wei: participantWei };
  }, [sepolia, participantWei]);

  const [sessionFpShort, setSessionFpShort] = useState<string | null>(null);
  useEffect(() => {
    setSessionFpShort(fingerprint ? `sha256:${fingerprint.slice(0, 6)}…${fingerprint.slice(-6)}` : null);
  }, [fingerprint]);

  const stake = evidenceJson.demo.staked;
  const stakeDisplay = formatEth(stake.stakeWei)?.display ?? null;

  const ensOnline = live.ens?.online === true;
  const arkivOnline = live.arkiv?.online === true;

  return (
    <motion.section className="screen" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.08 } } }}>
      {/* ---------- hero ---------- */}
      <motion.div className="v3-hero" variants={fade}>
        <div className="v3-hero-rosette" aria-hidden="true"><Rosette /></div>
        <p className="eyebrow">Q-DAY WALLET · POST-QUANTUM SPEND AUTHORIZATION</p>
        <h1 className="v3-display-xl">
          Harvest now, decrypt later is a <em>today</em> problem.
        </h1>
        <p className="v3-hero-sub">
          Every ECDSA signature ever broadcast is being recorded against the day a quantum computer can forge it.
          Q-Day Wallet signs spends with ML-DSA-44 (FIPS 204) — 2,420-byte signatures, verified on-chain for{" "}
          {evidenceJson.gas.measuredVerify} gas, admitted through EIP-8141 frame transactions.
        </p>
        <div className="v3-hero-cta">
          {keypair ? (
            <button type="button" className="button-primary" onClick={() => setScreen("send")} aria-label="Go to Send">
              Send with a PQ key <span aria-hidden="true">→</span>
            </button>
          ) : (
            <button type="button" className="button-violet" onClick={() => setScreen("keys")} aria-label="Go to Keys and generate a session key">
              Generate your PQ key
            </button>
          )}
        </div>
      </motion.div>

      {/* ---------- ledger strip ---------- */}
      <motion.div variants={fade}>
        <LedgerStrip
          sepolia={sepolia}
          lastGoodWei={lastGood.current.wei}
          lastGoodBlock={lastGood.current.block}
          stakeDisplay={stakeDisplay}
          stakeReadback={stake.stakeReadback}
          hasKey={Boolean(keypair)}
          reduce={reduce}
        />
      </motion.div>

      {/* ---------- capability cards ---------- */}
      <motion.div className="v3-caps" variants={fade}>
        <article className="v3-cap v3-cap-accent-violet" aria-label="PQ keys in-browser">
          <p className="v2-kicker">PQ KEYS IN-BROWSER</p>
          <p className="v3-cap-statement">Your key is born here.</p>
          <div className="v3-cap-row">
            <span className="v2-mono">{sessionFpShort ?? "sha256:86c769…f28b62"}</span>
            <StatusChip tone={keypair ? "violet" : "amber"}>{keypair ? "session-only" : "on-chain v1"}</StatusChip>
          </div>
          <button type="button" className="button-quiet" onClick={() => setScreen("keys")} aria-label="Open the Keys screen">
            {keypair ? "Manage keys →" : "Run the ceremony →"}
          </button>
        </article>

        <article className="v3-cap v3-cap-accent-mint" aria-label="ENS identity">
          <p className="v2-kicker">ENS IDENTITY</p>
          <p className="v3-cap-statement">The name already points at a PQ key.</p>
          <div className="v3-cap-row">
            <span className="v2-mono">qdaywallet.eth</span>
            <StatusChip tone={ensOnline ? "mint" : "amber"} title={ensOnline ? "pq-key resolves live right now" : "values from committed evidence — live read unavailable"}>pq-key {ensOnline ? "LIVE" : "COMMITTED"}</StatusChip>
            <span className="v3-cap-foot">resolver {truncateHash(evidenceJson.ens.pqWrite.resolver ?? SEPOLIA.resolver)}</span>
          </div>
          <button type="button" className="button-quiet" onClick={() => setScreen("identity")} aria-label="Open the Identity screen">Open Identity →</button>
        </article>

        <article className="v3-cap v3-cap-accent-amber" aria-label="Live registry">
          <p className="v2-kicker">LIVE REGISTRY</p>
          <p className="v3-cap-statement">The migration record is public.</p>
          <div className="v3-cap-row">
            <CopyChip value={evidenceJson.arkiv.entity} label="Copy the Arkiv entity key" />
            <StatusChip tone="mint">ACTIVE</StatusChip>
            <StatusChip tone={arkivOnline ? "mint" : "amber"} title={arkivOnline ? "entity read live from the Rabdi RPC" : "values from committed evidence — live read unavailable"}>{arkivOnline ? "LIVE" : "COMMITTED"}</StatusChip>
          </div>
          <button type="button" className="button-quiet" onClick={() => setScreen("registry")} aria-label="Open the Registry screen">Open Registry →</button>
        </article>
      </motion.div>

      {/* ---------- THE RECORD ---------- */}
      <motion.div variants={fade}>
        <div className="v2-history-head">
          <div>
            <p className="v2-kicker">THE RECORD / CAPTURED ARTIFACTS</p>
            <h3 className="v3-record-title-serif">Every artifact, on the record</h3>
          </div>
          <RefreshLine refreshing={live.refreshing} refreshedAt={live.refreshedAt} onRefresh={() => void refreshLive()} />
        </div>
        <div className="v2-history-rows" role="table" aria-label="Recorded transaction artifacts">
          <div className="v2-thead" role="row">
            <span>kind</span><span>label</span><span className="v2-c-chain">chain</span><span>hash</span><span className="v2-c-status">status</span><span>↗</span>
          </div>
          {evidenceJson.txHistory.map((item) => (
            <div className="v2-tr" role="row" key={`${item.kind}-${item.hash}`}>
              <span className="v2-glyph" aria-hidden="true">{glyphLetter(item.kind)}</span>
              <span className="v2-c-label">{item.label}</span>
              <span className="v2-c-chain"><StatusChip>{item.chain}</StatusChip></span>
              <span className="v2-c-hash"><CopyChip value={item.hash} label={`Copy ${item.label} hash`} /></span>
              <span className="v2-c-status"><StatusChip tone={item.status === "mined" || item.status === "verified" ? "mint" : "amber"}>{item.status}</StatusChip></span>
              <span className="v2-c-link">{item.explorerUrl && <a href={item.explorerUrl} target="_blank" rel="noreferrer" aria-label={`Open ${item.label} on its explorer`}>↗</a>}</span>
            </div>
          ))}
          <div className="v2-queue-row" role="row">
            <span className="v2-glyph" aria-hidden="true">!</span>
            <span className="v2-c-label">PQ frame admission — not achieved</span>
            <span className="v2-c-chain" />
            <span className="v2-c-hash"><span className="v2-dim">the absence is stated, not decorated</span></span>
            <span className="v2-c-status"><StatusChip tone="amber">NOT ACHIEVED</StatusChip></span>
            <span className="v2-c-link"><button type="button" className="button-quiet" onClick={() => setScreen("evidence")} aria-label="Open the Evidence screen">see Evidence →</button></span>
          </div>
        </div>
      </motion.div>

      {/* ---------- session intents ---------- */}
      <motion.div variants={fade}>
        <div className="v2-history-head">
          <div>
            <p className="v2-kicker">RECENT INTENTS / THIS SESSION</p>
            <h3 className="v3-record-title-serif">Signed spend intents</h3>
          </div>
          <span className="v2-dim">{intents.length === 0 ? "none yet" : `${intents.length} recorded`}</span>
        </div>
        <div className="v2-history-rows v2-intents-grid" role="table" aria-label="Recent session intents">
          <div className="v2-thead" role="row">
            <span>when · recipient</span><span>amount</span><span>digest</span><span className="v2-c-status">status</span><span />
          </div>
          {intents.length === 0 ? (
            <div className="v2-tr" role="row">
              <span className="v2-c-label">No intents this session yet — build one in Send.</span>
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : intents.slice(0, 5).map((intent) => {
            const wei = formatEth(intent.amountEth);
            return (
              <div className="v2-tr" role="row" key={intent.id}>
                <span className="v2-c-label">{new Date(intent.createdAt).toLocaleTimeString()}<small>→ {truncateHash(intent.recipient)}</small></span>
                <span className="v2-num">{wei?.display ?? "—"} ETH</span>
                <span className="v2-c-hash"><CopyChip value={intent.digest} label="Copy intent digest" /></span>
                <span className="v2-c-status"><StatusChip tone={intent.status === "signed" ? "violet" : "amber"}>{intent.status}</StatusChip></span>
                <span />
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.section>
  );
}
