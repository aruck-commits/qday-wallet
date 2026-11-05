# Why Arkiv (and not "just a JSON API")

The Q-Day Wallet needed a place to publish **wallet → PQ key** status in a way that is
(1) public, (2) queryable, (3) tamper-evident, (4) self-expiring. That short list turns out
to be exactly Arkiv's shape — and the anti-shape of everything else we looked at:

| alternative | why it loses |
|---|---|
| central JSON API + DB | auth-gated, rate-limit-gated; the API key becomes the trust root; no public read guarantee; data outlives company |
| event-indexer over our own chain | forces consumers to run infra; no unified cross-source view; tender/chain-specific |
| raw onchain rows on Sepolia | stores 1312-byte-key-derived state in calldata/expensive storage; no index/query/access pattern for third parties; no TTL |
| Subgraph | fine but ELT-heavy to write + host at event; our UI needs DML semantics (patch rotation entity), not just projections |

## What Arkiv gave us concretely

1. **Wallet-owned writes.** Entity ownership is a wallet address; our "PQ-authorized event →
   registry patch" flow is a natural match (signature → SDK write) — no bespoke auth layer.
2. **The rotation timeline is a query, not a backend.** `wallet+version` filtered query +
   watch events feed the UI's Registry/Identity screens directly.
3. **TTL for free.** Migration is a 2020s problem; entities expiring in 30 days keep the
   registry honest without a cleanup cron.
4. **Public, credentialless source for third parties.** Exchanges/integrators (reach.md)
   query the roster without a bespoke API relationship (public read is part of the story).

## Where Arkiv's model falls short for what we do (honesty section)

- Onchain PKI can't (yet) own Arkiv entities, so the wallet itself can't be the *direct*
  write-identity; writes go through a derivation of our relayer EOA. Hence the registry is a
  **declarative twin** of chain state (chain = truth, registry = mirror) — enforced in our
  flow (writes only follow an on-chain PQ event) and in `docs/THREAT_MODEL.md`.
- Schema evolution is explicit — which is a feature (typed), but worth noting for iteration
  speed at an event.
