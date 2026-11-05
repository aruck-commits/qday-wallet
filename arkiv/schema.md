# Q-Day Wallet × Arkiv — Data Schema

Schema tag: **`qday.migration`** · Network: Rabdi testnet (7794095) · defined via
`@arkiv-network/sdk` `defineSchema` at script start (idempotent; schema reused if tag matches).

## Entity (one per wallet entry)

| field | type | indexed | rationale |
|---|---|---|---|
| `wallet` | `addr` | ✓ (indexed) | the address owning the PQ key — the registry's primary key for humans |
| `pqPkHash` | `bytes32` | ✓ | keccak256(publicKey) — fingerprints the key without storing 1312 B on Arkiv |
| `status` | `str` | ✓ | `ACTIVE` / `ROTATED` / `EXPIRED` / `REVOKED` |
| `scheme` | `str` | ✓ | `"ML-DSA-44"` (fixed today; Pivot = future `ML-DSA-65/87` rows) |
| `verifier` | `addr` | ✓ | deployed IMLDSAVerifier contract (provenance pointer) |
| `pqKeyVersion` | `u64` | – | monotonically increasing on rotation |
| `ensName` | `str` | – | optional; the wallet's ENSv2 name when registered |
| `note` | `str` | – | free comment (e.g. "demo at ETHGlobal Mumbai") |
| `swarmRef` | `str` | ✓ | Swarm reference (content hash / gateway URL) of this wallet's public migration passport on Swarm; written by the G5b flow, fetched by the Registry drawer |

## Lifecycle

- **create** on first successful exposure (deploy or first PQ spend): status `ACTIVE`,
  `pqKeyVersion 1`; entity set to expire in **30 days** (matches the 1-day unstake delay
  timescale of migration; snapshot artifacts shouldn't live forever).
- **patch** on rotation: same entity, fields → `status ROTATED`, new `pqPkHash`,
  `pqKeyVersion++`, `note` gains `rotated: <date>`, and `swarmRef` points at the new passport
  version on Swarm (old passports stay readable — content-addressed). History is NOT
  per-entity — versions are rows-addressable by query on (wallet, pqKeyVersion).
- **expiry:** native Arkiv TTL — UI renders countdown from entity metadata; `EXPIRED` shown
  when past (query-time distinction, no write needed).
- **REVOKED** (defense scenario demo): wallet emits a PQ-authorized revoke via executePq then
  patches the registry — shows the registry can reflect *bad* states too (honesty feature).

## Queries the UI runs

1. `select().from('qday.migration').ownedBy(wallet.wrapping?.address ?? relayer)` — dashboard.
2. filtered: `status eq 'ACTIVE' and scheme eq 'ML-DSA-44'` — live roster + watch feed.
3. by wallet+version for the rotation timeline (S4 screen).
4. `swarmRef` → fetch + render the migration passport (Swarm GET) in the Registry detail
   drawer — the Arkiv + Swarm bonus read path (G5b).

## Ownership model

Entities are owned by the **Arkiv wallet SDK key derived from the relayer/builder EOA**
(demo constraint: onchain PKI doesn't exist to let metagraph-external smart contracts own
entities). Each create/patch is linked to a tx hash in the UI ("who wrote this"), and writes
only happen via our `arkiv:sync` path after a PQ event lands on-chain — so an attacker could
forge entity *fields* only by holding the relayer key; the docs note this and the why-arkiv
doc carries the mitigation story (registry is a twin, chain is truth).
