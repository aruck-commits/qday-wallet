# Q-Day Wallet Arkiv schema

Schema tag: **`qday.migration`** · Network: Rabdi testnet (chain 7794095) · defined with `defineSchema` in `scripts/arkiv_sync.ts` and `scripts/arkiv_read.ts`.

## Entity fields (as in code)

| field | type | indexed | meaning |
|---|---|---|---|
| `scheme` | string | yes | always `ML-DSA-44` today |
| `wallet` | string (optional) | no | smart wallet address the key protects |
| `ensName` | string (optional) | no | ENS name owned by the wallet, e.g. `qdaywallet.eth` |
| `pqKeyVersion` | string | yes | key version as a string, starts at `0`, becomes `1` after rotation |
| `pqPkHash` | string (optional) | no | fingerprint of the ML-DSA public key |
| `status` | string | yes | e.g. `scaffold`, `rotated` |
| `swarmRef` | string (optional) | no | Swarm reference of the migration passport |

## Ownership and expiry
- **Owner:** the relayer account `0xD73977DdE03abAB3984cFb1e0A2d7629a693A4a1`. The entity is created and patched by that account; this is a demo, not user-owned data.
- **Expiry:** set to 30 days at creation (`ExpirationTime.fromDays(30)`). Not verified at expiry.

## Queries we run
- `scheme = "ML-DSA-44"` (returns 1 entity today), run by `yarn arkiv:read`.

## Known mismatch we are fixing
- Earlier drafts listed field types we never used (`addr`, `bytes32`) and statuses we never set (`ACTIVE`, `EXPIRED`, `REVOKED`). The table above is the source of truth.
