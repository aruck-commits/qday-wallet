import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import evidenceJson from "../data/demoEvidence.json";
import { readSepoliaLive } from "../lib/chain";
import { formatGas } from "../lib/format";
import { useWalletStore } from "../lib/walletStore";
import { CountUp } from "./CountUp";

type SepoliaChip = { online: boolean; block: string | null; fails: number; lastGood: string | null };

/**
 * Header chain status cluster (UI spec §2.2): a SEPOLIA chip polled every 12s
 * against public RPC (LIVE with CountUp block / STALE amber / UNREACHABLE red —
 * never a fake-live dot), and an ALT-MEMPOOL chip fed by the wallet store's
 * real gateway probe: LIVE mint (probe answered with chainId) / OFFLINE amber
 * + `last known 11,051` / PROBING hollow before the first probe lands.
 * Demoted, inline copy — never a screen-level banner.
 */
export function ChainStatusChips() {
  const devnet = useWalletStore((state) => state.live.devnet);
  const reduce = useReducedMotion() ?? false;
  const [sepolia, setSepolia] = useState<SepoliaChip>({ online: false, block: null, fails: 0, lastGood: null });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    let alive = true;
    let timer = 0;
    const poll = async () => {
      const result = await readSepoliaLive();
      if (!alive) return;
      setTouched(true);
      setSepolia((prev) => {
        if (result.online && result.blockNumber) return { online: true, block: result.blockNumber, fails: 0, lastGood: result.blockNumber };
        return { online: false, block: null, fails: prev.fails + 1, lastGood: prev.lastGood };
      });
      timer = window.setTimeout(poll, 12_000);
    };
    void poll();
    return () => { alive = false; window.clearTimeout(timer); };
  }, []);

  const sepoliaChip = (() => {
    if (!touched) return <span className="v2-chip"><i className="v2-dot v2-dot-amber v2-dot-hollow" aria-hidden="true" />SEPOLIA · SYNC</span>;
    if (sepolia.online && sepolia.block) {
      return (
        <span className="v2-chip v2-chip-mint" title={`Sepolia block ${formatGas(Number(sepolia.block))} — live public-RPC read, polled every 12s`}>
          <i className={`v2-dot v2-dot-mint ${reduce ? "" : "v2-dot-pulse"}`} aria-hidden="true" />SEPOLIA · LIVE
          <b className="v2-chip-block"><CountUp value={Number(sepolia.block)} format={formatGas} reduce={reduce} /></b>
        </span>
      );
    }
    if (sepolia.fails === 1) {
      return <span className="v2-chip v2-chip-amber" title="Last Sepolia poll failed — showing the last good block"><i className="v2-dot v2-dot-amber" aria-hidden="true" />SEPOLIA · STALE{sepolia.lastGood && <b className="v2-chip-block">{formatGas(Number(sepolia.lastGood))}</b>}</span>;
    }
    return <span className="v2-chip v2-chip-red" title="Sepolia RPC unreachable from this browser"><i className="v2-dot v2-dot-red" aria-hidden="true" />SEPOLIA · UNREACHABLE{sepolia.lastGood && <b className="v2-chip-block">{formatGas(Number(sepolia.lastGood))}</b>}</span>;
  })();

  const altChip = (() => {
    if (!devnet) {
      return <span className="v2-chip" title="Probing the alt-mempool gateway…"><i className="v2-dot v2-dot-amber v2-dot-hollow" aria-hidden="true" />ALT-MEMPOOL · PROBING</span>;
    }
    if (devnet.online) {
      return <span className="v2-chip v2-chip-mint" title={`Gateway responded with chainId ${devnet.chainId ?? "?"}`}><i className="v2-dot v2-dot-mint" aria-hidden="true" />ALT-MEMPOOL · LIVE</span>;
    }
    return (
      <span className="v2-chip v2-chip-amber" title="Gateway last reachable 07 Nov 2026; latest probe 0 peers. Admission attempts cannot be mined.">
        <i className="v2-dot v2-dot-amber" aria-hidden="true" />ALT-MEMPOOL · OFFLINE
        <b className="v2-chip-block">last known {formatGas(evidenceJson.live.devnet.lastBlock ?? 0)}</b>
      </span>
    );
  })();

  return <>{sepoliaChip}{altChip}</>;
}
