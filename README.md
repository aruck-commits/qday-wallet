# Q-Day Wallet

Q-Day Wallet is a quantum-safe smart-wallet prototype using NIST ML-DSA-44 (FIPS 204), EIP-8141 frame admission, ENSv2 identity continuity, and Arkiv migration records.

## Evidence table

| Exhibit | Observed evidence |
|---|---|
| Canonical rejection | Raw `MAX_VERIFY_GAS` response in `docs/FINDINGS.md` |
| Unstaked sidecar rejection | Raw `Out Of Gas` response in `docs/FINDINGS.md` |
| G3 deployment | [factory tx](https://explorer.altmempool.wtf/0x0d85e0dcab5b296c02356bd9efc46d380721362d70d5d860d85dcf45cf107b21), [verifier tx](https://explorer.altmempool.wtf/0xc340e9ac36c0c1faf2cf5231b81b27464ea80afd18318f6efd24b32de3dfb00d), [wallet tx](https://explorer.altmempool.wtf/0xb83ab344ad0ebacf39721ac0d236a9e76d798e95f66f18d5ff0e41fc424b56cf) |
| G3 addresses | Factory `0xa37d3a42c4117bafe189dd21b6170a96f17406b3`, verifier `0x17b01049d4790091ac911ead126337abae1517e4`, wallet `0xc5a8cb266cf7f56dcf017a5f766bf927c189091f` |
| Precompute | [registerA](https://explorer.altmempool.wtf/0xc6fad77d74ac18a9a7afa91e048b044b554dba2263661ad62791ad9009279452), [registerT](https://explorer.altmempool.wtf/0x24ce10d1dfda5e2d6bb251020730fc42581a016bb1c3ef424140aa7872055060) |
| ENS registration | [qdaywallet.eth register tx](https://sepolia.etherscan.io/tx/0xd6d1e88de447f6a71d8353f6cf811daacd29cd722a19072bdff390b0951625f1) |
| Arkiv + Swarm | Entity `0xc6c072904c6dd995b59046e2465e33283f09fb14c61c7f63c9ccc723c84dd048`; [passport reference](https://bzz.limo/bzz/81c74b4669f7c8fd574cb4fa2f911e7d5603a54e12fd9fe8ea32e04474c49c74), [Arkiv patch tx](https://rabdi.explorer.arkiv.network/tx/0xcd9c4e93f14a9168327cd494535866068923dc9dc0ead1e86354c9f0ffb4d8f5) |
| Gas | Our verify average **2,664,784**; pinned reference **2,689,594**; see `docs/GAS.md` |

The staked G1 admission and mined G3 PQ frame remain unproven. The latest live read saw one gateway peer; the staked ARBITRARY frame still failed validation with literal `Out Of Gas` at both the 3.2M and 6.5M declared VERIFY limits. ENS PQ write and rotation are complete (see ENS identity). The Swarm passport has a byte-equal public read-back and Arkiv patch evidence, but no postage-batch bonus claim is made.

## ENS identity (Sepolia, written and rotated)

- Our own Permissioned Resolver: `0x863b62fA8988Ba340C24F389FFDF568b3ccbc8e4`, deployed through the Verifiable Factory with the relayer as admin.
- The wallet holds `ROLE_SET_TEXT` only for the `pq-key` text key (argument-scoped grant, `grantSetterRoles`).
- `qdaywallet.eth` points at that resolver (`setResolver` through `executePq`).
- `pq-key` was written through `executePq` and read back through UniversalResolverV2.
- The ML-DSA key was rotated; the owner is unchanged; the `pq-key` record was then updated and read back again.
- Transactions and readback are in `docs/ens-resolver.json`. Scripts: `yarn ens:resolver`, `scripts/ens_rotate.ts`, `scripts/ens_record_rotate.ts`.

Earlier notes said the write was unreachable. That was true only for the default shared resolver. The ENS docs describe per-account resolvers, which the name owner can deploy and administer.
## EF Alt-Mempool: design and status

**Why the alternative mempool.** The ML-DSA-44 check costs about 2.66M gas to verify (measured). The canonical mempool caps verification at about 100k, so a PQ-authorized frame transaction is rejected there with `MAX_VERIFY_GAS`. The captured rejection is in `docs/FINDINGS.md`.

**What the code does.** `contracts/src/QDayWallet.sol` authorizes a spend by verifying an ML-DSA-44 signature over a 32-byte intent in a VERIFY frame. Keys are precomputed through `MLDSAKeyFactory` (registerA, registerT), so verification takes the fast path. Admission is submitted through `eth_sendFrameTransaction` on the sidecar gateway. The SpikeWallet stake of 0.024 ETH is recorded in the NaiveStakingRegistry and read back with `getDepositInfo`.

**Trade-offs.** The verifier is third-party and unaudited. Gas is high even on the fast path. The admission path depends on a sidecar with staked-entity rules, so a wallet has to stake before its frames are accepted.

**Status (honest).**
- Captured: canonical rejection (`MAX_VERIFY_GAS`), unstaked sidecar rejection (`Out Of Gas`), contract deployments, the mined self-stake transaction, and the 0.024 ETH registry readback.
- Not captured: an admitted, mined PQ frame transaction. The latest bounded staked attempts returned literal `Out Of Gas` at both 3.2M and 6.5M declared VERIFY limits, so no admission or frame link is claimed.
- To finish this exhibit we need the devnet operator to restore the gateway-to-miner link (or a fresh devnet), then run `docs/REDEPLOY_RUNBOOK.md`.

## Honest limitations

The ML-DSA verifier is third-party and unaudited. The prototype retains residual key, authorization, and integration risk. Private keys never leave the active session in the demo path. See `docs/VULNERABILITIES.md`.

Run `bun run app:build` to regenerate evidence and build the demo.

## Captured rejections

Canonical raw HTTP JSON:

```json
{"error":{"code":-32000,"message":"Invalid params: Frame transaction prefix gas budget (frames + sig cost) exceeds MAX_VERIFY_GAS"},"id":1,"jsonrpc":"2.0"}
```

The unstaked and staked sidecar raw responses contain the literal `validation frame 0: ran out of gas (Out Of Gas)`. No staked admission or PQ mined frame is claimed. ENS text mutation and rotation succeeded through the project-owned Permissioned Resolver and were read back through UniversalResolverV2. Swarm retrieval is byte-equal through bzz.limo; the official gateway's approval-page response and the bonus limitation are preserved in `docs/FINDINGS.md`. Full raw entries are in `docs/FINDINGS.md`.

## Attribution

AI session records are maintained in `AI_USAGE.md` and `specs/prompts/`. The build follows `AGENTS.md` and the pinned constants in `specs/SPEC.md`.

Demo UI follows specs/UI_SPEC.md plus design principles adapted from a local frontend skills pack (telemetry disabled).
