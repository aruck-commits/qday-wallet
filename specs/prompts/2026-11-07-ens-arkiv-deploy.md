# Prompt: 2026-11-07 — ENS PQ write, Arkiv live read, public deploy

## Context
Build mode (opencode agent, GLM) continued from the craft-pass session. Goals: close the ENS
write exhibit, make the Arkiv read visible without a browser key, publish a live demo link.

## What was done (committed)
- `4e75d79` Arkiv: `scripts/arkiv_read.ts` runs the SDK `getEntity` + `select … where scheme = "ML-DSA-44"`
  at build time and writes `app/src/data/arkivLive.json`; the Registry screen shows the result.
  README gained the writer wallet and the query. `arkiv/swarm.md` rewritten to state the real upload path.
- `e6ba07c` ENS: `scripts/ens_resolver.ts` deploys our own Permissioned Resolver proxy through the
  Verifiable Factory, grants the wallet `ROLE_SET_TEXT` for the `pq-key` text key only (`grantSetterRoles`),
  points `qdaywallet.eth` at it via `setResolver`, and writes `pq-key` via `executePq`.
  Read back through UniversalResolverV2 matches.
- `5b94dfb` proof JSON tracked in `docs/ens-resolver.json`; evidence export reads it.
- Public deploy: https://aruck-commits.github.io/qday-wallet/ (gh-pages branch, built with base `/qday-wallet/`).

## Corrections recorded
- Earlier notes said the ENS write was unreachable. That was true only for the default resolver. The
  ENS docs describe per-account Permissioned Resolver instances that the name owner can deploy and administer.
- The implementation address `0x115eb53f…` is correct per the ENS deployments table. Our first ABI was the
  older signature; the current `initialize((address,uint256)[],bytes[])` takes DNS-encoded names.
- Two early transactions (proxy deploy and `setResolver`) were not saved to state because the first successful
  run threw before writing. Their hashes were recovered from chain logs and are recorded in `docs/ens-resolver.json`.

## Still open (honest)
- EF exhibit: the devnet gateway still reports no connected miner peers (block 6195).
- Swarm: no postage batch; the passport was published through the public gateway.
- ENS key rotation is not yet executed.
