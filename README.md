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

The staked G1 admission, mined G3 PQ frame, and ENS PQ write/rotation remain unavailable in this run. The Swarm passport now has a byte-equal public read-back and Arkiv patch evidence.

## ENS final state

PQ write on the default resolver requires `ROLE_SET_TEXT`; registration grants resolver and subregistry roles only. The captured `eth_call` proof is in `docs/FINDINGS.md` under the final ENS diagnosis. The ENS pick therefore stands on the name owned by the PQ wallet, `executePq` infrastructure, regression asserts, and this honest limitation.

## Honest limitations

The ML-DSA verifier is third-party and unaudited. The prototype retains residual key, authorization, and integration risk. Private keys never leave the active session in the demo path. See `docs/VULNERABILITIES.md`.

Run `bun run app:build` to regenerate evidence and build the demo.

## Captured rejections

Canonical raw HTTP JSON:

```json
{"error":{"code":-32000,"message":"Invalid params: Frame transaction prefix gas budget (frames + sig cost) exceeds MAX_VERIFY_GAS"},"id":1,"jsonrpc":"2.0"}
```

The unstaked sidecar raw response contains the literal `validation frame 0: ran out of gas (Out Of Gas)`. The gateway-to-miner peer window remained empty, so no staked admission or PQ mined frame is claimed. ENS text mutation was blocked by the captured resolver authorization proof; Swarm retrieval returned a Request Approval page with a byte/hash mismatch. Full raw entries are in `docs/FINDINGS.md`.

## Attribution

AI session records are maintained in `AI_USAGE.md` and `specs/prompts/`. The build follows `AGENTS.md` and the pinned constants in `specs/SPEC.md`.
