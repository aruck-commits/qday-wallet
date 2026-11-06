# Submission checklist

## Link table

| Artifact | Link |
|---|---|
| ENS registration | https://sepolia.etherscan.io/tx/0xd6d1e88de447f6a71d8353f6cf811daacd29cd722a19072bdff390b0951625f1 |
| G3 factory | https://explorer.altmempool.wtf/0x0d85e0dcab5b296c02356bd9efc46d380721362d70d5d860d85dcf45cf107b21 |
| G3 verifier | https://explorer.altmempool.wtf/0xc340e9ac36c0c1faf2cf5231b81b27464ea80afd18318f6efd24b32de3dfb00d |
| G3 wallet | https://explorer.altmempool.wtf/0xb83ab344ad0ebacf39721ac0d236a9e76d798e95f66f18d5ff0e41fc424b56cf |
| Arkiv entity | 0xc6c072904c6dd995b59046e2465e33283f09fb14c61c7f63c9ccc723c84dd048 |
| SpikeWallet deploy | `0x6034f81a…` (recorded workshop anchor; full raw entry in FINDINGS) |
| Workshop stake | `step_7_stake` record in `tooling/mempool-workshop/.workshop-state.json` / FINDINGS |
| Canonical raw rejection | `docs/FINDINGS.md` raw entry L104: literal `MAX_VERIFY_GAS` object |
| Deadline | Sat Nov 7 09:00 IST |

The verifier URL above is intentionally marked unavailable if the explorer does not resolve it; use the raw transaction hash in `docs/FINDINGS.md` as the audit source.

- [x] Three picks documented: Alt-Mempool, ENSv2, Arkiv.
- [x] Raw canonical and unstaked rejection evidence in `docs/FINDINGS.md`.
- [x] ENS registration URL and Arkiv entity recorded.
- [x] Gas evidence and source cross-check in `docs/GAS.md`.
- [x] Demo app builds with `bun run app:build`.
- [x] Honest limitations and AI attribution present.
- [ ] Staked G1 admission URL — missing because the final three-probe gateway window still returned literal `result: []` peers.
- [ ] Mined G3 PQ frame URL — missing because the sidecar gate remained unavailable.
- [ ] ENS PQ write/rotation URLs — missing after two identical `0x4b27a133` authorization reverts.
- [ ] Swarm byte-equal public read-back — missing because gateway returned Request Approval HTML.
- [ ] Human: record video, prepare booth equipment, and perform final DRY RUN self-check before Sat Nov 7 09:00 IST.
