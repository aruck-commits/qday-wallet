# AGENTS.md — Q-Day Wallet (agent build instructions)

You are an AI agent helping a **solo developer** build **Q-Day Wallet** for ETHGlobal Mumbai
(Nov 5–7 2026, submission deadline **Sat Nov 7, 09:00 IST**). Human-workflow rules below are
non-negotiable because **ETHGlobal judges analyze the git history and AI attribution**.

> Master spec: [`specs/SPEC.md`](specs/SPEC.md) · Architecture: [`specs/ARCHITECTURE.md`](specs/ARCHITECTURE.md)
> UI: [`specs/UI_SPEC.md`](specs/UI_SPEC.md) · Threats: [`docs/VULNERABILITIES.md`](docs/VULNERABILITIES.md)

---

## 1. What we are building (one paragraph)

A quantum-safe smart wallet whose spends are authorized by **NIST ML-DSA-44 (FIPS 204)**.
The verification costs ~2.69M gas, which is why it can ONLY be admitted through
**EIP-8141 frame transactions on the standard alt-mempool** (canonical mempool's ~100k
verification budget rejects it) — that mechanism is the live demo. Identity continuity via
**ENSv2** (PQ-authorized record writes + key rotation that preserves the name). Public
migration registry on **Arkiv** + public migration passport on **Swarm** (Arkiv + Swarm
bonus: $500 — stacks, no extra pick). Three picks: EF Alt-Mempool, ENSv2, Arkiv.

## 2. Toolchain

| Tool | Use |
|---|---|
| Foundry (`forge`) | contracts (`contracts/`, solc **0.8.28**, `via_ir`, evm **cancun**) |
| `tsx` / Node ≥20.12 | all scripts (`scripts/*.ts`), vitest for TS unit tests |
| viem | EVERY chain interaction (devnet, Sepolia) |
| `@forshtat/hegota-support` | frame-tx codec — **the ONLY sanctioned dependency for frame serialization** |
| `@noble/post-quantum` | ML-DSA-44 in TS/browser — **subpath imports only**: `@noble/post-quantum/ml-dsa.js` |
| `@arkiv-network/sdk` | Arkiv entities (Rabdi testnet) |
| Vite + React 18 + TS + Tailwind + framer-motion + zustand | the app (`app/`) |

Never vendored/allowed: `skandha` build artifacts, workshop repo imports into our runtime
code (reference-only reading is fine), MetaMask/wagmi dependency in the demo path.

## 3. Pinned constants (source of truth — never re-derive)

### Devnet (EIP-8141 workshop chain, **chainId 1337**)
```
gateway RPC:      https://altmempoolgateway.forshtat.com/rpc
explorer:         https://explorer.altmempool.wtf/          (tx search = explorer URL + tx hash)
staking registry: 0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f   (NaiveStakingRegistry, stake keyed on msg.sender)
minStake:         0.01 ETH  → we stake 0.012 ETH with unstakeDelaySec 86400
entryPoint:       0x00000000000000000000000000000000000000aa  (sentinel)
profile:          "ethrex-eip8141-tracer"  (@forshtat/hegota-support/profiles)
sigSchemes:       { ARBITRARY: 0x0, SECP256K1: 0x1, P256: 0x2 }   // ARBITRARY probed-accepted on devnet 2026-10-24
submit (alt):     eth_sendFrameTransaction  (sidecar gateway)
submit (canon):   eth_sendRawTransaction    (gateway forwards to ethrex)
demo recipient:   funder key from faucet; transfer 1 gwei like the workshop
```
Profile notes: frame modes `{ DEFAULT 0, VERIFY 1, SENDER 2 }`; approve scopes
`{PAYMENT 0x1, EXECUTION 0x2, EXECUTION_AND_PAYMENT 0x3}`; txType per profile (0x06 on ethrex).
Contract-wall nonces start at **8** (`HegotaSupport` constructor creates 7 helper contracts).
Funding ONLY via faucet (`skandha_explorer_faucet`); **never** use or search for a genesis key.
Contract deploy: creation `value` funding, legacy gasPrice 0.002 gwei, **6M deploy gas**.

### PQ stack
```
ml_dsa44: pk 1312 B · sk 2560 B · sig 2420 B
noble API: keygen(seed?) → {publicKey, secretKey}; sign(msg, secretKey) → sig; verify(sig, msg, publicKey)
IMLDSAVerifier.verify(ParamSet, publicKey, message, signature) → bool   (ParamSet 0 = ML-DSA-44)
  → message MUST be a 32-byte digest (+89k gas per extra 136 B)
IPQVerifier ERC-165: 0x97b4ac55 · algo ids ML-DSA-44/65/87 = 0x0101/0x0102/0x0103
gas (forge-measured, 32 B msg): registered 2.69M / full 5.76M (ML-DSA-44)
precompute: MLDSAKeyFactory.registerA (5.54M) + registerT (2.29M) → verify hits fast path
key registry rotation: EIP-712 by CURRENT key over {id, version, newSet, newKeyHash} (optional layer)
```

### ENSv2 (Sepolia, chainId 11155111)
```
ETHRegistrar:      0xf633e7fc17e2bbe0d0965d18ec1821dcb754a3d3   (commit-reveal, MIN_COMMITMENT_AGE 60 s)
ETHRegistry:       0xd4ebcbbdf463c9c45784603db0ddd499bc44a8b4   (Permissioned Registry for .eth)
MockUSDC:          0x240b0316df57887dbbe58b586508b19e633a14aa   (free mint, 6 decimals; 5+ char name = $8/yr)
PermissionedResolverImpl: 0x115eb53f0c60696633855f90b138178fb40b2b2c
PublicResolverV2 (fallback): 0xdc4a563d00f5c3012b699794eb9e13a561be386f
UniversalResolverV2: 0x24e1d8e068620b647ca097f961a61055f4f42d72 (library ships it — DO NOT hardcode)
VerifiableFactory: 0xda70306c98e97ece36f997a21368e53298572991
UserRegistryImpl:  0x9bd8a88719068d09ecee662f36c0e3856708366a
LabelStore:        0xed8246ff02203a4d4cb262bd78beaa7408a57cae
registration roles → owner: ROLE_SET_RESOLVER(+admin 1<<24), ROLE_SET_SUBREGISTRY(+admin 1<<20),
                                     ROLE_CAN_TRANSFER_ADMIN
resolver setters take DNS-encoded names: toHex(packetToBytes(normalize(name))) in viem
```

### Arkiv (Rabdi testnet, network ID **7794095**)
```
RPC:       https://rpc.rabdi.db-chain.testnet.arkiv.network   (+ WSS same host)
explorer:  https://rabdi.explorer.arkiv.network
faucet:    https://hub.arkiv.network/faucet        (tGLM)
access key REQUIRED:  https://hub.arkiv.network/access-keys   (public RPC rate-limited)
SDK:       @arkiv-network/sdk · chain helper `rabdi({ accessKey })`
schema tag: "qday.migration"  (replace scope: repo root constant in app/src/lib/arkiv.ts)
```

## 4. Golden rules (breaking these = losing the prizes)

1. **Commit discipline:** commit every 30–45 min with meaningful messages. No "future work"
   placeholder commits, no single mega-commit on Saturday. History is judged.
2. **AI attribution is mandatory:** every meaningful prompt/session → `specs/prompts/YYYY-MM-DD-<topic>.md`.
   Tool usage recorded in `AI_USAGE.md` as you go, never reconstructed later.
3. **Keys are secrets:** faucet/relayer keys and `.workshop-state.json` stay git-ignored.
   Sample-data keys used in demos may be committed; funded keys never.
4. **Never guess a rejection:** if a tx is rejected, run the debug command and quote the
   returned `{code, rule, hint}` verbatim in `docs/FINDINGS.md`. Rule-by-rule reports go in the README.
5. **Assert, don't assume:** every script ends in an assertion of the expected outcome (or a
   structured `{ok:false,...}`) — scripts are cheap, silent divergence is expensive.
6. ** forge test and typecheck green before every push.** UI smoke test (vite build) before every push.
7. **Gates are sequential; never skip ahead.** See §6. Cut list (§7) applies when behind.
8. **Honesty in all docs:** unaudited verifier, V9 residual (dual-sig today), gas numbers with
   sources. Overclaiming = judges mark it; honesty = judges respect it.

## 5. Terminology (use exactly)

- **canonical mempool** — EIP-8141's own public mempool (ethrex on the devnet).
- **sidecar** — the ERC-8421 mempool sidecar node (say "sidecar", never "Skandha").
- **gateway** — the one sidecar node all requests pass through (`gatewayUrl`).
- **standard alt-mempool** — the ERC-8421-style rule set the sidecar implements.
- **staked entity** · **reputation** — `OK` / `THROTTLED` / `BANNED`.
- Never call the standard alt-mempool "canonical"; never say "standard mempool" for the base rules.

## 6. Gates (build order — pass criterion is mandatory)

| Gate | Pass criterion | Fallback on fail |
|---|---|---|
| G0 workshop baseline | workshop steps 3–13 run once from the cloned workshop (esp. 6/7/8 pattern, 11 debug, 12/13) | steps 3–5 skippable; 6–8 mandatory |
| G1 ARBITRARY spike | an ARBITRARY-entry frame tx: canonical REJECTS with a budget-type rule; sidecar accepts when staked — record exact `rule` strings | **Path B:** SECP256K1 envelope + ML-DSA verify still in VERIFY frame data (budget rejection comes from frame execution during validation) |
| G2 contract | `forge test` green: vectors + negatives + executePq replay + rotation | ≤2h fix loop, else ship tests-as-demo |
| G3 EF admit | PQ tx: canonical reject → stake → **admitted+mined on sidecar** + explorer link + debug report | G1 Path B; last resort: "code that submits one" qualification |
| G4 ENS write | `executePq` sets a text record on Sepolia ENSv2 + read-back resolves; rotation preserves name | resolver friction → ENSjs v2 helpers → PublicResolverV2; zero Sepolia ETH by Fri noon → downgrade ENS (2 picks) |
| G5 Arkiv | entity created + queried + patched (rotation) from the UI runtime | get access key Friday AM; retry with key |
| G5b Swarm | passport JSON on Swarm (public gateway), `swarmRef` written into the entity, link opens in a browser; UI Registry drawer fetches + renders it; `/arkiv/swarm.md` filled | 1 h spike first; friction >1 h → drop the bonus (cut list #6), everything else survives |
| G6 UI | full demo flow clickable end-to-end on the devnet | polish cut, DemoConsole never cut |

## 7. Cut list (in order, when time-pressed)

1. Hero polish beyond a strong quote wall → 2. Architecture-screen scroll polish →
3. ENS `grantRoles` beyond owner basics → 4. keyed-nonce / recent-roots showcase (workshop
steps 12–13) → 5. ML-DSA-65/87 support (never needed) → 6. Arkiv + Swarm bonus (G5b — $500,
stacks on the Arkiv track, no extra pick; cut if blocked >1 h or gates slip).
**NEVER cut:** DemoConsole states, honest limitations copy, `/arkiv/*` files, AI attribution.

## 8. Runtime command cheatsheet (scripts we implement in repo)

```
# contracts
forge build --root contracts && node scripts/export-artifacts.mjs   # like workshop CC pattern
forge test  --root contracts

# node scripts (tsx): each ends in a structured JSON stdout line
yarn deploy:devnet          # factory + verifier + precompute + QDayWallet; writes deploy output to state
yarn demo:mempool           # [A] canonical reject → [B] alt unstaked reject → [C] stake → [D] alt accept
yarn demo:spike             # G1 minimal ARBITRARY-entry attempt (no full contract needed)
yarn ens:register           # MockUSDC mint+approve+commit → 60 s wait → register (wallet = owner)
yarn ens:write -- <text> <value>   # executePq on Sepolia: relayer submits, wallet authorizes ML-DSA
yarn ens:rotate             # rotatePqKey flow: old key signs intent → new pk stored → name survives
yarn arkiv:sync             # create/patch qday.migration entity from wallet state
yarn swarm:passport         # G5b: upload migration passport JSON → Swarm, patch entity swarmRef
yarn gen:vectors            # noble → test/fixtures/pq.json for forge tests
yarn app:dev / app:build    # vite dev/production build
```
Repo scripts must be **idempotent and `--fresh`-re-runnable**; every script or `docs/FINDINGS.md`
update counts as work-in-progress commit material.

## 9. Error semantics (from the alt-mempool workshop — same devnet)

| code | cause | fix |
|---|---|---|
| RPC_UNREACHABLE | network or devnet down | retry; check gatewayUrl |
| RPC_-32601 | method not implemented (explorer off, no faucet) | check gatewayUrl; ask host |
| RPC_-32502 | mempool rules rejected the tx | read `rule`, run debug command |
| RPC_-32500 | nonce mismatch / invalid tx | contract wallets start at nonce 8; read chain |
| WRONG_CHAIN | devnet replaced | re-check chainId and gatewayUrl |
| CONFIG_INVALID / CONFIG_MISSING | config broken | restore from git |
| STEP_ORDER / STATE_* | step order or state problems | run prerequisites / `step_1_check` reset |
| STATE_STALE | recorded contract has no code (reset) | redo step `--fresh` |
| DEPLOY_FAILED | deploy reverted | needs ~6M gas + value; top up via faucet step |
| TX_NOT_MINED | 120 s timeout | devnet stalled; check explorer |
| TX_REVERTED | mined but frame failed | debug command |
| FUNDING_FAILED | faucet refused (1/h/address) | explorer Faucet button, second address, or ask the host |

## 10. Do-not-touch list

- Do not deploy HegotaSupport itself (never deploy, always inherit).
- Do not call any `debug_bundler_*` on the shared devnet except reputation reset for OUR wallet.
- Never rely on any funded key in any public resource; funding is faucet-only.
- node_modules of `skandha` packages prohibited anywhere (build from hegota-support only).
- Do not copy workshop repo sources wholesale into the submission repo. Imports must come
  from the `@forshtat/hegota-support` npm package. Thin integration shims (frame builders,
  send helpers) may be reimplemented in our repo with an attribution note in the README
  pointing to mempool-workshop's reference implementation.

## 11. Release checklist assistant (remind the human at each gate)

- [ ] `git status` clean → verify each file staged intentionally
- [ ] commit message names the gate progress (e.g. "G1: ARBITRARY spike — canonical rejects with VerificationBudget rule")
- [ ] `AI_USAGE.md` + a `specs/prompts/` entry for the session, if AI work occurred since last commit
- [ ] `docs/FINDINGS.md` updated with any devnet results
- [ ] `/arkiv/*` and README context only after G5 (do not clog earlier commits)
