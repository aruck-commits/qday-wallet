# Swarm passport

## What is on Swarm vs Arkiv
- **Swarm:** the public migration passport JSON (wallet, PQ key hash, verifier, ENS name, Arkiv entity key, gas figures). 388 bytes.
- **Arkiv:** the `qday.migration` entity. Its `swarmRef` field holds the Swarm reference.
- Entity key: `0xc6c072904c6dd995b59046e2465e33283f09fb14c61c7f63c9ccc723c84dd048`
- Swarm reference: `81c74b4669f7c8fd574cb4fa2f911e7d5603a54e12fd9fe8ea32e04474c49c74`
- Link: https://bzz.limo/bzz/81c74b4669f7c8fd574cb4fa2f911e7d5603a54e12fd9fe8ea32e04474c49c74
- Arkiv patch that set `swarmRef`: https://rabdi.explorer.arkiv.network/tx/0xcd9c4e93f14a9168327cd494535866068923dc9dc0ead1e86354c9f0ffb4d8f5 (status success, block 290762)

## Upload path (honest)
- Uploaded with an HTTP POST to the public gateway `https://bzz.limo/bzz` (HTTP 201). This is **not** a Bee node we run.
- **Postage batch ID: none.** We did not buy a stamp batch, so there is no batch owner to name. This does not meet the bonus's batch requirement and is listed as a gap.
- Read-back on `https://bzz.limo/bzz/{reference}` is byte-identical (388 bytes).
- `https://api.gateway.ethswarm.org/bzz/{reference}` served a "Request Approval" HTML page for the same reference, so it is not a usable read path. See FINDINGS.

## Files that touch Swarm
- `scripts/swarm_passport.ts`: uploads the passport, verifies read-back, patches `swarmRef` onto the Arkiv entity.
- `app/src/screens/S3Registry.tsx`: the drawer fetches the reference from the gateway and renders it.

## Run one upload and one read
1. Keep the passport file as is. The script rebuilds it from the state files.
2. `yarn swarm:passport` (needs `.arkiv-state.json` and the Arkiv access key in `.env.arkiv.local`).
3. Read back: `curl https://bzz.limo/bzz/81c74b4669f7c8fd574cb4fa2f911e7d5603a54e12fd9fe8ea32e04474c49c74`. You should get the 388-byte JSON.

## Demo moment
Registry screen → "Open passport drawer". Shown in the video outline beat for the registry.

## Friction with Swarm
- The official API gateway returned an approval page instead of the file, so we switched to `bzz.limo`.
- No postage batch was bought, and we don't have a Bee node to buy one with, so the upload isn't tied to a funded stamp.
- Content hashes differ between gateways' HTML error pages and the JSON, so read-back checks need to compare bytes, not status codes.
