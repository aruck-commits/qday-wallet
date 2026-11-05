# How you use Arkiv (the technical integration)

## 0. Setup (one-time, scripted)

1. Access key from https://hub.arkiv.network/access-keys → stored in `.env.arkiv.local`
   (git-ignored; loaded as `ARKIV_ACCESS_KEY`).
2. tGLM from https://hub.arkiv.network/faucet for the relayer wallet (burn + fee tokens).
3. SDK pinned (`@arkiv-network/sdk`); Node ≥22.10; `rabdi({ accessKey })` chain helper builds
   public + wallet clients (network ID 7794095).

## 1. Schema definition (script start, idempotent)

`defineSchema` for tag `qday.migration` with the exact column set from arkiv/schema.md —
`addr` keyed fields indexed (`wallet`, `verifier`), `bytes32` indexed (`pqPkHash`),
`str` indexed (`status`, `scheme`), plain `u64`/`str` for version/name/note.
An existing schema with the same tag is reused; a diff aborts loudly.

## 2. Write path (only after a chain event lands)

- **create:** on wallet deploy / first admitted PQ spend →
  `walletClient.createEntity(schema, {wallet, pqPkHash, status:'ACTIVE', scheme:'ML-DSA-44',
  verifier, pqKeyVersion:1, ensName?, note}, { expiration })` — expiration = now + 30 days.
- **patch:** on rotation/revoke → `walletClient.updateEntity(id, patchFields, {expiration})`
  (new hash + version; status `ROTATED`/`REVOKED`). UI shows both the on-chain tx hash and
  the registry tx hash side-by-side.
- **no deletes:** expired entities age out natively (TTL).

## 3. Read path (UI)

- roster: `publicClient.select().from('qday.migration').ownedBy(...).fetch()` (+ pagination).
- filtered: eq-filtered selects (`status`, `scheme`, `wallet`) power the filter bar.
- live feed: `publicClient.watch()` events → emerald row-in pulse on the Registry screen.
- expiry: countdown rendered from metadata; past-expiry → `EXPIRED` chip (read-side state).

## 4. Ops notes

- Rate limiting: public RPC is constrained; access key requests serialized through our
  `arkiv.ts` limit helper; all writes idempotent (`create` = upsert by (wallet, version)).
- The registry is a twin: UI always links the wallet's on-chain proof (explorer) next to
  the Arkiv entity (rabdi.explorer).arkiv.network).

## Integration completeness (self-assessment at submission time)

- [TO COMPLETE G5] entities created/patched from the live flow · queries + watch in UI ·
  expiry live · revoke path exercised once · friction.md references real timings.
