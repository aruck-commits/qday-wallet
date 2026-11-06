# Q-Day Wallet

Q-Day Wallet is a quantum-safe smart-wallet prototype using NIST ML-DSA-44 (FIPS 204), EIP-8141 frame admission, ENSv2 identity continuity, and Arkiv migration records.

## Evidence table

| Exhibit | Observed evidence |
|---|---|
| Canonical rejection | Raw `MAX_VERIFY_GAS` response in `docs/FINDINGS.md` |
| Unstaked sidecar rejection | Raw `Out Of Gas` response in `docs/FINDINGS.md` |
| G3 deployment | Factory `0xa37d3a42c4117bafe189dd21b6170a96f17406b3`, verifier `0x17b01049d4790091ac911ead126337abae1517e4`, wallet `0xc5a8cb266cf7f56dcf017a5f766bf927c189091f` |
| ENS registration | [qdaywallet.eth register tx](https://sepolia.etherscan.io/tx/0xd6d1e88de447f6a71d8353f6cf811daacd29cd722a19072bdff390b0951625f1) |
| Arkiv | Entity `0xc6c072904c6dd995b59046e2465e33283f09fb14c61c7f63c9ccc723c84dd048` |
| Gas | Our verify average **2,664,784**; pinned reference **2,689,594**; see `docs/GAS.md` |

The staked G1 admission, mined G3 PQ frame, ENS PQ write/rotation, and Swarm byte-equal read-back remain unavailable in this run. The demo shows those states as unavailable rather than inventing transaction links.

## Honest limitations

The ML-DSA verifier is third-party and unaudited. The prototype retains residual key, authorization, and integration risk. Private keys never leave the active session in the demo path. See `docs/VULNERABILITIES.md`.

Run `bun run app:build` to regenerate evidence and build the demo.
