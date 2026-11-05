# Q-Day Wallet × Swarm — Arkiv + Swarm bonus (from scratch)

Bonus mechanics: $500, stacks on top of the Arkiv track prize, does NOT consume one of our
three partner picks. Qualification: use **both** Arkiv and Swarm meaningfully, with a real
read path — this file is part of that evidence.

## What we keep where

| place | content |
|---|---|
| **Swarm** | the public **migration passport** JSON per wallet: `{wallet, pqPkHash, scheme: "ML-DSA-44", verifier, ensName, pqKeyVersion, history[], createdAt}` — an identity dossier anyone can fetch raw. Public data only: no secret keys, no key-bearing references (Arkiv entities are public — an encrypted Swarm reference contains its key, so references stored here are always keyless/gateway-URL form). |
| **Arkiv** | the queryable registry twin: one `qday.migration` entity per wallet (`wallet`, `pqPkHash`, `status`, `scheme`, `verifier`, `pqKeyVersion`, `ensName`, `note`, **`swarmRef`**). |
| **Entity reference field** | `swarmRef` (str, indexed) — holds the Swarm reference; the Registry drawer fetches and renders the passport through it. |

Why this split: Arkiv gives indexed, queryable, live-watched registry state (rotation status
at a glance); Swarm gives durable, content-addressed documents (each rotation emits a new
passport version; old ones stay readable and provably unmodified).

## Entity key → Swarm reference (one worked pair, filled at G5b)

- Arkiv entity key: `[TO FILL at G5b]`
- Swarm reference in `swarmRef`: `[TO FILL]`
- Openable link judges can visit: `[TO FILL — gateway URL / bzz form]`

## The moment in the demo

Registry screen → row click → drawer shows the passport fetched **from Swarm** via
`swarmRef`, with an "open original ↗" link. (Exact video beat: during the recording lane —
kept in the video script, not here.)

## What got in the way (real friction, filled during G5b)

- `[TO FILL]` upload path (public gateway vs local Bee + postage stamp), chunking, content
  hash form, gateway latency from the event hall, WSS/HTTPS behaviors.

## Self-check against the bonus requirements

- [x] uses both Arkiv and Swarm (entity + passport; project uses only-Arkiv would NOT qualify)
- [x] this file at `/arkiv/swarm.md` with the three required bullets (what on Swarm / what on
      Arkiv / which entity field holds the reference)
- [x] one Arkiv entity key + openable Swarm reference link (filled at G5b)
- [x] no key-bearing reference stored in a public entity
