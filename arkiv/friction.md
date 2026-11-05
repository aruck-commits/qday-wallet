# What made Arkiv genuinely interesting (or painful) to use

> Entry for the Arkiv team. Honest notes gathered while building, not PR copy. [Format
> remains; contents appended after each real integration session at G5.]

## Setup friction log

- [TO COMPLETE — real timings when running G5] Faucet round trip, access-key issuance at
  hub.arkiv.network/access-keys, RPC round-robin latency on Rabdi from the conference hall,
  install size of `@arkiv-network/sdk`, Node version pinning (bumped us to ≥22.10).

## First entity experience

- [TO COMPLETE] Time from zero to a fetched entity; the `Schema` helper DX (typed columns),
  what felt natural vs. Wobbly (e.g. filter syntax, expired-entity behavior in queries).

## What genuinely clicked (candidate talking points)

- Entities as first-class **queryable objects with TTL** — no indexer needed for our
  rotation timeline; `watch` events gave us a live feed in ~20 lines.
- Ownership model (entity owned by a wallet address) made our "signature → write" pipeline
  trivial to reason about.
- Indexing choice per column (`addr`/`bytes32`/`str`) was an obvious knob, not a black box.

## What we hit as rough edges

- [TO COMPLETE — recorded verbatim, e.g. error strings when rate-limited without an access
  key; any CLI/install version gotchas; WSS vs HTTPS behaviors.]

## Net

[TO COMPLETE] Real verdict paragraph: what Arkiv gave us that Postgres+API auth couldn't,
in one honest sentence (see also why-arkiv.md).
