# Q-Day Wallet — Master Build Spec v1.0

**Project:** Q-Day Wallet · **Repo:** `qday-wallet` · **Event:** ETHGlobal Mumbai (Nov 5–7 2026)
**Deadline:** Sat Nov 7, 09:00 IST · **Builder:** solo (human) + AI agents (opencode/Codex/Pi)
**Status:** SPEC LOCKED — change only via documented amendments in this file.

> Companion files: `AGENTS.md` (agent rules) · `specs/ARCHITECTURE.md` · `specs/UI_SPEC.md`
> `docs/VULNERABILITIES.md` · `docs/THREAT_MODEL.md` · `docs/GAS.md` · `docs/FINDINGS.md` · `/arkiv/*`

---

## 1. Mission & prize stack

**Product sentence:** a quantum-safe smart wallet whose spend authorization is **NIST ML-DSA-44
(FIPS 204)** — verification that only fits Ethereum's mempool infrastructure through
**EIP-8141 frame transactions on the standard alt-mempool**, with identity continuity on
**ENSv2** and a public migration registry on **Arkiv**.

**Narrative anchors (verbatim in README/video):** Vitalik at Devcon 8 Mumbai (Nov 3, 2026)
on AI-assisted cryptoanalysis; Justin Drake (EF) proposing the accelerated PQ transition to
**December 2028**; "harvest now, decrypt later" — every address that has ever sent a
transaction exposes its ECDSA public key permanently.

| Pick | Partner / prize | Pool | Why we win it |
|---|---|---|---|
| 1 | **EF — Best use of the Frame Transaction Alternative Mempool** | $5K ($2.5K 1st) | The prize text names "PQ-secure smart wallets" needing verification budget >100k as the flagship use case — we ARE the flagship example |
| 2 | **ENS — Best use of ENSv2** | $7K ($3K 1st) | PQ-authorized identity administration: EAC roles + record writes + key rotation that survives (name owner unchanged) |
| 3 | **Arkiv — Build on Arkiv (from scratch)** | $4K ($3K 1st) | Migration registry: wallet → pq key hash → status → expiry; 4 graded feedback files; Swarm bonus possible |

**Fallbacks (pre-decided, do not reopen):** EF fails → **EF CROPS $3.5K** on the same codebase
("wallet whose keys a quantum attacker can't use" = the Secure property). ENS fails (no test
ETH) → 2-pick strategy, effort shifts to UI. Arkiv is never dropped (cheapest qualification).

**Hard submission rules that shape architecture:** ≤3 partner prizes selected; AI attribution
files (`AI_USAGE.md` + `specs/prompts/`) committed as-you-go; git history evenly distributed;
required `/arkiv/` files at exact paths; README must cite exact contract addresses + line numbers.

---

## 2. Product definition

### 2.1 What the user experiences (demo object)

1. **Key ceremony:** click → browser generates an ML-DSA-44 keypair (`@noble/post-quantum`);
   UI shows pk fingerprint + size stats (1312/2560/2420 bytes) side-by-side with the owner
   EOA's exposed-ECDSA warning ("harvestable since first tx").
2. **Sign & send:** enter recipient → sign spend intent → UI builds the frame tx with an
   **ARBITRARY** signature entry carrying the 2420-byte ML-DSA sig → submits.
3. **The mempool split (money shot):** canonical mempool **REJECTS** (budget >100k) → UI
   shows the exact rule; sidecar rejects unstaked → user **stakes** (0.012 ETH clean-path)
   → resubmit → sidecar **ACCEPTS & MINES** → explorer link.
4. **Identity:** ENSv2 name owned by the wallet on Sepolia; records set via
   `executePq` (relayed, PQ-authorized); key rotation → name survives (owner unchanged).
5. **Registry:** Arkiv entity = `wallet / pqPkHash / status / verifier / expiry`; patched on
   rotation; queryable + watch-events live feed.

### 2.2 Security model (the honest claim, referenced in every doc)

- **Secures:** spend authorization (the signature layer) against a hypothetically broken
  secp256k1 — including harvest-now-decrypt-later exposure of the ECDSA pubkey.
- **Does NOT secure:** contract bugs, phishing/malware, consensus BLS (separate EF workstream),
  offchain data encryption, the residual V9 (dual-sig today, see `VULNERABILITIES.md`).
- The ECDSA layer that remains on the devnet envelope (clean-path txs / stake) is **defensive
  anti-spam**, not spend authority: fund movement ALWAYS requires the ML-DSA check inside
  the wallet. Post-EIP-8051, the ECDSA residue disappears.

### 2.3 Non-goals

Multi-key wallets, UI-external production UX, mobile, audits, ML-DSA-65/87 (the `IPQVerifier`
interface + factory pattern is the stated future path, not an implementation), consensus/BLS.

---

## 3. Pinned integration facts

All pinned constants live in **`AGENTS.md §3`** (single source of truth; UI/scripts read
`app/src/lib/chains.ts` which inlines the same values with a pointer comment).

Summary of load-bearing facts:
- Devnet 1337: gateway/explorer/registry/entryPoint as pinned; profile `ethrex-eip8141-tracer`
  with **ARBITRARY sig scheme accepted (probed 2026-10-24)**; contract-nonce-8 quirk;
  faucet-only funding; 6M deploy gas; storage read of a non-owned contract = canonical
  `StorageReadNonSender` rejection (workshop proven) — our PQ_VERIFY frame over budget is the
  analogous rejection for us (exact rule name = **G1 empirical output**).
- noble API arg order `verify(sig, msg, publicKey)`; every sig = **32-byte digest** signed.
- mldsa-solidity: 2.69M registered / 5.76M full; factory precompute 5.54M+2.29M; unaudited.
- ENSv2 Sepolia commit-reveal (60 s), MockUSDC free mint, resolver roles vs registry roles
  (EACUnauthorizedAccountRoles trap documented), DNS-encoded names for resolver setters.
- Arkiv: access key mandatory, tGLM faucet, schema-scoped queries, expiry + native events.

---

## 4. Architecture

See `specs/ARCHITECTURE.md` for the full system diagram, the two execution paths
(frame path on devnet / direct path anywhere) with sequence flows, contract inventory and
data flows. The one-sentence architecture:

> **One authorization primitive (ML-DSA over a domain-separated 32-byte intent), two carriers:**
> a frame-tx signature entry on the devnet (the EF demo) and `executePq(intent, sig, target, data)`
> anywhere else (the ENS demo) — one `QDayWallet.sol`, one verifier, one rotation flow.

---

## 5. Smart contract spec (`contracts/src/QDayWallet.sol`)

Pure-Solidity contract, inherits `HegotaSupport(Devnet.ERC8421_WORKSHOP)` (from
`@forshtat/hegota-support`), uses `IMLDSAVerifier` (`mldsa-solidity`), MIT-licensed.
Compiler: solc 0.8.28, `via_ir = true`, `evm_version = cancun` (matches workshop toolchain).

```solidity
contract QDayWallet is HegotaSupport(Devnet.ERC8421_WORKSHOP) {
    address        public immutable owner;     // EOA of record: clean-path/stake authority
    IMLDSAVerifier public immutable verifier; // fixed at construction; never changed (interface rule)
    bytes          public pqPublicKey;         // 1312 B ML-DSA-44 pk (storage → rotatable)
    uint64         public pqKeyVersion;
    uint256        public pqNonce;             // executePq replay protection

    event PqKeyRotated(uint64 indexed version, bytes32 indexed pkHash);
    event PqExecuted(address indexed target, bytes32 indexed intentHash, uint256 nonce);
    event Staked(uint256 amount);

    constructor(address owner_, IMLDSAVerifier verifier_, bytes calldata pk_) payable;
    // REQUIREMENTS: pk_.length == 1312; deploy funded via creation value only (devnet rule).

    /// FRAME PATH (devnet). Target: this wallet, scope EXECUTION_AND_PAYMENT.
    fallback() external payable { /* two branches — exact pseudocode in ARCHITECTURE §2.1 */ }

    /// DIRECT PATH (Sepolia + universal fallback). Anyone relays; wallet authorizes ML-DSA.
    function executePq(bytes32 intent, bytes calldata pqSig, address target, bytes calldata callData)
        external payable returns (bytes memory);

    /// PQ-authorized rotation: target == address(this), callData == rotateAbi(newPk).
    /// Enforced checks: sig length, pq length, pqNonce underflow boundaries, no self-call depth issues.

    // views: pqPkHash() (keccak of stored pk) · keyVersion() · currentIntent(target, callData) (tx simulation helper)
}
```

### Exact semantics to implement (no ambiguity allowed)

1. **Intent construction (both paths):**
   `intent = keccak256(abi.encode("QDAY_INTENT_V1", block.chainid, address(this), target,
   keccak256(callData), pqNonce, deadline))`
   Frame path derives the same binding from `txparam(SIGNATURE_HASH)` instead of
   `target/callData/nonce` (the frame tx itself carries those) →
   `digest = keccak256(abi.encodePacked("QDAY_SPEND_V1", uint256(txparam(SIGNATURE_HASH))))`.
2. **Frame-path branches:**
   - empty VERIFY-frame data → *clean path* (staking/setup): require
     `sigparam(0, RESOLVED_SIGNER) == owner` AND `sigparam(0, SCHEME) == SECP256K1` →
     `approve(Scope.EXECUTION_AND_PAYMENT)`.
   - non-empty VERIFY-frame data → *PQ path*: require `sigparam(0, SCHEME) == ARBITRARY`;
     copy the entry's msg + signature via `sigparam`/`sigdatacopy` (exact field layout is
     **G1 empirical output**, stored in `docs/FINDINGS.md`); verify ML-DSA-44 over the digest
     with the stored pk; then approve. **Spend cannot pass the clean path** — the wallet never
     approves a SECP256K1-resolved signature that would move funds without the PQ check being
     in the frame (clean path exists solely for stake/setup txs, whose calldata is restricted
     to `NaiveStakingRegistry.addStake` or self-views).
3. **executePq:** decode/recheck the intent binding, `verifier.verify(ML_DSA_44, pqPublicKey,
   intent, pqSig)`, bump `pqNonce` **before** the call (reentrancy pattern), low-level call,
   bubble revert reason, emit `PqExecuted`. Wallet never holds custody assumptions of incoming
   ETH beyond its balance (fallback is payable due to frame protocol).
4. **rotatePqKey (via executePq, target == self):** require 1312-byte pk, verify
   intent＝rotate calldata, write pk, `++pqKeyVersion`, emit `PqKeyRotated`. Old key
   signatures die automatically (they verify against the new pk).
5. **Gas budget knobs (constants, overridable at deploy by the deploy script):**
   VERIFY-frame execution limit = **3,200,000** (registered fast path) / **6,500,000** (full
   compute); SENDER frame = 50k exec + 200k state (workshop-proven numbers).

### Tests (`contracts/test/QDayWallet.t.sol`, reuse HegotaMocks pattern from the workshop)

Fixtures generated by `scripts/gen_vectors.ts` (noble) → committed JSON read via
`vm.readFile` + `stdJson`. Cases:
1. happy: valid PQ sig (vector) → approves; frame tx would execute
2. bit-flipped sig → `false`, tx rejected in frame
3. wrong scheme (SECP256K1 on a PQ-path frame) → rejected
4. clean path happy (owner sig, empty data, addStake calldata only)
5. clean path negative: non-owner signer; clean path carrying non-stake calldata → rejected
6. executePq happy across intents (different target/call data ⇒ different digest)
7. executePq replay: same intent reused → rejected; nonce-bump ordering check
8. rotatePqKey: old vector fails; new vector passes; version increments; name-owner address
   unchanged (identity continuity asserted in ENS snippet docs)
9. gas snapshot: registered vs full path (documented in `docs/GAS.md`)

---

## 6. Client library layer (`app/src/lib/`)

| module | content |
|---|---|
| `pq.ts` | noble wrappers: keygen, digest builder (`sdkDigest[intent]`), sign, verify, size consts, hex grid helpers for key ceremony UI |
| `frame/` | OUR thin binding over `@forshtat/hegota-support` (mirrors the workshop reference pattern): `newTx/frame/sigScheme`, `signTx`, `toWire`, `txHash`, `sendFrameTx` / `sendRawFrameTx` against `gatewayUrl` |
| `ens.ts` | viem clients (registry/registrar/resolver ABIs from the contracts-v2 repo), separate (better-)devnet/Sepolia config, `executePq` relayer call builder, `getEnsResolver/getEnsText` reads through the universal resolver |
| `arkiv.ts` | schema (`qday.migration`), public+wallet client with access key, create/patch/select/watch helpers, expiry mapping |
| `chains.ts` | all pinned addresses constant-folded + comment referencing AGENTS.md §3 |
| `gas.ts` | gas table constants (UI renders counters), sources |
| `format.ts` | compact hex/bytes util, abbreviations, copy helper |

---

## 7. Integration playbooks

### 7.1 Devnet demo (EF) — the script that must never fail (idempotent + `--fresh`)

```
[A] submit PQ frame tx to canonical (eth_sendRawTransaction)     → expected REJECT; capture rule + explorer context
[B] submit same tx to sidecar (eth_sendFrameTransaction), unstaked → expected REJECT (budget-type rule)
[C] stake via self-relay clean-path tx (addStake(0.012, 86400))   → expected MINED; wallet is a staked entity
[D] resubmit [B] tx to sidecar                                    → expected ACCEPT + MINED; capture explorer URL + trace
```
Each step prints one structured JSON line. `[A]–[D]` plus their `docs/FINDINGS.md` entries are
the EF qualification payload. Never run step [C] on an expected-reject wallet unknowingly
(double-staked ≠ failure, but state differs; the script asserts stake-before-zero).

### 7.2 ENSv2 (Sepolia) — PQ-secured identity administration

Precondition (hard, Friday AM): relayer EOA funded with Sepolia ETH via faucet(s) or the ENS
team. Steps:
1. `MockUSDC.mint(relayer, 100e6)` → `approve(registrar, price)` (price via `getRegisterPrice`)
2. `makeCommitment(label, owner=QDayWallet, secret, 0x0 subregistry, resolver)` → `commit` →
   wait ≥60 s → `register(...)` → wallet owns `<label>.eth`
3. Resolver strategy (decision gate D4): **first try ENSjs v2 helpers** (they discover the
   writable resolver), else deploy/clone PermissionedResolver per contracts-v2 pattern, else
   PublicResolverV2. Wire roles: the EAC role holder for resolver writes MUST be an address
   that executePq can act FOR (the wallet), via `grantSetterRoles` on the resolver when we
   control its deployment.
4. `ens:write` → relayer calls `QDayWallet.executePq(intent, sig, resolver, setText(dns, ...))`
   → verify via `getEnsText` through the Universal Resolver (never hardcode it).
5. `ens:rotate` → `rotatePqKey` (PQ-authorized via old-key intent) → name resolution unchanged
   (owner address identity preserved) → record still resolves.

### 7.3 Arkiv

1. Access key + faucet tGLM (hard task Friday AM).
2. `arkiv:sync` writes/patches entities: `{wallet, pqPkHash, status, scheme:"ML-DSA-44",
   verifier, ensName?, note?}` with 30-day lifetime; rotation patches → status `ROTATED` + new hash.
3. UI live-feed: `watch` events + filtered select queries (status / wallet eq) in the Registry screen.
4. **Swarm (G5b)**: upload the public **migration passport JSON** (wallet, pqPkHash, scheme,
   verifier, ensName, pqKeyVersion, history, timestamp) to Swarm → write its reference into
   the entity's `swarmRef` field → Registry drawer fetches + renders it (the bonus's read
   path). Public passport content only — never a key-bearing reference (Arkiv entities are
   public). 1 h spike caps total effort.

---

## 8. Gates, schedule, cut list

Gates G0–G6 with pass criteria and fallbacks, master schedule (Thu night → Sat 07:45),
and the ordered cut list are all defined in **`AGENTS.md §6–§7`** — do not duplicate here.

---

## 9. Submission package checklist (final gate G7)

- [ ] Repo pushed; ≥25 meaningful commits spread over the 2 days; no end mega-commit
- [ ] `README.md`: hook quote → architecture → **DEMO section with ≥1 devnet explorer link
      + captured rejection rule** → gas table (sourced) → honest limitations (V-list) →
      exact contract addresses + line numbers (EF + ENS)
- [ ] `AI_USAGE.md` + `specs/prompts/*` (ongoing, not reconstructed)
- [ ] `/arkiv/swarm.md` (Arkiv + Swarm bonus): what's on Swarm vs Arkiv · `swarmRef` as the
      reference field · one entity key + openable Swarm link · friction notes. Bonus stacks
      on the Arkiv track, uses NO extra pick — select at form-time only if G5b passed
- [ ] `/arkiv/schema.md`, `friction.md`, `reach.md`, `why-arkiv.md`, `how-you-use-arkiv.md`
      — exact paths, genuine content (friction/reach written AFTER real usage of the SDK)
- [ ] `docs/`: SPEC/ARCHITECTURE/UI_SPEC/VULNERABILITIES/THREAT\_MODEL/GAS/FINDINGS
- [ ] `forge test` green, `yarn typecheck` green, `app:build` green
- [ ] Form-time: exactly EF + ENS + Arkiv selected; integration write-ups pasted;
      Arkiv + Swarm bonus selected iff G5b passed (stacks, no pick consumed)

---

## 10. Risk register (product-level)

| # | Risk | P | Mitigation |
|---|---|---|---|
| R1 | ARBITRARY/budget rule semantics differ from assumptions | Med | empirically captured at G1 before any contract code is finalized; Path B fallback |
| R2 | Devnet flaky/timeout, resets | Med | idempotent `--fresh` scripts, error-table discipline, bounded retries |
| R3 | Sepolia ETH / Arkiv key unavailable | Med | Friday AM hard-gate tasks; 2-pick fallback |
| R4 | PermissionedResolver deployment friction | Med | ENSjs v2 helpers first (decision D4) |
| R5 | Codex budget burn / agent productivity | Med | tight gating, `AGENTS.md` discipline, Pi AI docs lane |
| R6 | In-frame verify gas > declared limit | Low | gas knobs 3.2M/6.5M; factory precompute; debug-first verification |
| R7 | "It's just kohaku" dismissal | Low | different admission path + identity + registry story; booth pre-validation |
| R8 | Swarm upload friction (gateway/postage path unmeasured) | Med | 1 h spike cap at G5b; drop the bonus if blocked, keep the Arkiv track |

---

## 11. Open build-time questions (must be resolved empirically, then MOVED INTO FACTS)

1. **G1:** what is the canonical mempool's actual rejection rule string for budget-type
   violations (name goes in README verbatim, and the rejections are demo copy)?
2. **G1:** exact `sigparam`/`sigdatacopy` field layout for an ARBITRARY entry (msg vs
   signature bytes offsets)? (Recorded in `docs/FINDINGS.md`.)
3. **D4:** PermissionedResolver instance-deploy exact pattern (from enscontracts v2 source);
   or ENSjs helper path chosen by experiment.
4. **G3:** sidecar's unstaked vs staked behavior for a >100k VERIFY frame — exact
   reputation/stake deltas observed.
5. **G4b:** does `EthRegistrar.getRegisterPrice` accept arbitrary paymentToken list at the
   time we call it (MockUSDC + MockDAI confirmed; keep only MockUSDC in flows).

These are **not** design risks — each has an assigned empirical erase-time slot in the
G-table. No design decision above is contingent on more desk research.

---

*End of SPEC.md v1.0. Schema lock: this file is the record of intent for the full build.
It travels into the repo (`specs/SPEC.md`) and into ETHGlobal AI-usage disclosure.*
