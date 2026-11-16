# Prompt — 2026-11-16 · Post-hackathon product v2, part 2: UI rebuild by agent + main-session review

**Operator:** Arudra — "bro make the UI better now use the agents for help and also make
the product as we first discussed not half shit. the hackathon is over now i want to make
it better than what it is right now."

Continuation of `2026-11-16-product-v2-lib.md` (real crypto/frame/live-chain layer,
UI_SPEC_V2 design spec — see that file for part 1).

## What the frontend-developer agent did (opencode subagent, supervised)

Implemented the full v2 UI against `specs/UI_SPEC_V2.md` + `app/src/lib/PRODUCT_API.md`
with strict file ownership: screens/shell/components/CSS only — `lib/` read-only, no git
commands, no new dependencies.

1. **Shell** (`main.tsx` rewrite): sidebar ≥1280 / icon rail 768–1279 / bottom tab bar +
   More sheet <768; live chain chips (SEPOLIA LIVE · DEVNET OFFLINE, last-known block);
   session-key indicator; `?screen=` deep links with legacy aliases + browser back/forward;
   AnimatePresence transitions honoring `prefers-reduced-motion`; footer verbatim
   limitation copy.
2. **Seven screens** replacing v1 S0–S5 (hero + fake "Run journey" ACCEPTED simulator
   deleted as the design spec mandated): Home (live balances/ENS/intents), Send (real
   intent→sign→verify→frame→submission state machine; honest `NETWORK OFFLINE — nothing
   was broadcast` terminal + signed-frame JSON export; never renders ACCEPTED), Keys (full
   ceremony: generate/fingerprint/masked-secret/export-import keyfile/forget; session-only
   labeling; demo-grade warning), Identity (live `pq-key` read + MATCH/DIFFERENT badge +
   rotation record), Registry (live Arkiv entity `0xc6c0…d048` + snapshot fallback labeled
   COMMITTED + Swarm passport), Evidence (captured EF exhibit — REJECTED/OOG/0.024 stake
   readback with CAPTURED labels + FINDINGS export), Architecture (pinned-address node map
   with amber OFFLINE chip on the frame/relayer node).
3. **Components**: FrameInspector, GasPanel (canonical 2,664,784 vs 100k budget +
   alt-mempool declared limits), ExposureCard, PassphraseModal, StatusChip, CopyChip,
   ChainStatusChips, RefreshLine, NavIcons, CountUp, RawWindow.
4. **`v2.css`** new layer (craft.css untouched); tokens corrected to the brand (violet
   #a78bfa, red #f43f5e); `lib/format.ts` used for all numerals (4-dec ETH, 6+4 hashes,
   gas grouping, 2,420 B).

Quality gates at delivery: `tsc --noEmit` exit 0, `vite build --base /qday-wallet/` green.

## What the main session did (review + fixes)

1. **FrameInspector blowout fix** (`v2.css`): the right column's nested
   `.v2-send-inspect` grid had no `grid-template-columns`, so its `auto` track sized to
   the min-content of the unwrapped 5,511-char wire-JSON line → track resolved to
   26,658.5px; labels painted at x≈922 but right-aligned values at x≈27,000+ (clipped by
   the screen's `overflow-x: hidden` → invisible values, no page scrollbar). Fixed with
   `grid-template-columns: minmax(0, 1fr)` + `overflow-x: auto` on the raw-window pre.
   Verified by DOM geometry dump (panel 26,659→433px, value spans hit-testable in-viewport).
2. **Deployed-bundle link fixes**: `docs/VULNERABILITIES.md` relative links (main.tsx
   footer/sidebar + ArchitectureScreen) → GitHub blob URLs (they 404 in the served bundle).
3. **SendScreen honesty copy**: stale hardcoded "last probe …, 0 peers" → "did not respond
   to the live probe … offline since 07 Nov 2026".
4. **e2e**: wrote `check-v2.mjs` (26 checks, puppeteer-core against the built dist served
   by a static server — `vite preview` was found to 404 `Sec-Fetch-Dest: script`
   requests); drove the full Send flow incl. live devnet-gateway probe timeouts.
   **Result: 26/26 pass, 0 console errors**, incl. all 7 screens, real 2,420 B signature
   display, honest offline verdict, Evidence/Registry/Identity live-or-committed states,
   phone-width overflow check.

## Honest-copy rules kept

No fake ACCEPTED anywhere; devnet OFFLINE/last-known; captured data CAPTURED/COMMITTED
with explorer links; session keys labeled session-only; keyfile export warns demo-grade.
