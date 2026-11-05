# Vulnerabilities — Q-Day Wallet (honest-claims document)

Judges reward precision here. This file is linked from the README hero section.
Status: **living document** — updated as fixes land; final version frozen at submission.

---

## Threat scope (one line)

We defend **spend authorization** — the layer a broken secp256k1 destroys — for one wallet
class, against the harvest-now-decrypt-later attack, and we keep identity (ENS names) alive
across PQ key rotation. Everything else is out of scope and listed as such.

## What we secure

- Fund movement always requires a valid **ML-DSA-44** signature over a domain-separated
  32-byte intent bound to `chainid + wallet + target + calldata + nonce + deadline`.
- **Replay protection** (per-wallet `pqNonce` + deadline) and **cross-chain replay** protection
  (chainid in the intent).
- **Identity continuity:** ENS name owner is the (immutable) wallet address; PQ keys rotate
  without transferring/admin-changing the name.
- **Provable key hygiene:** every verification runs against the onchain-stored pk; rotated
  keys invalidate old signatures by construction.

## What we do NOT secure (stated on every relevant screen)

1. Contract bugs (QDayWallet, mldsa-solidity verifier, hegota-support) — **unaudited**.
2. Phishing / malware / key-management mistakes (a PQ key is still a key you can leak).
3. Consensus-layer BLS signatures (a separate EF workstream; not ours).
4. Offchain data confidentiality (we never encrypt anything; public registry by design).
5. Availability (devnet/gateway/Arkiv outages).

---

## V-list (live mitigations tracked)

| # | Vulnerability | Status | Where |
|---|---|---|---|
| V1 | EOA spend authorization is harvestable (every tx leaks the ECDSA pubkey) | **mitigated** — PQ path is spend authority | frame PQ path / executePq |
| V2 | Single PQ key compromises the wallet forever | **mitigated** — pqNonce + rotation invalidate old sigs | executePq/rotatePqKey |
| V3 | Cross-chain/intent replay | **mitigated** — chainid in intent | intent encoder |
| V4 | Signature malleability / wrong-arg-order bugs (noble `verify(sig, msg, pk)` trap) | **mitigated** — fixtures + forge test vectors | gen:vectors + tests |
| V5 | Byte-fragility in frame sig pointers (ARBITRARY layout) | **empirical at G1** — layout locked in FINDINGS with a fixture test | demo:spike |
| V6 | In-frame verify gas exceeding budget under load | **mitigated** — registered fast path (2.69M) + factory precompute; 3.2M/6.5M knobs | contracts + GAS.md |
| V7 | Chain-service outages (gateway, gateway RPC, Arkiv) | **accepted** — dry-run UI mode; document unavailability honestly | UI store |
| V8 | Key ceremony UX (sk exfiltration at generation time) | **accepted (demo scope)** — masked UI, encrypted export, no persistence; production requires OS keystore | S2 screen |
| V9 | Devnet frame **envelope** remains ECDSA-authorized (anti-spam) — dual-sig residual | **open, disclosed** — attacker needs BOTH keys; closes when EIP-8051 envelopes go PQ | ARCHITECTURE §2.3 |
| V10 | Verifier unaudited; ML-DSA-44 verifier is skalenetwork/mldsa-solidity (MIT) | **open, disclosed** — NIST ACVP-known vectors pass in our forge suite | README badge |

## Assumption register (what this design bets on)

1. EIP-8141/ERC-8421 adoption directions hold (the EF prize's own evidence).
2. FIPS 204 (ML-DSA-44) remains the deployed PQ standard for settlement layers.
3. secp256k1ECDSA remains harvestable via HNDL until envelopes naturally go PQ (EIP-8051).
4. Fast-path precompute drift is captured by re-running the factory before any public event.
