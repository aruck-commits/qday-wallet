# Architecture — Q-Day Wallet v1.0

Companion to `specs/SPEC.md`. Diagrams are the source of truth for component contracts.

---

## 1. System overview

```
┌──────────────────────────────  SEPOLIA (11155111)  ─────────────────────────────┐
│  QDayWallet (executePq path) → ENSv2 resolver writes · ENS name owned by wallet │
│         MLDSAKeyFactory + MLDSAVerifier (mldsa-solidity, forged-linked)         │
│                            ↕ relayer EOA (tube)                                 │
├───────────────────────────────  DEVNET (1337)  ─────────────────────────────────┤
│  QDayWallet (frame path)                                                    │
│     │ sig scheme ARBITRARY, ML-DSA sig in frame entry                       │
│     ▼                                                                        │
│  canonical mempool (ethrex)  ──REJECTS──▶ ~100k budget exceeded              │
│     │ (same tx, different target)                                            │
│     ▼                                                                        │
│  standard alt-mempool sidecar (ERC-8421) ──ACCEPTS─▶ mines frame tx ─▶ wallet │
├─────────────────────────────  ARKIV (7794095, Rabdi)  ─────────────────────────┤
│  qday.migration entities: wallet · pqPkHash · status · scheme · swarmRef      │
├─────────────────────────────  SWARM (ethswarm.org)  ──────────────────────────┤
│  public migration passport JSON per wallet (fetched via swarmRef in entity)   │
└──────────────────────────────────────────────────────────────────────────────────┘
        UI (Vite/React) drives all four via app/src/lib/* modules.
```

**One authorization primitive.** ML-DSA-44 signature over a domain-separated 32-byte intent.
**Two carriers.** (a) frame-tx signature entry on the devnet; (b) `executePq` anywhere.
**One contract** (`QDayWallet`), **one verifier**, **one rotation flow** — identical semantics
on both paths; the chain is a property of the intent, not of the code.

---

## 2. The two execution paths

### 2.1 Frame path (devnet 1337) — the EF demo

Sequence (per frame tx):
1. **Intent:** the frame tx's `txparam(SIGNATURE_HASH)` is the spending object.
2. **Domain separation:** `digest = keccak256(abi.encodePacked("QDAY_SPEND_V1", sigHash))`
   → 32 bytes → ML-DSA-44 sign in-browser via noble.
3. **Frame construction:** one signature entry with scheme `ARBITRARY` carrying
   (`digest`, `2420-byte sig`). Exact field offsets via `sigparam(0, SCHEME|SIGNATURE_LENGTH)`
   + `sigdatacopy` — **empirically nailed at G1** and recorded in `docs/FINDINGS.md`.
4. **Wallet fallback (VERIFY frame).** Contract-wall:
   - data empty → *clean path*: require `sigparam(0, RESOLVED_SIGNER) == owner` AND
     `SCHEME == SECP256K1` AND calldata ∈ {NaiveStakingRegistry.addStake | self-views} →
     `approve(EXECUTION_AND_PAYMENT)`. (Stake/setup self-relay only. NO fund movement.)
   - data non-empty → *PQ path*: require `SCHEME == ARBITRARY`, sig length 2420, verify
     ML-DSA-44(digest || pk) with onchain verifier → approve. FOIL every bypass: a
     SECP256K1-resolved frame that carries funds gets no approval without ML-DSA check.
5. **Admission:**
   - `eth_sendRawTransaction` (canonical) → REJECT: frame execution ~2.69M ≫ ~100k budget.
   - `eth_sendFrameTransaction` (sidecar) unstaked → REJECT until staked (workshop pattern).
   - after `addStake` via clean path → ACCEPT + MINED.
6. UI renders all four states with the explorer link for the mined tx.

### 2.2 Direct path (Sepolia + universal fallback)

`executePq(intent, pqSig, target, callData)`:
- anyone can relay (permissionless),
- the wallet is the ONLY authorizer (ML-DSA over intent),
- `intent = keccak256(abi.encode("QDAY_INTENT_V1", chainid, address(this), target,
  keccak256(callData), pqNonce, deadline))`,
- checks: `pqSig.length == 2420`, replay (`pqNonce` bumped before call), `deadline`,
- ENS-role grants point AT the wallet, so PQ authorization ⇒ resolver writes.

This path also underwrites **identity continuity**: `rotatePqKey` is just an `executePq`
self-call; the ENS name's owner address never changes, so the domain survives key rotation.

### 2.3 Residual exposure (V9, honest)

On the devnet the frame envelope itself is still opened by an ECDSA/SECP256K1 helper check
(anti-spam). After EIP-8051 standardization the envelope gets PQ'd too and V9 closes.
Today's attacker needs **both** the ECDSA envelope key AND the ML-DSA spend key (or must
front-run the clean path, which the contract forbids for fund movement). Full truth table
in `docs/VULNERABILITIES.md`.

---

## 3. Contract inventory

| Contract | Where | Source | Notes |
|---|---|---|---|
| `QDayWallet` | devnet + Sepolia | ours (`contracts/src/QDayWallet.sol`) | sole artifact we own |
| `MLDSAVerifier` (+ `MLDSAKeyFactory`, `MLDSAKeyRegistry`) | devnet + Sepolia | `mldsa-solidity` (forged-linked) | registered fast path; unaudited (disclosed) |
| `NaiveStakingRegistry` | devnet | workshop-deployed `0xd51c…22f2` | stake keyed on msg.sender (wallet stakes itself) |
| ENSv2 registrar/registry/resolvers | Sepolia | pinned addresses (AGENTS §3) | read-only for us except via wallet-granted roles |
| Arkiv entities | Rabdi | schema `qday.migration` | not contracts; entities w/ TTL |

---

## 4. Data flows (who writes what)

| Flow | Writer | Payload | Reader |
|---|---|---|---|
| Key ceremony | browser (noble) | pk (1312 B) → deploy arg | chain (constructor) |
| Frame spend | UI → gateway RPC | frame tx (2 frames) | sidecar miner |
| Stake | UI → gateway (legacy, 0.002 gwei) | clean-path self-relay tx | NaiveStakingRegistry |
| ENS write | relayer → Sepolia | executePq(intent, sig, resolver, setText) | UniversalResolver |
| Rotation (devnet-side identity) | UI → executePq(self) | rotateAbi(newPk) | wallet storage + Arkiv patch |
| Registry | UI → Arkiv SDK | entity create/patch + watch feed | Registry screen |
| Passport (Swarm) | UI → Swarm gateway | passport JSON upload; get reference → patch `swarmRef` | Registry drawer |

Arkiv entity is **declarative state**, not source of truth (chain is); it is the public,
queryable twin for humans/integrators (that is the why-arkiv.md story).

---

## 5. Repo ↔ runtime map

```
qday-wallet/
├─ AGENTS.md, README.md, AI_USAGE.md
├─ specs/{SPEC,ARCHITECTURE,UI_SPEC}.md · specs/prompts/*.md
├─ docs/{VULNERABILITIES,THREAT_MODEL,GAS,FINDINGS}.md
├─ arkiv/{schema,friction,reach,why-arkiv,how-you-use-arkiv}.md
├─ contracts/         # forge project (solc 0.8.28, via_ir, cancun); QDayWallet.t.sol
├─ scripts/           # deploy:devnet · demo:mempool · demo:spike · ens:{register,write,rotate}
│                     # arkiv:sync · swarm:passport · gen:vectors (tsx, viem)
├─ app/               # Vite+React+TS+Tailwind+framer-motion+zustand; src/lib/* per SPEC §6
└─ test/fixtures/pq.json   # noble-generated vectors (committed)
```

Runtime deps pinned in package.json (exact versions resolved at scaffold; noble = 0.7.x,
mldsa-solidity pinned to the cloned ref `skalenetwork/mldsa-solidity` main @ scaffold date).
