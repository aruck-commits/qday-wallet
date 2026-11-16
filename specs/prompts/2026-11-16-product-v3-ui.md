# Prompt — 2026-11-16 · UI v3 implementation (editorial-neon rebuild)

**Operator pivot (same day as `2026-11-16-competitor-teardown-v3.md`):** full
editorial-neon redesign of the whole app after losing first place to Quantum Smart
Wallet — "kuch achha modern Ui with animation dalega".

## Session 1 — designer subagent (ui-designer)

Wrote `specs/UI_SPEC_V3.md` (single file): Instrument Serif display (the one new dep,
`@fontsource/instrument-serif`), radius ladder 6/3/2/0, Send as a 5-stage journey
(COMPOSE→SIGN→VERIFY→EXECUTE→SETTLE) mapped honestly onto the lib's real op order,
`mined` as a first-class outcome with two honest tiers, Rosette/LedgerStamp/SettlePlate
theatrical system, ambient canvas (≤48 particles, DPR ≤1.5, ≤2% CPU, reduced-motion =
static frame), Keys bytegrid rendering the REAL pk-fingerprint nibbles, Evidence as a
dated museum timeline, honesty demoted to one footer strip + inline chips, ember
`#ff9d5c` restricted to celebration contexts.

## Session 2+3 — implementer subagent (frontend-developer)

Rebuilt per spec: 7 new components (`AmbientCanvas`, `CountNumber`, `LedgerStamp`,
`LedgerStrip`, `Rosette`, `StageRail`, `SettlePlate`), 5 rewritten components
(`RawWindow`, `ExposureCard`, `FrameInspector`, `GasPanel`, `ChainStatusChips`), all 7
screens (Home/Send/Keys/Evidence REBUILD; Identity/Registry/Architecture RESTYLE), new
`v3.css` layer imported after `v2.css`. Lib layer untouched. Network drop mid-session
was resumed from the same agent context with no lost work.

## Honest-copy architecture (the part that matters)

- `mined` Tier A "Admitted." renders ONLY from the gateway's real response hash; ONE
  `probeDevnetReceipt()` call (new lib read, `eth_getTransactionReceipt`) upgrades to
  Tier B "Settled." + BLOCK CountUp + one-shot 16-particle burst ONLY on a real
  blockNumber. Null/offline stays Tier A. No fabricated block numbers anywhere.
- `offline` → amber "Nothing was broadcast." with the real fetch detail + export
  affordance; `rejected` → verbatim RPC body with true `{code, rule}`.
- Signed-but-unsubmitted can only show the mint chip "signed + locally verified —
  nothing broadcast yet" — never the big plate.
- "accepted", "secure", "100%" appear nowhere as copy (grep-audited; only CSS
  `width: 100%` styles match).

## Main-session verification

- Spot checks: font import order, `v3.css` after `v2.css`, `AmbientCanvas` mounted,
  lib files untouched in `git status`.
- e2e `check-v3.mjs` (43 checks, updated from the 26-check v2 harness with v3 copy):
  **43/43 green, 0 console errors** — including the offline-terminal honesty checks
  ("Nothing was broadcast." present; "Settled."/"Admitted." ABSENT on the offline
  outcome) and FrameInspector DOM ground truth (every row carries a real value at full
  opacity — no clipped/blown-out tracks; the `.v2-send-inspect` wire-width guard
  survives in v3.css).

## Gates

- `npx tsc --noEmit` → exit 0
- `npx vite build --base /qday-wallet/` → exit 0 (692.30 kB chunk warning benign)
- e2e 43/43 + 0 page errors

Deployed to GitHub Pages (on push) and Vercel (root-path build) — URLs unchanged.
