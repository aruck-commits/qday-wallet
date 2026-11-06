# Reach: who uses the Q-Day Wallet migration registry today

## Measured now (as of the submission snapshot)
- Entities on Arkiv: **1** (`qday.migration`, key `0xc6c072904c6dd995b59046e2465e33283f09fb14c61c7f63c9ccc723c84dd048`).
- Writer wallet: `0xD73977DdE03abAB3984cFb1e0A2d7629a693A4a1`. Patch transaction mined (block 290762).
- Query that a judge can run: `yarn arkiv:read` (SDK query `scheme = "ML-DSA-44"` returns 1 entity).
- External readers, integrations, or other projects using this registry: **0**. We have not measured any outside usage, and we do not claim any.
- The Registry screen in the demo shows the build-time read result from Arkiv.

## Who it is for
1. **Wallet and SDK teams** deciding whether to ship PQ support. They need to see which wallets are PQ-enrolled and when the key changed.
2. **Exchanges and custodians** checking whether a withdrawal key still has a PQ record that matches its wallet (`wallet → pqPkHash → status`).
3. **ENS integrators** checking whether a name's owner has an active PQ key. The name record and the Arkiv entity are both public and can be checked independently.
4. **Researchers** measuring PQ migration over time. The schema is public and queryable.

## Would they use it today?
- Anyone with an Arkiv client can run the query above. There is no access key needed for the public read path.
- The write path needs a relayer key, so only the project team can add entities today.
- Keeping this registry going after Mumbai depends on whether a wallet provider or exchange adopts the schema. We have not asked anyone yet.

## Limits
- One entity is a demo, not a population. Do not read these numbers as adoption.
- The `swarmRef` field points at a passport uploaded through a public gateway, with no postage batch. See `arkiv/swarm.md`.
