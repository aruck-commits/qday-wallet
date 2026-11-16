# UI Spec — Q-Day Wallet v3.0 ("the event")

Supersedes `specs/UI_SPEC_V2.md`. Inputs: v2 spec (IA survives), `app/src/lib/PRODUCT_API.md`
(immutable lib contract), `specs/SPEC.md` §2.1, `README.md`, current `app/src/screens/*` +
`components/*` + `v2.css`, and the operator verdict: we lost to a product that made a
transaction feel like a **celebration** while ours read like a warning label.

**v3 thesis.** The app already does real work (ML-DSA-44 keygen/sign/verify in-browser, real
EIP-8141 frames, live Sepolia/ENS/Arkiv reads). What it lacks is *temperature*. v3 keeps every
real value and every honest artifact, and rebuilds the surface as an **editorial-dark product
with theatrical celebration states**: serif display moments, a five-stage Send journey where
the tx lifecycle IS the navigation, a giant stamp-and-rosette settle moment, an ambient
particle layer, and honesty demoted to one elegant footer line plus inline chips.

- **Honesty is never faked, only demoted.** `UNAUDITED` → footer strip. `CAPTURED` → small
  chips in Evidence. `OFFLINE` → inline amber state, never a screen header. No screen opens
  with a warning.
- **`mined` becomes a first-class outcome** (the Send flow is integrating a public
  alt-mempool gateway): explorer link, block number when the chain reports it, and the big
  VERIFIED/SETTLED celebration. `offline` and `rejected` stay as honest, elegant states.
- First 3 seconds of every screen: a working product, not a label.

Stack unchanged: React 18 + framer-motion 14 + zustand + custom CSS layers. **One new
dependency**: `@fontsource/instrument-serif` (Appendix A). No new animation deps.

---

## 0. Fixed design tokens (declared once in `v3.css`, used everywhere)

```
Canvas       --bg: #0b0d11 (neutral graphite — replaces craft.css's green-tinted #07110d)
Surfaces     --panel: #12151c · --panel2: #0e1116 (flat, no gradient fills on content)
Lines        --line: #232833 · --line-strong: #323949 (1px hairlines everywhere)
Type colors  --text: #eef1f6 · --muted: #8b93a3
Accents      --mint #7fdcb4 (live/success/verified) · --violet #a78bfa (PQ crypto)
             --red #f43f5e (rejection/danger) · --amber #e7b45c (pending/offline/stale)
             --ember #ff9d5c (NEW — celebration/ledger-settled ONLY; never pending, never error)
Radius ladder --r-panel: 6px · --r-window/--r-button: 3px · --r-chip: 2px · --r-stamp: 0
Shadows      none at rest; --shadow-lift 0 6px 16px rgba(4,8,12,.25) on hover/drawer only;
             settle plate gets one deep static shadow 0 24px 60px rgba(0,0,0,.45)
Fonts        --serif: "Instrument Serif", serif (display) · Space Grotesk (body/UI) ·
             --mono: "Space Mono" (all numerals, hashes, kickers, tables — tabular-nums)
```

**Type scale**

| Role | Font | Size | Usage |
|---|---|---|---|
| Display XL | Instrument Serif 400 (italic for punch word) | clamp(44px, 7vw, 76px) / lh 1.02 | Home hero, settle stamp word |
| Display L | Instrument Serif 400 | clamp(30px, 4vw, 44px) | Every screen `h2` |
| Display M | Instrument Serif 400 italic | 26–32px | Outcome headings ("Nothing was broadcast."), panel statement lines on Home |
| Body | Space Grotesk 400/500 | 15px / 1.65 | ledes, paragraphs, buttons |
| Data | Space Mono | 11–13px / tabular-nums | numerals, hashes, rows, kickers (eyebrow stays mono via `brand-font.css` routing) |

No text-shadow glow, ever. Serif is warm, not neon.

---

## 1. What survives / what gets rebuilt

The v2 IA is untouched: **7 routes, same ids, same `?screen=` deep links, same one-question
test discipline.** What dies is the terminal-density skin: equal-weight gray panels, mono
headlines everywhere, warnings as headers. The DATA survives and is re-lit.

### 1.1 Per-screen verdict

| Screen | Verdict | Rationale |
|---|---|---|
| `home` | **REBUILD** | Account strip → editorial hero + capability cards + record index (§5) |
| `send` | **REBUILD** | 6-step tracker + stacked panels → 5-stage journey with stage rail and outcome plates (§3) |
| `keys` | **REBUILD (ceremony layer)** | Bytegrid becomes the fingerprint ritual; structure/data survives (§4) |
| `evidence` | **REBUILD** | Red verdict lanes → records/museum editorial timeline (§6.3) |
| `identity` | **RESTYLE** | Same zones; serif name hero, editorial record card (§6.1) |
| `registry` | **RESTYLE** | Same zones; entity as ledger plate; passport drawer survives (§6.2) |
| `architecture` | **RESTYLE** | Same 5 nodes + pinned addresses; editorial diagram (§6.4) |

### 1.2 Component verdicts

| Component | Verdict | Notes |
|---|---|---|
| `AmbientCanvas`, `Rosette`, `LedgerStamp`, `StageRail`, `SettlePlate`, `LedgerStrip` | **NEW** | §3, §4, §5, §7 |
| `FrameInspector` | **RESTYLE — all data kept** | txType 0x06, frames VERIFY(1)+SENDER(2), ARBITRARY (0x0) violet chip, 2,420 B sig + sha256, intent digest, frame hash, wire bytes, LOCAL VERIFY chip, wire RawWindow — same rows, ledger presentation (§3.4) |
| `GasPanel` | **RESTYLE — all data kept** | canonical 100,000 budget vs measured 2,664,784 (red overshoot ~26.6×), alt limits 3,200,000 / 6,500,000 violet fills, amber "gas is not the blocker" line (§3.4) |
| `ChainStatusChips` | **RESTYLE** | renamed/demoted copy (§2.2) |
| `RawWindow`, `Stamp`, `StatusChip`, `CopyChip`, `Timeline`, `RefreshLine`, `ExposureCard`, `PassphraseModal`, `ErrorBoundary`, `CountUp`, `NavIcons` | **KEEP** (skin tweaks inline) | radius ladder + accent tokens flow in via v3.css |
| Sidebar `UNAUDITED` badge, v2 step-dot tracker list, Home `AccountStrip` + Zone B stat wall | **DELETE** | honesty moves to footer (§9); tracker becomes StageRail; account strip becomes hero + LedgerStrip |

### 1.3 One question per screen (3-second test — unchanged discipline, updated copy)

| Screen | The one question |
|---|---|
| Home | What is this, and what is it doing right now? |
| Send | Can I authorize a spend with a PQ key — and what did the network say? |
| Keys | Where is my key, and how exposed am I? |
| Identity | Does my name still resolve to a PQ key? |
| Registry | Where is my migration record, and can I read it right now? |
| Evidence | What did the mempools actually say? |
| Architecture | How do the pieces fit, and what is unaudited? |

---

## 2. Shell

```
┌────────────────────────────────────────────────────────────────────────────┐
│ ◈ Q-Day Wallet   [SEPOLIA · LIVE 12,080,244] [ALT-MEMPOOL · OFFLINE]  [ML-DSA-44 · session] qdaywallet.eth 0x3b7C…79b1 │
├───────────┬────────────────────────────────────────────────────────────────┤
│ sidebar   │ screen content (max-width 1160px)          ambient canvas behind │
├───────────┴────────────────────────────────────────────────────────────────┤
│ TEST TOKENS ONLY · CONTRACT LAYER UNAUDITED · EVIDENCE LINKS TO EXPLORERS · ML-DSA-44 VERIFY = 2,664,784 GAS · docs/VULNERABILITIES.md │
└────────────────────────────────────────────────────────────────────────────┘
```

### 2.1 Brand wordmark
`◈` (existing SVG mark, mint, 20px) + **"Q-Day"** in Instrument Serif *italic* 21px +
**"WALLET"** in Space Grotesk 500 11px, letter-spacing 0.24em, uppercase, baseline-aligned,
gap 10px. Click → `home`. First serif on the page — it sets the register in one glance.

### 2.2 Header (sticky, 60px, backdrop blur — carried over)
- **Chain cluster (center):**
  - `SEPOLIA · LIVE` mint dot (2s pulse) + block number in Space Mono ticking every 12s via
    viem public RPC, CountUp on change (real value, e.g. `12,080,244`; never a frozen fake-live
    dot — STALE amber → UNREACHABLE red degradation carried over from v2).
  - `ALT-MEMPOOL` chip — the gateway status, fed by the real `probeDevnetGateway()`:
    `LIVE` mint (probe answered with chainId) / `OFFLINE` amber + `last known 11,051` /
    `PROBING` hollow amber. Tooltip: "Gateway last reachable 07 Nov 2026; latest probe 0 peers."
- **Session-key indicator (right, before account chip):** key exists → violet dot +
  `ML-DSA-44 · session` violet chip → click → `keys`. No key → hollow amber dot +
  `NO SESSION KEY`. This is the header's only PQ signal; nothing else needs it.
- **Account chip:** `qdaywallet.eth · 0x3b7C…79b1` (mono 6+4 CopyChip). Scheme tag removed —
  the session chip carries PQ identity now.

### 2.3 Footer — the single honesty strip
One line, Space Mono 10px, muted, wraps on mobile:
`TEST TOKENS ONLY · CONTRACT LAYER UNAUDITED · EVIDENCE LINKS TO EXPLORERS · ML-DSA-44 VERIFY = 2,664,784 GAS · docs/VULNERABILITIES.md ↗`
Every honest artifact that used to be a badge now lives here or inline (§9). Static, full
contrast, never animated, present on every screen.

### 2.4 Nav containers (carried over from v2, compact)
- **≥1280:** fixed sidebar 200px — 7 items, inline SVG 16px icons + Space Mono 11px labels;
  active = mint text + hairline border. **UNAUDITED badge deleted from sidebar** (lives in
  footer).
- **768–1279:** 56px icon rail, tooltips on hover/focus.
- **<768:** bottom tab bar 56px + safe-area: `Home · Send · Keys · Identity · More`;
  `More` sheet lists `Registry · Evidence · Architecture`. Active = mint.
- Header wraps to two rows <768 (chips row 2); content padding 18px/14px.

---

## 3. Send — THE centerpiece journey

The transaction lifecycle is the navigation: five visible stages,
**COMPOSE → SIGN → VERIFY → EXECUTE → SETTLE**, mapped honestly onto the real machine
(`intent → signed → verified → frame → submission → outcome` — the lib's true op order:
`signTransfer` does digest → sign → verify → frame).

### 3.1 Machine → stage mapping (exact)

| Stage | Machine state(s) | Real content |
|---|---|---|
| 1 COMPOSE | `idle → intent_built` | recipient + amount form → keccak256 intent digest (32 B) |
| 2 SIGN | `signed` | `ml_dsa44.sign(digest, sk)` → 2,420 B ML-DSA-44 signature |
| 3 VERIFY | `verified` | `ml_dsa44.verify(sig, digest, pk)` locally → TRUE (same check the on-chain verifier runs) |
| 4 EXECUTE | `frame_built / submitting` | EIP-8141 frame assembled (txType 0x06, VERIFY 1 + SENDER 2, ARBITRARY 0x0) → `eth_sendFrameTransaction` POST |
| 5 SETTLE | `outcome` | `mined` (celebration) / `offline` (amber) / `rejected` (red verdict) |

Gate (carried over): no session key → step 1 shows `KEY REQUIRED` and the primary button is
`Generate a key first` (violet → `keys`). The flow never fakes progress without a real key.

### 3.2 Stage rail (`StageRail` — the journey nav)

- Horizontal rail under the screen heading, sticky on desktop (`top: 76px`). Each stage:
  10px dot + Space Mono 11px uppercase label. States: **future** (hollow dot, muted),
  **active** (amber-filled dot, 1.6s pulse, label text color), **done** (mint dot, text,
  clickable → `scrollIntoView` of its card, `behavior: smooth`, skipped under reduced motion).
- A 2px spine runs behind the dots; the mint fill extends left→right via `scaleX` transform
  (280ms, `--ease-qday`) each time a stage completes.
- `aria`: `<ol>` with `aria-current="step"` on the active stage; done stages are real buttons
  with focus rings (2px mint outline).
- <768: the rail scrolls horizontally, dots 8px, labels 9px; active stage auto-scrolls into view.

### 3.3 Stage cards (left column, stacked — completed cards dim, nothing collapses)

Desktop grid `7fr 5fr` (right rail §3.4). Completed cards dim to 55% opacity and lose their
accent rule; the active card gets full opacity + a 2px left rule in its accent color. No
collapse animations, no layout jumps — the rail carries the journey.

| Card | Content (all real values) | Animation on activation |
|---|---|---|
| **COMPOSE** | IntentForm: recipient input (42-hex validation, red inline), amount input (ETH, 4 decimals, right-aligned mono), advanced disclosure (nonce `8` + the HegotaSupport 7-helpers caption, chainId `1337`, execution limit `3,200,000`), caption `Intent authorizes a spend on QDayWallet 0xc5a8…091f (devnet 1337).` On build: digest row `intent 32 B · keccak256(wallet, recipient, amount, nonce, chainId) · 0x<6+4>` (CopyChip) | rows fade/slide in, 12px y, spring 260/26, 60ms stagger |
| **SIGN** | `signature 2,420 B · ML-DSA-44` + `sha256 <6+6>` (CopyChip). A 3px violet "ink bar" fills left→right under the row (one-shot `scaleX` 500ms) — the signing gesture, not a fake progress bar. Caption: `signed by the session key in this tab — the secret never left the browser.` | ink bar + row reveal |
| **VERIFY** | Mini ledger stamp **"Verified."** (mint, 96px, §3.5 component) + caption `local ml_dsa44.verify = true — the same ML-DSA-44 check MLDSAVerifier runs on-chain.` + `signed + locally verified — nothing broadcast yet` footnote chip (mint hairline). Verify `false` (bug, not UX) → terminal red halt card `local verification failed — flow halted` + diagnostics link | stamp lands: scale 1.5→1, rotate −9°→−3°, spring 380/17, 240ms |
| **EXECUTE** | Frame summary line `txType 0x06 · VERIFY (1) + SENDER (2) · ARBITRARY (0x0)` (violet chip) + **SubmissionPanel** moved here: endpoint row `eth_sendFrameTransaction @ altmempoolgateway.forshtat.com/rpc` with live probe dot (mint responding / amber offline), session attempt list (time · method · result chip · note, newest first, survives Reset). Primary button lives here when reached: **`Attempt submission`** | frame rows stagger in 40ms each; attempt rows prepend with 160ms fade |
| **SETTLE** | Empty until an outcome lands, then the **SettlePlate expands across BOTH columns** (§3.5) and the page smooth-scrolls to it | plate entrance below |

**The single primary button** follows the machine across cards (one at a time, never two):
`Build intent` (COMPOSE) → `Sign & build frame` (after intent; paints stages 2–4 in sequence:
SIGN ink bar → 420ms paint gap → VERIFY stamp → 420ms paint gap → EXECUTE frame rows)
→ `Attempt submission` (EXECUTE) → outcome lands → `New intent` (quiet, in the plate).
`paintGap` = 420ms (0 under reduced motion) — the whole post-sign sequence stays < 1.5s.

### 3.4 Right rail (sticky `top: 76px`) — the data survives, re-lit

- **`FrameInspector`** — panel title stays Space Grotesk ("Frame inspector"); kicker
  `FRAME INSPECTOR / EIP-8141`. Every row kept: txType `0x06 · ethrex-eip8141-tracer`; frames
  `VERIFY (1) + SENDER (2)` (SENDER row: target 6+4 · exec `50,000` · state `200,000` · value);
  sig scheme `ARBITRARY (0x0)` violet chip; `signature 2,420 B ML-DSA-44 · sha256 <6+6>`;
  intent digest + frame hash CopyChips; `wire <n> B JSON · signature 2,420 B`;
  `LOCAL VERIFY: TRUE` rendered as a small mint stamp when true (red chip when false);
  wire JSON in a divider-separated RawWindow (never a nested card). Idle state: schema
  placeholders, sizes only, no hex. Rows animate in once, 40ms stagger, when the frame exists.
- **`GasPanel`** — kicker `GAS / VERIFY COST VS MEMPOOL BUDGETS`. Three flat bars, 10px tall:
  canonical lane red full-width fill + mint tick at 3.7% + note `overshoot — ~26.6× the
  MAX_VERIFY_GAS budget`; alt lanes violet at 83.3% (3,200,000) and 41.0% (6,500,000).
  The amber line stays as a footnote caption: `recorded Out Of Gas at both limits — gas is not
  the current blocker; gateway validation is.` Bars animate width once on populate (500ms
  ease-out), never loop.

### 3.5 Outcomes — the theatrical moment (first-class `mined`)

**`Rosette`** (shared component): deterministic SVG guilloche — 18 ellipses (rx 240, ry 92)
rotated i·10°, one dashed circle r 150, all 1px strokes, `currentColor`, fill none. Slow
rotation: `rotate 0→360` over 90s linear infinite (paused under reduced motion). Used behind
the settle stamp (ember/mint), the Home hero (neutral, 6% opacity), and the Keys panel (violet).

**`LedgerStamp`** (shared component): circular rubber stamp, SVG 176px — outer ring 2.5px,
inner ring 1px, mono 10px uppercase text on a circular path: top arc `EIP-8141 · ALT-MEMPOOL ·`,
bottom arc `ML-DSA-44 · ARBITRARY ·`; center: Instrument Serif italic 30px word + Space Mono
12px subline. Whole stamp rotated −7°. Entrance: scale 1.7→1, rotate −14°→−7°, spring 380/17,
260ms; on land the plate receives a one-shot 120ms y-pulse `[0,−2,0]`. Color = outcome tone.

**`mined` — the SettlePlate** (the celebration; spans `grid-column: 1 / -1`, pushes the rail
down, deep static shadow, `overflow: hidden`, `position: relative`):

- Rosette behind (520px, tone color at 12% opacity, rotating).
- Center: **LedgerStamp**, ember ring. Two honest tiers — never fabricated:
  - **Tier A (gateway returned a tx hash):** word **"Admitted."**, subline `0x<6+4>` frame
    hash, caption under plate: `the gateway accepted the frame — block confirmation follows on
    the explorer.`
  - **Tier B (block confirmed — gateway response carries `blockNumber`, or a follow-up
    receipt probe succeeds):** word **"Settled."**, subline `BLOCK <n>` with CountUp (700ms
    ease-out). This is THE moment: stamp slams, ambient canvas fires a one-shot burst of 16
    mint/ember squiggles from the stamp's position (§7).
- Settled ledger rows (mono, hairline dividers): `amount` (CountUp on the ETH value) ·
  `recipient` 6+4 · `frame hash` CopyChip · `intent digest` CopyChip · `gateway` hostname ·
  `signed by ML-DSA-44 session key · locally verified before broadcast`.
- Actions: `View on explorer ↗` (primary-quiet, `https://explorer.altmempool.wtf/<hash>`) +
  `New intent` (quiet). Attempt list gains the row `mined · gateway returned 0x<6+4>`.
- Header chip flips to `ALT-MEMPOOL · LIVE` (real probe state), Home activity appends the
  session attempt marked `SESSION`.

**`offline` — amber honest plate** (in-flow, same span, no stamp): Instrument Serif italic
heading **"Nothing was broadcast."** + body (verbatim, updated): `The gateway did not respond.
Your signature, frame, and local verification are real; the network that would admit this frame
has been offline since 07 Nov 2026.` + fetch-detail footnote line + quiet actions
`Export signed frame (JSON)` (`qday-frame-<framehash>.json`, note field intact) and
`View Evidence →`. Amber hairline, amber heading, generous whitespace — elegant, not alarming.

**`rejected` — red verdict card**: Instrument Serif italic heading **"The mempool refused."**
+ rectangular `Stamp` (red, kept from v2) with verbatim `REJECTED · code <code>` + `rule`
verbatim + hint line + RawWindow with the full response verbatim + quiet `Try again`.

Reduced motion: stamps appear with a 150ms opacity fade, no slam, no pulse, no burst.

### 3.6 Send on mobile (<768)
Single column: StageRail (horizontal) → COMPOSE card → sticky bottom action bar (above tab
bar) holding the contextual primary → SIGN/VERIFY/EXECUTE cards → FrameInspector and GasPanel
as collapsed accordions (FrameInspector auto-opens once the frame exists) → SettlePlate
full-width. The action bar shows an inline spinner during submission.

---

## 4. Keys — the ceremony as a moment

The bytegrid stops being a random LED toy and becomes a **fingerprint ritual**: the 16×4 grid
(64 cells) renders the **first 64 hex nibbles of the real public-key fingerprint** — cell
brightness = nibble value mapped to violet alpha 0.15–1.0 (`title`/`aria-label`:
"first 64 nibbles of the pk fingerprint, rendered as a grid"). It is real data made visible.

- **States:** `IDLE` (all cells `#171b22`, hollow amber LED) → `GENERATING…` (LED blinks amber,
  button disabled, real keygen runs) → **`SETTLED`**: cells wave in top-left→bottom-right,
  6ms stagger, `scale 0.6→1 + opacity`, spring; violet LED on with a single static glow.
- **Fingerprint reveal choreography:** after the wave, `pk fingerprint sha256:86c769…f28b62`
  wipes in character-by-character (22 chars × 18ms opacity stagger, mono), then a small violet
  **LedgerStamp "Materialized."** (96px, subline `ML-DSA-44 · SESSION`) stamps in at −3°, then
  `KeyStats` count up from 0: `1,312 B · 2,560 B / masked · 2,420 B` (600ms).
- **Regenerate / Forget:** grid fades out 150ms (exit), then the ritual replays for the new
  fingerprint. Import: same choreography after decrypt success.
- Right column: `ExposureCard` restyled as an editorial pair — no key: red hairline, serif
  italic line **"Exposed."** + the harvest-now-decrypt-later body (`owner EOA's ECDSA pubkey
  has been public since its first transaction`); key present: mint hairline, serif
  **"Mitigated."** + `spend authorization now ML-DSA-44 (V9 residual dual-sig remains)`.
  `RotationRecord` strip kept verbatim (violet hairline): `pq-key version 1 · rotated on-chain
  tx 0x1471…7dafb ↗ · owner unchanged — the name never moved; only the key did.`
- Keyfile export/import modal, passphrases, captions, `window` warnings: all v2 behavior kept.
- Caption (permanent, under the device): `The secret key lives in this tab only. Refresh
  clears it; the keyfile restores it.` + `Ceremony runs locally. No network needed.`
- Rosette behind the device panel: violet, 8% opacity, static on this screen (motion lives in
  the grid wave).

---

## 5. Home — product landing

The austere account strip is deleted. Home now answers *"what is this, and what is it doing
right now?"* in one glance, then gives the data.

- **Hero** (full-width, ~46vh): mono eyebrow `Q-DAY WALLET · POST-QUANTUM SPEND AUTHORIZATION`;
  Instrument Serif display XL: **"Harvest now, decrypt later is a *today* problem."** (punch
  word *today* in italic); Space Grotesk sub (max 62ch, muted): `Every ECDSA signature ever
  broadcast is being recorded against the day a quantum computer can forge it. Q-Day Wallet
  signs spends with ML-DSA-44 (FIPS 204) — 2,420-byte signatures, verified on-chain for
  2,664,784 gas, admitted through EIP-8141 frame transactions.` Neutral Rosette behind at 6%
  opacity (line-work, not a gradient). Spring entrance: eyebrow → headline → sub → stat row,
  80ms stagger.
  **Primary CTA:** session key exists → `Send with a PQ key →` (mint primary); none →
  `Generate your PQ key` (violet primary, → keys). One primary on the screen.
- **LedgerStrip** (one hairline-topped mono line, four live values with CountUps — replaces
  the three stat panels): `qdaywallet.eth · 0.5497 ETH on Sepolia (block 12,080,244) ·
  0.0240 ETH staked (registry readback OK) · session key ML-DSA-44 READY|NOT GENERATED`.
  Stale/offline: values dim + amber `stale`/`committed` chips inline; zero balance keeps the
  honest copy `0.0000 ETH — reads work; nothing was funded on Sepolia for this address.`
- **Capability cards** (3-up grid ≥768, stacked <768; text-led, no illustrations):
  1. `PQ KEYS IN-BROWSER` (violet) — serif statement "Your key is born here." + live row:
     fingerprint `sha256:86c769…f28b62` + `session-only` + state chip; quiet → keys.
  2. `ENS IDENTITY` (mint) — serif "The name already points at a PQ key." + live row:
     `qdaywallet.eth` + `pq-key` LIVE/COMMITTED chip + resolver `0x863b…c8e4`; quiet → identity.
  3. `LIVE REGISTRY` (mint/amber) — serif "The migration record is public." + live row: entity
     `0xc6c0…d048` · `ACTIVE` · LIVE/COMMITTED chip; quiet → registry.
- **THE RECORD** (editorial index, hairline dividers, 44px rows — the ActivityTable data,
  restyled): the 11 recorded artifacts (kind glyph → label → chain chip → hash 6+4 CopyChip →
  status chip → explorer ↗) + the permanent quiet amber line `PQ frame admission — not
  achieved · see Evidence →` (a row, never a header). Session intents below (newest 5):
  time · recipient 6+4 · amount · digest CopyChip · `signed` violet chip.
- Refresh line (refreshing/refreshedAt + manual refresh) stays above THE RECORD.

---

## 6. Per remaining screen

### 6.1 Identity
Restyle: the name becomes the display — `qdaywallet.eth` in Instrument Serif 44px with the
owner chip `OWNER / 0xe104…c9b0` beneath, and the resolution verdict as a single mint chip
`REGISTERED · PQ RECORD ON-CHAIN` (no red/amber banner theater). The `PqRecordCard` becomes an
editorial record: mono rows for the live-read `pq-key` value `sha256:86c769…f28b62`, resolver
`0x863b…c8e4`, the `MATCH` / `DIFFERENT KEY` comparison chip + its explanatory caption, the
`Verify resolution` primary button, and the COMMITTED fallback line (`committed evidence · read
back through UniversalResolverV2`) as a small amber caption. Resolver card keeps address/role/
setResolver tx `0xc1c1…1488 ↗`. The rotation timeline (`Timeline` component) is restyled as an
editorial chronology — serif node labels (`registration` / `PQ text write` / `key rotation`),
mint dots, tx links `0xd6d1…25f1 ↗` · `0x8dfe…b4b4 ↗` · `0x1471…7dafb ↗`, closing line
"the name never moved; only the key did." All data, one calm voice.

### 6.2 Registry
Restyle: the entity becomes a **ledger plate** — `qday.migration · Rabdi (7,794,095)` as the
mono toolbar, entity `0xc6c0…d048` as a CopyChip headline with the `ACTIVE` mint chip, rows for
writer `0xe104…c9b0`, `pqKeyVersion 1`, patch tx `0xcd9c…d8f5 ↗`, expiry. The committed/live
distinction stays as the small LIVE/COMMITTED/UNREACHABLE chip and the amber caption
("values below are committed build-time evidence, not a live read") — demoted from banner to
footnote. The snapshot table (entity key, schema, swarm ref `81c74b46…c49c74`, query matches)
keeps per-row source chips. The **passport drawer** survives verbatim: bzz.limo fetch, JSON in
RawWindow, `byte-equal read-back verified` mint chip, `open original ↗` — restyled with the
same spring/exit system as all drawers (160ms exit). `Fetch live entity` stays the primary
(disabled-with-caption without an access key).

### 6.3 Evidence — records/museum, not a wall of red
**Rebuild.** The three red lanes become **"The Record" — an editorial, dated timeline** of
captured findings, told as chronology with generous whitespace: each entry is a quiet row
(mono date line `07 Nov 2026 · IST` + entry title in Space Grotesk + one-line verdict +
`CAPTURED · docs/FINDINGS.md` as a small amber footnote chip + the verbatim raw response in a
collapsed `<details>` RawWindow). Order: `1. Canonical mempool — REJECTED · MAX_VERIFY_GAS`
(code −32000, budget rule) → `2. Alt-mempool, unstaked — REJECTED · Out Of Gas` →
`3. SpikeWallet stake — MINED · 0.0240 ETH · registry readback via getDepositInfo: OK ·
tx 0x58ab…d678 ↗` (the one mint entry, given its serif moment) → `4. Alt-mempool, staked —
Out Of Gas at BOTH declared limits 3,200,000 and 6,500,000`. The closing note states the
frontier once, in one amber sentence: `no admitted, mined PQ frame is claimed — awaiting
gateway-to-miner restore (REDEPLOY_RUNBOOK).` Red is reserved for the verdict stamps; the page
itself is calm graphite. Footer row keeps the quiet `Export FINDINGS summary (JSON)` and the
single cross-link `Try a live attempt from Send →`. No live fetch, no success lane — the
absence is stated, not decorated.

### 6.4 Architecture
Restyle: the 5-node flow (`Browser signer → Frame tx/sidecar → MLDSAVerifier → QDayWallet →
ENS/Arkiv`) becomes an editorial diagram — node cards with mono `NODE 01…05` kickers, serif
node titles, and hover-reveal CopyChips for the pinned addresses (verifier `0x17b0…17e4`,
wallet `0xc5a8…091f`, factory `0xa37d…06b3`, registerA `0x6E38…7f86`, registerT `0x109c…3BEB`).
The sidecar node keeps its amber `OFFLINE` dot (consistent with the header chip). The gas
footnote strip keeps the real numbers: `measured 2,664,784 / pinned reference 2,689,594 ·
canonical budget ~100,000 · precompute 5,540,000 + 2,290,000`. `UNAUDITED CONTRACT STACK`
moves to the footer strip; the screen keeps a quiet `Read limitations →` link to
`docs/VULNERABILITIES.md`. Static screen, no empty/error states.

---

## 7. Ambient layer (exact implementation)

**Canvas particles** (primary — the winner's floating squiggles, our restraint):

- One fixed `<canvas>` (`AmbientCanvas`), `position: fixed; inset: 0; z-index: 0;
  pointer-events: none; aria-hidden`, content layers at `z-index: 1`. Rendered behind
  everything, never over content.
- **Sprites, not per-frame paths:** 3 squiggle sprites pre-rendered once to offscreen canvases
  (64×24px cubic-bezier "electron" squiggle, 1.5px stroke, mint / violet / ember at full
  alpha). Per frame: `drawImage` with `globalAlpha` 0.05–0.16 — no shadowBlur, no per-frame
  path building.
- **Density:** `count = clamp(floor(width*height / 40000), 12, 48)` desktop; cap **24** <768.
  Velocity 6–14 px/s drift, slow rotation ±10°, edge wrap-around. Tone mix 50% mint / 35%
  violet / 15% ember.
- **Performance rules:** DPR capped at 1.5; a single rAF loop; loop paused on
  `document.visibilitychange` hidden; no DOM nodes per particle; no layout reads in the loop;
  resize via one debounced handler. Budget: ≤2% CPU on a 2019 laptop at 48 particles.
- **`burst({x, y, count, tone})`** export: one-shot celebration burst — 16 short-lived
  squiggles (life 700ms, ease-out drift + fade, slight rotate) fired from the settle stamp's
  position. Only call site: `mined` Tier A/B landing.
- **Reduced motion:** `useReducedMotion()` + `matchMedia('(prefers-reduced-motion: reduce)')`
  → draw ONE static frame at half density, stop the loop, never burst.
- **Static CSS auras (the only gradients in the product):** `body::before/::after` — two fixed
  radial auras (mint 4% at 80% −10%, violet 3% at 10% 110%), 900px, static, `z-index: 0`.
  These replace craft.css's body radial gradient. Gradients never touch content surfaces.

---

## 8. Motion system (framer-motion only — no new animation deps)

| Token | Value | Applied to |
|---|---|---|
| `entrance.panel` | spring stiffness 260, damping 26; `opacity 0→1, y 12→0` | cards, plates, hero blocks |
| `stagger` | 60ms (screen sections) · 40ms (inspector rows) · 80ms (hero) · 6ms (bytegrid wave) | per parent |
| `stamp.land` | spring stiffness 380, damping 17, 260ms; scale 1.7→1 (mini 1.5→1), rotate −14°→−7° | LedgerStamp, mini stamps |
| `spine.fill` | scaleX 280ms `--ease-qday` cubic-bezier(0.23,1,0.32,1) | stage rail |
| `bar.fill` | 500ms ease-out, one-shot on populate | gas bars, signature ink bar |
| `countup` | 300–400ms ease-out on CHANGE ONLY (never idle-spinning); 700ms for settle block number | balances, block ticker, gas values, key sizes, settle amounts |
| `exit` | 160–180ms, ease-in, `opacity →0` + `y −6` (plates) or `scale 0.98` (drawers/modals) | AnimatePresence: outcome plates, passport drawer, modals, More sheet |
| `pulse` | 1.6–2s ease-in-out, opacity only | active stage dot, live dots |
| `rosette.spin` | 360° / 90s linear infinite | ambient rosettes only |

**Choreography order (Send):** COMPOSE rows → digest reveal → (button) → SIGN ink bar →
420ms → VERIFY stamp lands → 420ms → EXECUTE frame rows → (button) → submission spinner →
SETTLE plate expands + stamp lands + burst + count-ups → explorer link settles last (fade in
200ms after stamp).

**Reduced motion (global contract):** every spring/loop/count-up resolves to instant or a
single 150ms opacity fade; `paintGap` = 0; stamps static; spine fills instantly; bytegrid
renders its final state; ambient static frame; bursts disabled. Existing v2 CSS
`prefers-reduced-motion` blocks carry into v3.css.

---

## 9. Honesty placement map

| Artifact | v2 position | v3 position |
|---|---|---|
| UNAUDITED | sidebar badge + footer strip | **footer strip only** (+ quiet link on Architecture) |
| CAPTURED | chips on every Evidence lane header | **small amber footnote chips inside Evidence record rows**; COMMITTED chips inline on Identity/Registry/Home live values |
| OFFLINE (gateway) | header chip + screen-level badges | **header chip (amber) + inline states**: Send outcome plate, gateway probe dot, Registry toolbar dot. Never a screen heading |
| NOT ACHIEVED | queue row + lane captions | **one quiet amber line in Home's THE RECORD** + Evidence closing sentence |
| Test tokens / demo | scattered badges | **footer strip, once, always** |

**The no-faking contract (unchanged in spirit, extended for the celebration era):**

1. `ACCEPTED` / `ADMITTED` / `SETTLED` / `VERIFIED` may **only** render from (a) a real gateway
   response (hash / error verbatim), (b) a real chain read, or (c) locally-computed
   `ml_dsa44.verify` result. Nothing else can produce those words.
2. A session-signed frame that is **not yet submitted/mined** may only celebrate as
   **"signed + locally verified — nothing broadcast yet"** (the mint footnote chip in the
   VERIFY stage) — small stamp, never the big plate.
3. `mined` renders "Settled." + block number **only** when a real block confirmation exists
   (gateway response field or receipt probe); otherwise "Admitted." + hash + explorer link.
   The distinction is visible copy, not decoration.
4. Offline states stay elegant and truthful; the amber plate says exactly what is real
   (signature, frame, local verify) and what is not (broadcast).
5. Captured values always carry their `CAPTURED`/`COMMITTED` source chip at point of use;
   `format.ts` remains the single formatter so Evidence and Home can never disagree.

---

## 10. Responsive + anti-slop checklist

### Responsive (carried over compactly)

| Range | Shell | Screen notes |
|---|---|---|
| ≥1280 | Sidebar 200px, content max 1160px | Send 7/5 grid; stage rail sticky |
| 768–1279 | Icon rail 56px, tooltips | Send grids → 1 column at <1100 effectively via panel wrap; FrameInspector stays visible |
| <768 | Tab bar 5 tabs + More sheet; header wraps | Send single column + sticky action bar + accordion inspectors; stage rail horizontal-scroll; SettlePlate full-width; capability cards stack; hero clamp handles 375px |
| <480 | Tables drop `action` column into row-tap | LedgerStrip wraps to two lines; hash chips keep 6+4; keystats 1-col |

Breakpoints stay consolidated at 1279 / 767 / 479 in v3.css.

### Anti-slop checklist (audited per screen)

- **No gradient heroes.** Hero = serif type on flat graphite + line-work rosette. The only
  gradients in the product are the two static ≤4%-opacity ambient auras on the backdrop layer.
- **No uniform radius.** Ladder 6 (panels) / 3 (windows, buttons) / 2 (chips) / 0 (stamps).
- **No emoji icons.** Inline SVG 16px, 1.5px stroke, `currentColor`; `◈ → ↗` brand glyphs stay.
- **No card-in-card.** RawWindow and plate rows are divider-separated regions, never nested boxes.
- **One primary action per screen.** Home → Send/key CTA; Send → the contextual machine button;
  Keys → Generate / Download keyfile; Identity → Verify resolution; Registry → Fetch live entity;
  Evidence → none (export quiet); Architecture → none.
- **Semantic accents only, five roles.** mint = live/success/verified; violet = PQ crypto;
  red = rejection/danger/exposure; amber = pending/offline/stale/committed; **ember =
  celebration/settled ONLY** (never pending, never error — it cannot be confused with amber's
  meaning: hue-shifted orange vs yellow, and it appears exclusively inside settle plates,
  stamps, and ambient bursts).
- **Celebration is earned.** Plates/stamps render only from real outcomes (rule 9.1–9.3);
  no decorative "success" moments anywhere else.
- **No glow.** No text-shadow, no animated box-shadow glow; the winner's neon glow is adopted
  as *color temperature and motion*, not blur.
- **Ambient never obstructs.** Canvas at z 0, alpha ≤ 0.16, paused when hidden; content
  contrast untouched.
- **No fake data, no fake progress.** Ink bars/bursts/spins accompany real operations; every
  number traces to RPC, browser crypto, or committed evidence.
- **Honesty never animated into obscurity.** Footer strip static, full contrast, always present.

---

## Appendix A — CSS + font decisions

**New layer `app/src/v3.css`, imported after `v2.css`** (order becomes: style.css →
screen-overrides.css → brand-font.css → chi.css → craft.css → v2.css → v3.css). Rationale:
v2.css remains the working shell/responsive skeleton so screens stay functional during
migration; v3.css re-declares the token block (graphite canvas, ember, serif variable, radius
ladder), adds the serif display classes, StageRail, SettlePlate/LedgerStamp/Rosette, ambient
layer, Home hero/ledger/capability styles, the Evidence timeline, and the consolidated media
queries. Screens migrate class-by-class; no Tailwind adoption (same reasoning as v2 Appendix A).

**The one new dependency: `@fontsource/instrument-serif`** (400 + 400-italic CSS imports).
Justification: a true editorial display serif with a genuine italic at display sizes — the
exact register the winner uses for "Settled" — in a single weight that enforces discipline
(no bold-serif temptation), self-hosted via fontsource like our existing fonts, ~35KB woff2.
Space Grotesk Variable (installed) stays body/UI; Space Mono (installed) stays all numerals,
hashes, kickers, tables. IBM Plex Mono stays unreferenced (brand-font routing already forces
Space Mono).

## Appendix B — Canonical copy strings (use verbatim)

- Hero H1: `Harvest now, decrypt later is a today problem.`
- Hero sub: `Every ECDSA signature ever broadcast is being recorded against the day a quantum
  computer can forge it. Q-Day Wallet signs spends with ML-DSA-44 (FIPS 204) — 2,420-byte
  signatures, verified on-chain for 2,664,784 gas, admitted through EIP-8141 frame transactions.`
- Footer strip: `TEST TOKENS ONLY · CONTRACT LAYER UNAUDITED · EVIDENCE LINKS TO EXPLORERS ·
  ML-DSA-44 VERIFY = 2,664,784 GAS · docs/VULNERABILITIES.md`
- Mined Tier A: `Admitted.` + `the gateway accepted the frame — block confirmation follows on
  the explorer.`
- Mined Tier B: `Settled.` + `BLOCK <n>`
- Local milestone chip: `signed + locally verified — nothing broadcast yet`
- Offline: `Nothing was broadcast.` / `The gateway did not respond. Your signature, frame, and
  local verification are real; the network that would admit this frame has been offline since
  07 Nov 2026.`
- Rejected: `The mempool refused.`
- Keys: `The secret key lives in this tab only. Refresh clears it; the keyfile restores it.`
- Rotation: `the name never moved; only the key did.`
- Evidence closing: `no admitted, mined PQ frame is claimed — awaiting gateway-to-miner
  restore (REDEPLOY_RUNBOOK).`
- Never printed anywhere: `accepted` (outside a real gateway response), `secure`, `100%`.
