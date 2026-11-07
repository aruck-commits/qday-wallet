# Q-Day Wallet — fast read-aloud screen-recording script

Use this with the deployed app or localhost. Speak quickly, but pause on the raw JSON and explorer links. The UI is evidence-driven and read-only: its buttons reveal recorded outcomes; they do not submit transactions.

## Before recording

- Open the app at `https://q-day-wallet-vercel.vercel.app/` or localhost.
- Use a clean browser window at 100% zoom.
- Keep the cursor visible and move it to the screen you are describing.
- Do not open a wallet extension or expose keys.
- Do not claim a sidecar-admitted or mined PQ frame; the current evidence does not contain one.
- Use “canonical mempool” for the base ethrex path and “sidecar” or “standard alt-mempool” for the alternate admission path.

## 0:00–0:35 — Hero / opening

**Action:** Start on Overview. Let the hero load. Point to the headline and the proof cards.

**Say:**

“This is Q-Day Wallet: an evidence-first quantum-safe smart-wallet prototype. The headline is ‘The wallet is the identity’ because the wallet identity, its post-quantum key, its ENS name, and its public migration record are designed to stay connected.

The authorization primitive is NIST ML-DSA-44, also known as FIPS 204. The important engineering constraint is visible here: ML-DSA-44 verification is expensive. Our measured verification sample is 2,664,784 gas. That is not a cosmetic number—it changes where this transaction can be admitted.

This screen is built from captured chain evidence. It is not pretending that a read-only demo button is a live wallet signer.”

**Point to:** `VERIFY COST`, `CANONICAL MEMPOOL / REJECTED`, `STAKE READBACK`, and `ENS PQ WRITE / READ BACK OK`.

## 0:35–1:20 — Wallet Home / account surface

**Action:** Click **Wallet** in the tab rail.

**Say:**

“This is the wallet home. The participant account is shown in the account header, and the active chain is devnet 1337. The balance is a build-time read from the devnet evidence export; the screen also shows the block at which that read was captured.

The stake card is a real registry readback. The current captured value is 0.024 ETH, held for the SpikeWallet subject at the NaiveStakingRegistry. The registry address is visible in the card, and the mined stake transaction is linked in the evidence trail.

The key card identifies ML-DSA-44 and the verifier. The A and T registry entries are the precompute records that let the verifier use its fast path.

This history is deliberately mixed: mined deployment and stake artifacts are shown as mined, Arkiv artifacts as recorded, and the missing PQ frame remains a queued evidence item instead of becoming a fake success.”

**Point to:** the `ML-DSA-44` key card, the `0.024 ETH` readback, the stake transaction row, and the queued PQ frame row.

## 1:20–2:00 — The problem in one sentence

**Say:**

“The problem is simple: a quantum-resistant signature is much more expensive to verify than a normal secp256k1 signature. The chain still needs protection from validation spam, so the canonical mempool applies a small verification budget. A staked sidecar is the intended accountable path for expensive frame validation.

The demo is therefore not ‘look, a normal transfer succeeded.’ The demo is ‘look, the same post-quantum frame is evaluated differently by the canonical admission policy and the alternate staked admission path.’”

## 2:00–4:00 — Compose / the money shot

**Action:** Click **Compose**. Point to the VERIFY envelope fields.

**Say:**

“This is the money shot. The envelope is a VERIFY frame: mode VERIFY 1, an execution limit of 3.2 million gas, an ARBITRARY signature scheme, a 2,420-byte ML-DSA-44 signature, and a 32-byte intent digest.

The buttons below are explicitly read-only simulations. They reveal recorded outcomes and do not send a transaction from the browser. I’ll run the journey so the evidence pipeline comes into view.”

**Action:** Click **Run journey**. Let the automatic A-to-B-to-C-to-D sequence play. The page now scrolls to the journey automatically.

### Lane A — canonical rejection

**Action:** Pause on the red canonical lane. Open or point to the raw window.

**Say:**

“Lane A sends the same kind of frame to the canonical mempool path. The raw JSON says:

`Frame transaction prefix gas budget — frames plus signature cost — exceeds MAX_VERIFY_GAS.`

This is the key rejection. It is a budget rejection, not a nonce error, not a malformed frame error, and not evidence that the ML-DSA signature itself is invalid. The canonical admission policy refuses to carry a verification workload this large in its normal budget.

That is why the red rejection is useful evidence. The expensive cryptography is exactly what the wallet is trying to demonstrate.”

**Read the raw window if needed:**

```json
{"error":{"code":-32000,"message":"Invalid params: Frame transaction prefix gas budget (frames + sig cost) exceeds MAX_VERIFY_GAS"},"id":1,"jsonrpc":"2.0"}
```

### Lane B — sidecar, unstaked

**Action:** Pause on the amber lane. Open or point to the raw window.

**Say:**

“Lane B uses the standard alt-mempool sidecar path, but the entity is not being treated as an admitted staked entity. The captured response is literal `validation frame 0: ran out of gas (Out Of Gas)`.

This is a different gate from Lane A. The canonical path rejects the prefix budget. The sidecar path reaches validation, but the unstaked path does not produce a successful admission. The point is that an expensive verifier needs both enough execution budget and an accountable admission identity.”

**Important:** Do not say that Lane B succeeded. It did not.

### Lane C — stake proof

**Action:** Pause on the green lane. Point to the registry readback and the stake explorer link in Wallet Home if necessary.

**Say:**

“Lane C is the real stake prerequisite. The registry readback is 0.024 ETH for the SpikeWallet subject, above the devnet minimum. The stake transaction is mined and linked. This proves the on-chain stake state; it does not by itself prove that a PQ frame was later admitted.”

### Lane D — honest missing artifact

**Action:** Pause on the queued D card.

**Say:**

“Lane D is intentionally honest. There is no captured admitted-and-mined PQ frame hash in the evidence export. The bounded attempts reached literal Out Of Gas, and the gateway-to-miner peer gate later returned empty. So the UI keeps D as queued and explains why instead of manufacturing an explorer link.

For a judge, this distinction matters: the project has the wallet, verifier, frame builder, stake registry proof, and canonical rejection exhibit. The final sidecar admission exhibit remains the known integration gap.”

### Gas bar

**Action:** Point to the gas comparison.

**Say:**

“The gas bar makes the scale visible. The canonical budget is approximately 100,000 gas, while our measured ML-DSA-44 verification is 2,664,784 gas—roughly 26 times larger. The pinned library reference is 2,689,594, so our measurement is within about one percent of that reference.”

## 4:00–4:45 — Key ceremony

**Action:** Click **Key**.

**Say:**

“This is the key ceremony surface. The protocol uses ML-DSA-44: a 1,312-byte public key, a 2,560-byte secret key, and a 2,420-byte signature.

The fingerprint is shown as evidence metadata, not as a private key. The exposure card is intentionally explicit: keys are session-only in the demo path, and the download action is for the local encrypted bundle. No secret is printed into the UI or committed into the repository.

The important product idea is that the wallet does not silently fall back to a normal ECDSA authorization path for the PQ spend. The ML-DSA verification path is a first-class part of the contract and the frame design.”

## 4:45–5:45 — Arkiv registry and passport

**Action:** Click **Registry**. Show the entity table first.

**Say:**

“This is the public migration registry. The schema is `qday.migration`. The entity key, schema, Arkiv patch, and Swarm reference are all shown as evidence values. The live Arkiv action is read-only and requires a browser access key; the committed snapshot remains available when no browser key is present.

The registry is the continuity layer: it gives a public record that this wallet has a post-quantum scheme, a verifier, a key version, an ENS identity, and a migration passport reference.”

**Action:** Click **Open passport drawer**.

**Say:**

“The passport drawer fetches the public reference through bzz.limo and verifies the byte-equal read-back. This is real public retrieval evidence.

One limitation is important: the project did not purchase and own a Swarm postage batch. Therefore we claim the public passport and byte-equal readback, but we do not claim the separate postage-batch bonus.”

## 5:45–7:00 — ENS identity

**Action:** Click **Identity**. Show registration, PQ write, and rotation rows.

**Say:**

“This is the ENSv2 identity surface. The name is `qdaywallet.eth`, and the registration transaction is on Sepolia. The owner is the QDayWallet address.

The project also deployed and administers its own Permissioned Resolver path. The PQ text record is written through the wallet’s `executePq` authorization path and read back through UniversalResolverV2. The record value is the ML-DSA public-key fingerprint.

The rotation transaction changes the PQ key version and updates the record while keeping the ENS name owner unchanged. That is the identity-continuity demo: the key can rotate without moving the name.

This is a precise claim. We are showing the project-owned resolver path and its readback. We are not claiming that the default shared resolver grants arbitrary `ROLE_SET_TEXT` access.”

**If the screen shows the transaction chips, say:**

“These chips are not decorative—they link to the Sepolia registration, resolver write, and rotation transactions.”

## 7:00–7:45 — Architecture

**Action:** Click **Architecture**.

**Say:**

“The architecture is intentionally small. Noble provides the ML-DSA-44 signer in the client or tooling layer. The frame or relayer carries the authorized operation. The MLDSAVerifier checks the 32-byte intent digest. QDayWallet enforces nonce and replay safety, then executes the target call. ENS provides identity continuity, and Arkiv plus the passport provide a public migration record.

The unaudited badge is deliberate. The verifier is third-party and the prototype still has residual authorization and integration risk. This is a hackathon prototype, not a production security audit.”

## 7:45–8:30 — Close / final story

**Say:**

“So the complete story is:

First, we built and tested a real ML-DSA-44 wallet contract with replay protection, expiry handling, key rotation, real noble vectors, and a real verifier.

Second, we measured the cryptographic cost at 2,664,784 gas and captured the canonical mempool rejecting the frame with the literal `MAX_VERIFY_GAS` rule.

Third, we demonstrated the stake prerequisite with a mined 0.024 ETH registry readback and captured the unstaked sidecar validation failure.

Fourth, we registered `qdaywallet.eth`, wrote and read back the PQ key record through the project-owned resolver, and rotated the key without changing name ownership.

Fifth, we created and patched the Arkiv migration entity and verified the public Swarm passport bytes.

The remaining limitation is clearly marked: the sidecar-admitted, mined PQ frame is not claimed because the devnet gateway path did not produce that artifact. The UI makes that limitation visible instead of hiding it.”

## 8:30–9:00 — Final CTA

**Action:** Return to Wallet Home or Compose. Keep the canonical raw rejection or the wallet evidence trail visible.

**Say:**

“The point of Q-Day Wallet is not only to replace a signature algorithm. It is to show the complete migration surface: quantum-safe authorization, an admission path designed for expensive verification, identity continuity, and a public migration record.

The evidence is linked, the missing piece is named, and the demo is reproducible from the repository. This is Q-Day Wallet.”

## Judge questions — short answers

### “Why is the canonical mempool rejecting it?”

“Because ML-DSA-44 verification costs about 2.66 million gas, while the canonical verification budget is approximately 100,000. The raw response says `MAX_VERIFY_GAS`. That is an admission-policy rejection, not proof of a bad signature.”

### “Did the sidecar admit and mine the PQ frame?”

“Not in the final captured evidence. The stake readback is real, but the bounded frame attempts returned literal `Out Of Gas`, and the gateway-to-miner peer gate later went empty. We do not claim the missing frame hash.”

### “What does the stake prove?”

“It proves the entity’s on-chain registry state: 0.024 ETH was mined and read back from the NaiveStakingRegistry. It is a prerequisite for the intended alternate admission path, not a substitute for a mined PQ frame.”

### “Is the ENS write really PQ-authorized?”

“Yes, through the project-owned Permissioned Resolver path and the wallet’s executePq flow. It was read back through UniversalResolverV2. The default shared resolver has a separate ROLE_SET_TEXT authorization limitation, which we document honestly.”

### “Is the Swarm bonus complete?”

“The public passport reference and byte-equal readback are real. We did not purchase an owned postage batch, so we do not claim the postage-batch bonus.”

### “What is live and what is recorded?”

“The UI is a read-only evidence presentation. Chain reads and transaction artifacts were exported into `demoEvidence.json`; the Compose buttons do not send transactions. Every available explorer link points to the captured artifact.”

### “Why not just use ECDSA?”

“ECDSA is cheap and widely deployed, but it is not designed as a post-quantum signature. ML-DSA-44 is the point of the prototype: protect future authorization while making the new verification cost and infrastructure requirement explicit.”

## Words to avoid during recording

- Do not say “the sidecar mined the PQ transaction.”
- Do not call the sidecar “canonical” or call the canonical path “standard alt-mempool.”
- Do not say the default shared resolver accepted arbitrary text-role writes.
- Do not say Swarm postage was purchased.
- Do not call the UI buttons live transaction submission; they reveal recorded outcomes only.
