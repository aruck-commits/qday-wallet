# Friction with Arkiv: what we hit, what we didn't

Honest notes from building Q-Day Wallet at ETHGlobal Mumbai. Every item below comes from a command we ran; we give the commands so you can reproduce them.

## Setup
- **Access key is required for every RPC call through `rabdi({ accessKey })`.** We had no way to run a public read in a browser without shipping a key. Workaround: we read at build time (`yarn arkiv:read`) and commit the result. Suggestion: a documented read-only, rate-limited key for public demos.
- **Node version.** The SDK requires Node 22.10+. Our machine runs Node 24.14, so this was not a blocker, but the requirement is a hard throw at script start (`scripts/arkiv_sync.ts`). A clearer message in the docs would help.
- **Faucet and key issuance** worked through the documented steps. We did not time the faucet round trip.

## Entities
- **Create, get, patch, select all worked** with the SDK at the time of writing. Patch transaction `0xcd9c4e93…b8f5` reports status success at block 290762.
- **Query shape that works:** `publicClient.select({ $key: true, pqKeyVersion: true, status: true }).from(schema).where(eq("scheme", "ML-DSA-44")).fetch()`. Our query returned the one entity we created.
- **Expiry.** We set `ExpirationTime.fromDays(30)` on create. We did not verify that an entity is removed at expiry, so we make no claim about it.

## Where we got stuck
- **Reading from a browser.** `getEntity` needs the access key, so the Registry screen's live button only works if a user pastes their own key. Most judges will not do that. We show the build-time read instead.
- **Schema drift between docs and code.** We first wrote field types from memory and had to correct them against `defineSchema` in code. A typed schema export in the docs would prevent this.

## What we did not get to
- Watch / event feeds (we planned them, did not build them).
- Multi-writer patterns and per-owner permissions.

## Reproduce
1. `yarn arkiv:read` with `.env.arkiv.local` present. Expect `resultCount: 1`.
2. Entity `0xc6c072904c6dd995b59046e2465e33283f09fb14c61c7f63c9ccc723c84dd048` on rabdi.explorer.arkiv.network.
