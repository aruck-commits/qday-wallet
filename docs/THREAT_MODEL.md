# Threat Model — Q-Day Wallet

STRIDE-lite per component. Trust boundaries are explicit. Companion: VULNERABILITIES.md.

## Assets (ranked)

| rank | asset | protected by |
|---|---|---|
| A1 | funds held by QDayWallet | ML-DSA spend check (only path) |
| A2 | ML-DSA secret key (browser) | session-only memory, encrypted keyfile export |
| A3 | ENS name + PQ record continuity | immutable owner = wallet, rotation via self-call |
| A4 | pk integrity onchain | rotation requires old-key PQ auth |
| A5 | registry truth (Arkiv) | wallet-signed writes, public verify vs chain |

## Trust boundaries

```
[Browser (untrusted host)] ←(user owns)→ [QDayWallet contracts (trusted, unaudited disclosed)]
        │                                             ▲
        ▼ sk generated here; sigs made here            │ verify(pq)
[Relayer EOA / gateway RPC (untrusted, permissionless relaying)]
        ▼ frame serialization by hegota-support (trusted lib)
[canonical mempool (hostile: rejects us)] [sidecar (policy: stake)]
        ▼
[ENSv2 Sepolia (permissions via wallet-granted roles)] [Arkiv Rabdi (entities, TTL)]
```

## Per-component threats

### Browser key ceremony
- T: sk exfiltration (malicious extension/XSS). M: no sk persistence; masked UI; CSP;
  encrypted export; documented as V8 (production answer = OS keystore / MPC-PQ).
- T: weak entropy / wrong algorithm. M: noble `keygen()` CSPRNG; fixed algo constant in UI.

### Frame path (devnet)
- T: sig substitution between schemes (ECDSA masquerade as PQ). M: scheme == ARBITRARY
  enforced in fallback before any sigdatacopy; length checks; fixture test V5.
- T: budget bypass via clean path moving funds. M: clean path restricted to
  addStake/self-views only — spends CANNOT be authorized by SECP256K1 resolution. (V1 mitigation)
- T: HAIG/stake gaming (double-stake, refund griefing). M: our stake is self-owned; flows
  assert stake-zero before re-stake; devnet resets are treated as environment, not exploit.
- T: malicious wallet (ViolatingWallet analog) racing our txs. M: N/A — we reject others;
  our rejection rules recorded verbatim (docs/FINDINGS).

### executePq (Sepolia)
- T: replay (same intent twice). M: pqNonce bumped before low-level call; deadline check.
- T: cross-chain replay. M: chainid inside the intent digest.
- T: relayer front-running grief (censoring the wallet's own op). M: permissionless relaying —
  anyone can resubmit (by design; honest note in README).
- T: rotation lockout (old key lost pre-rotation). M: rotation requires **current** key sig
  only; no admin escape hatch (that's the point). Operational runbook for demo (backups).

### ENS layer
- T: wrong resolver (permissioned vs public) → role confusion (EACUnauthorizedAccountRoles).
  M: ENSjs v2 helper discovery first (decision D4); reads only via UniversalResolver; writes
  tested against the exact resolver instance the wallet controls.
- T: name squat/contest during demo. M: pre-register fallback label list; short TTLs avoided.

### Arkiv layer
- T: stale/false registry entity. M: entities are declarative; chain + explorer remain source
  of truth; entity writes include verifier pointer + expiry; UI shows "registry twin, not truth".
- T: SDK/ledger key theft (relayer account). M: relayer holds no assets; rate-limited key
  follows documented ops; access key git-ignored (`.env.arkiv.local`).

### Supply chain (disclosed, unverifiable here)
- T: malicious/buggy dependency (noble, mldsa-solidity, hegota-support, arkiv sdk). M: noble
  is self-audited + pinned; mldsa-solidity pinned to cloned ref; forge vectors pinned per
  commit; AI attribution files; one-line provenance table in README ("pinned → ref → date").
