import { CountNumber } from "./CountNumber";
import { formatEth } from "../lib/format";
import type { SepoliaLive } from "../lib/chain";

/** Decimal-ETH string ("0.549661") → wei bigint. Shared by Home's live reads. */
export function ethStringToWei(eth: string): bigint | null {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(eth.trim());
  if (!match) return null;
  const fraction = (match[2] ?? "").padEnd(18, "0").slice(0, 18);
  try { return BigInt(match[1] + fraction); } catch { return null; }
}

/**
 * LedgerStrip (UI spec §5): one hairline-topped mono line carrying the four
 * live ledger values — name · balance+block · stake · session key. Count-ups
 * fire on CHANGE only (never idle-spinning, §8). Stale/offline values dim
 * with an amber `stale` chip; a zero balance keeps the honest "reads work;
 * nothing was funded" copy. The stake is committed evidence, so it renders
 * STATIC with a COMMITTED chip — no count-up on committed numbers.
 */
export function LedgerStrip({ sepolia, lastGoodWei, lastGoodBlock, stakeDisplay, stakeReadback, hasKey, reduce }: {
  sepolia: SepoliaLive | null;
  /** last good participant balance in wei (shown dimmed when the live read fails) */
  lastGoodWei: bigint | null;
  lastGoodBlock: string | null;
  stakeDisplay: string | null;
  stakeReadback: boolean;
  hasKey: boolean;
  reduce: boolean;
}) {
  const online = sepolia?.online === true;
  const liveWei = online ? ethStringToWei(sepolia?.balances?.participant ?? "") : null;
  const shownWei = liveWei ?? lastGoodWei;
  const liveBlock = online && sepolia ? sepolia.blockNumber : null;
  const shownBlock = liveBlock ?? lastGoodBlock;
  const stale = !online && shownWei !== null;
  const zero = liveWei === 0n;
  const balanceDisplay = shownWei !== null ? formatEth(shownWei) : null;
  const balanceNum = balanceDisplay ? Number(balanceDisplay.display) : null;

  return (
    <div className="v3-ledgerstrip" aria-label="Live ledger values">
      <span><span className="v3-ls-k">name</span>qdaywallet.eth</span>
      <i className="v3-ls-sep" aria-hidden="true">·</i>
      <span className={stale ? "v3-ls-dim" : undefined}>
        <span className="v3-ls-k">sepolia</span>
        {balanceNum !== null && Number.isFinite(balanceNum) ? (
          <>
            <CountNumber value={balanceNum} decimals={4} reduce={reduce} /> ETH on Sepolia
            {shownBlock && (
              <>
                {" "}(block{" "}
                <CountNumber value={Number(shownBlock)} reduce={reduce} format={(n) => n.toLocaleString("en-US")} />
                )
              </>
            )}
            {zero && <span className="v3-ls-note"> — reads work; nothing was funded on Sepolia for this address.</span>}
          </>
        ) : (
          <>READ UNAVAILABLE{stale ? " — showing last good values" : ""}</>
        )}
        {stale && <span className="v2-chip v2-chip-amber" style={{ marginLeft: 8 }}>stale</span>}
      </span>
      <i className="v3-ls-sep" aria-hidden="true">·</i>
      <span>
        <span className="v3-ls-k">stake</span>
        {stakeDisplay ?? "—"} ETH staked (registry readback {stakeReadback ? "OK" : "PENDING"})
        <span className="v2-chip v2-chip-amber" style={{ marginLeft: 8 }} title="Committed build-time evidence — the devnet gateway has been offline since 07 Nov 2026">committed</span>
      </span>
      <i className="v3-ls-sep" aria-hidden="true">·</i>
      <span>
        <span className="v3-ls-k">session key</span>
        {hasKey ? (
          <span style={{ color: "var(--violet)" }}>ML-DSA-44 READY</span>
        ) : (
          <span className="v3-ls-dim">NOT GENERATED</span>
        )}
      </span>
    </div>
  );
}
