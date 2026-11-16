# Prompt — 2026-11-16 · Post-hackathon product v2: real crypto + live chain layer

**Operator:** Arudra — "bro make the UI better now use the agents for help and also make
the product as we first discussed not half shit. the hackathon is over now i want to make
it better than what it is right now."

## Session goal
Turn the evidence-showcase demo into the product the spec promised (SPEC.md §2.1): the
browser performs REAL ML-DSA-44 keygen/sign/verify, builds REAL EIP-8141 frame
transactions, and does live chain reads — while the UI is redesigned by agents.

## What the AI did (opencode / GLM main session)
1. Verified ground truth post-hackathon: workshop devnet gateway TIMED OUT (retired);
   Sepolia public RPC live; Arkiv public RPC answers `arkiv_getEntity` /
   `arkiv_query` (`scheme = str('ML-DSA-44')`) WITHOUT an access key; entity
   0xc6c0…d048 alive (expiresAt ~block 1.57M).
2. Read `contracts/src/QDayWallet.sol` and mirrored `currentIntent` byte-for-byte in the
   browser: `keccak256(abi.encode("QDAY_INTENT_V1", chainid, wallet, target,
   keccak256(callData), pqNonce, deadline))` — the ML-DSA signature covers exactly the
   32 bytes the contract verifies (`abi.encodePacked(intent)`).
3. Built `app/src/lib/pq.ts` (noble ML-DSA-44 keygen/sign/verify, SHA-256 fingerprint,
   demo-grade keccak-stretch encrypted keyfile), `lib/frame.ts` (real frame tx via
   `@forshtat/hegota-support` — VERIFY 3.2M + SENDER frames, ARBITRARY scheme carrying
   the real 2420-byte signature; `toWire` JSON + canonical `encodeTx`), `lib/chain.ts`
   (Sepolia block/balance via publicnode fallback RPCs, live ENS `pq-key` read from our
   Permissioned Resolver, devnet gateway probe, Arkiv live query+entity), `lib/
   walletStore.ts` (session-only key state, sign-transfer pipeline with local verify
   gate), `lib/format.ts` (UI-spec formatting).
4. Added pinned dep `@forshtat/hegota-support@0.0.1` to `app/package.json` and verified
   the Vite browser bundle includes it; `tsc` green.
5. Smoke-tested the full path (`tooling/probe_sign.ts`): 1312/2560 key sizes, 2420-byte
   signature, verify=true / tampered=false, real frame txHash + 5,511-byte wire JSON.
6. Spawned a ui-designer subagent → `specs/UI_SPEC_V2.md` (screen-by-screen v2 spec;
   deletes the fake ACCEPTED simulator; renames Compose→Send, DemoConsole→Evidence).
   A frontend-developer subagent implements the screens against `PRODUCT_API.md` next.

## Guardrails kept
- `lib/` is agent-owned; subagents may not edit it and never run git commands.
- No secrets in the browser layer; public RPC only; devnet renders OFFLINE.
- Honest-copy rules documented in `app/src/lib/PRODUCT_API.md` (no fake ACCEPTED).
