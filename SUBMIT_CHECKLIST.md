# Submission checklist

## Link table

| Artifact | Link |
|---|---|
| ENS registration | https://sepolia.etherscan.io/tx/0xd6d1e88de447f6a71d8353f6cf811daacd29cd722a19072bdff390b0951625f1 |
| ENS resolver setup | https://sepolia.etherscan.io/tx/0xc1c1a9cacca31c3beae15a914c0e9a3deb86aeca203f75bd2014eb6d78b11488 |
| ENS PQ write | https://sepolia.etherscan.io/tx/0x8dfeccaf85f35ea2eee9a4cbddd75b29f789097021bd28797e8efa74dbab3b4b |
| ENS key rotation | https://sepolia.etherscan.io/tx/0x14716ba1b4bd02b2b1851211d7d2f9fc499cf10123a834deb048520d9057dafb |
| G3 factory | https://explorer.altmempool.wtf/0x0d85e0dcab5b296c02356bd9efc46d380721362d70d5d860d85dcf45cf107b21 |
| G3 verifier | https://explorer.altmempool.wtf/0xc340e9ac36c0c1faf2cf5231b81b27464ea80afd18318f6efd24b32de3dfb00d |
| G3 wallet | https://explorer.altmempool.wtf/0xb83ab344ad0ebacf39721ac0d236a9e76d798e95f66f18d5ff0e41fc424b56cf |
| registerA | https://explorer.altmempool.wtf/0xc6fad77d74ac18a9a7afa91e048b044b554dba2263661ad62791ad9009279452 |
| registerT | https://explorer.altmempool.wtf/0x24ce10d1dfda5e2d6bb251020730fc42581a016bb1c3ef424140aa7872055060 |
| SpikeWallet stake (mined) | https://explorer.altmempool.wtf/0x58ab1529a3a908188f0f4e09968d46a4985bd6b72d4f8fb577fce5147875d678 |
| ENS registration | https://sepolia.etherscan.io/tx/0xd6d1e88de447f6a71d8353f6cf811daacd29cd722a19072bdff390b0951625f1 |
| Hooked wallet | `0xe104a972a2d18a09744b66fb5886f5271a5cc9b0` |
| Arkiv entity | `0xc6c072904c6dd995b59046e2465e33283f09fb14c61c7f63c9ccc723c84dd048` |
| Swarm passport | https://bzz.limo/bzz/81c74b4669f7c8fd574cb4fa2f911e7d5603a54e12fd9fe8ea32e04474c49c74 |
| Arkiv Swarm patch | https://rabdi.explorer.arkiv.network/tx/0xcd9c4e93f14a9168327cd494535866068923dc9dc0ead1e86354c9f0ffb4d8f5 |

- [x] Three picks documented: Alt-Mempool, ENSv2, Arkiv.
- [x] Raw canonical and unstaked rejection evidence in `docs/FINDINGS.md`.
- [x] ENS registration, Arkiv entity, and Swarm passport recorded.
- [x] Gas evidence and source cross-check in `docs/GAS.md`.
- [x] Demo app builds with `bun run app:build`.
- [x] Honest limitations and AI attribution present.
- [ ] Staked G1 admission URL — stake is mined and read back, but bounded staked frame attempts returned literal `Out Of Gas` at 3.2M and 6.5M limits.
- [ ] Mined G3 PQ frame URL — sidecar gate remained unavailable.
- [x] ENS PQ write/rotation URLs — project-owned resolver write and rotation read back through UniversalResolverV2.
- [x] Swarm byte-equal public read-back and Arkiv `swarmRef` patch.
- [ ] Human: record video, prepare booth equipment, and perform the final evidence self-check before the Sat Nov 7 09:00 IST deadline.
