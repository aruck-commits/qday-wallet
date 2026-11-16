import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CopyChip } from "../components/CopyChip";
import { RefreshLine } from "../components/RefreshLine";
import { StatusChip } from "../components/StatusChip";
import evidenceJson from "../data/demoEvidence.json";
import { ensureLiveRefresh, useWalletStore } from "../lib/walletStore";
import { useDemoStore } from "../lib/demoStore";
import { SEPOLIA } from "../lib/chain";
import { formatEth, formatGas, truncateHash } from "../lib/format";

/** readSepoliaLive returns decimal-ETH strings; convert to wei for lib/format. */
function ethStringToWei(eth: string): bigint | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(eth.trim());
  if (!match) return null;
  const fraction = (match[2] ?? "").padEnd(18, "0").slice(0, 18);
  try { return BigInt(match[1] + fraction); } catch { return null; }
}

const fade = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };
const glyphLetter = (kind: string) => ({ deploy: "D", precompute: "P", stake: "S", "ens-register": "E", entity: "A", patch: "A", passport: "W" })[kind] ?? "T";

export function HomeScreen() {
  const live = useWalletStore((state) => state.live);
  const intents = useWalletStore((state) => state.intents);
  const keypair = useWalletStore((state) => state.keypair);
  const fingerprint = useWalletStore((state) => state.fingerprint);
  const refreshLive = useWalletStore((state) => state.refreshLive);
  const setScreen = useDemoStore((state) => state.setScreen);
  const reduce = useReducedMotion();

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

  const balanceBusy = live.refreshing && !sepolia;
  const balanceError = sepolia && !sepolia.online && sepolia.error ? sepolia.error : null;
  const balanceDisplay = participantWei !== null ? formatEth(participantWei) : null;
  const zeroHonest = participantWei === 0n;

  const stake = evidenceJson.demo.staked;
  const stakeDisplay = formatEth(stake.stakeWei);

  return (
    <motion.section className="screen" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.06 } } }}>
      <motion.div className="screen-heading v2-account-strip" variants={fade}>
        <div>
          <p className="eyebrow">HOME / ACCOUNT OVERVIEW</p>
          <h2>{evidenceJson.ens.name}</h2>
          <span className="v2-owner-chip">OWNER / <b>{truncateHash(SEPOLIA.hookedWallet)}</b></span>
        </div>
        <button type="button" className="button-primary" onClick={() => setScreen("send")} aria-label="Go to Send">Send <span aria-hidden="true">→</span></button>
      </motion.div>

      <motion.div className="v2-zone-b" variants={fade}>
        <article className="v2-panel v2-stat-panel" aria-label="Sepolia balance">
          <p className="v2-kicker">BALANCE / SEPOLIA 11155111</p>
          {balanceBusy ? (
            <span className="v2-skeleton" style={{ width: 150 }} role="status" aria-label="loading balance" />
          ) : sepolia?.online && balanceDisplay ? (
            zeroHonest ? (
              <>
                <strong className="big">0.0000 ETH</strong>
                <p className="v2-caption">0.0000 ETH — reads work; nothing was funded on Sepolia for this address.</p>
              </>
            ) : (
              <strong className="big" title={`${balanceDisplay.full} ETH · ${formatGas(participantWei)} wei`}>{balanceDisplay.display} ETH</strong>
            )
          ) : (
            <>
              <strong className="big v2-dimmed">{lastGood.current.wei !== null ? `${formatEth(lastGood.current.wei)?.display} ETH` : "READ UNAVAILABLE"}</strong>
              {lastGood.current.wei !== null && <span className="v2-chip v2-chip-amber">stale</span>}
              {balanceError && <p className="v2-error" role="alert">{balanceError.slice(0, 160)}</p>}
              {!sepolia && !balanceError && <p className="v2-caption">waiting for the first live read…</p>}
              {balanceError && <button type="button" className="button-quiet" onClick={() => void refreshLive()}>retry</button>}
            </>
          )}
          <span className="v2-stat-foot">block {sepolia?.online && sepolia.blockNumber ? formatGas(Number(sepolia.blockNumber)) : (lastGood.current.block ? `${formatGas(Number(lastGood.current.block))} (last good)` : "—")} · address {truncateHash(SEPOLIA.participant)}</span>
        </article>

        <article className="v2-panel v2-stat-panel" aria-label="Registry stake readback">
          <p className="v2-kicker">STAKE READBACK / REGISTRY</p>
          <strong className="big" title={stakeDisplay ? `${stakeDisplay.full} ETH · ${formatGas(stake.stakeWei)} wei` : undefined}>{stakeDisplay?.display ?? "—"} ETH</strong>
          <StatusChip tone={stake.stakeReadback ? "mint" : "amber"}>{stake.stakeReadback ? "STAKED / READBACK OK" : "STAKED / READBACK PENDING"}</StatusChip>
          <span className="v2-stat-foot">subject {truncateHash(evidenceJson.live.devnet.stakeSubject)} / registry {truncateHash(stake.stakeRegistry)}</span>
          <p className="v2-note-amber">devnet offline — value is committed evidence, not a live read.</p>
        </article>

        <article className="v2-panel v2-stat-panel" aria-label="Session key status">
          <p className="v2-kicker">SESSION KEY</p>
          {keypair ? (
            <>
              <span className="v2-keypanel-state"><i className="v2-dot v2-dot-violet" aria-hidden="true" />ML-DSA-44 READY</span>
              <span className="v2-keypanel-fp">{sessionFpShort ?? "sha256:…"}</span>
            </>
          ) : (
            <span className="v2-keypanel-state"><i className="v2-dot v2-dot-amber v2-dot-hollow" aria-hidden="true" />NOT GENERATED</span>
          )}
          <span className="v2-caption">session-only — refresh clears it</span>
          <button type="button" className="button-quiet v2-keypanel-cta" onClick={() => setScreen("keys")}>{keypair ? "Manage keys →" : "Generate in Keys →"}</button>
        </article>
      </motion.div>

      <motion.div className="v2-shortcuts" variants={fade}>
        <button type="button" className="button-quiet" onClick={() => setScreen("send")} aria-label="Go to Send">Sign a spend intent →</button>
        <button type="button" className="button-quiet" onClick={() => setScreen("keys")} aria-label="Go to Keys">Run the key ceremony →</button>
      </motion.div>

      <motion.div variants={fade}>
        <div className="v2-history-head">
          <div>
            <p className="v2-kicker">ACTIVITY / CAPTURED ARTIFACTS</p>
            <h3>Transaction history</h3>
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
            <span className="v2-c-hash"><span className="v2-dim">see Evidence</span></span>
            <span className="v2-c-status"><StatusChip tone="amber">NOT ACHIEVED</StatusChip></span>
            <span className="v2-c-link"><button type="button" className="button-quiet" onClick={() => setScreen("evidence")} aria-label="Open the Evidence screen">→</button></span>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fade}>
        <div className="v2-history-head">
          <div>
            <p className="v2-kicker">RECENT INTENTS / THIS SESSION</p>
            <h3>Signed spend intents</h3>
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
