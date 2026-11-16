# UI Spec — Q-Day Wallet v2.0 ("the real wallet")

Supersedes `specs/UI_SPEC.md` (v1 — hackathon evidence slideshow).
Inputs: `README.md` honest status (alt-mempool admission **not achieved**; ENS on Sepolia done;
Arkiv done; devnet gateway offline), `specs/SPEC.md` §2.1, current `app/src/*` implementation,
and `app/src/data/demoEvidence.json` (source of every real value used below).

**v2 thesis.** The app stops narrating evidence and starts doing real work in the browser:

- REAL crypto: ML-DSA-44 keygen / sign / verify via `@noble/post-quantum/ml-dsa.js`, session-only keys,
  passphrase-encrypted keyfile export.
- REAL send: spend-intent digest → ML-DSA-44 signature → real EIP-8141 frame tx (VERIFY + SENDER frames,
  ARBITRARY scheme, 2,420 B signature) → local signature verification (real result) → live submission attempt
  to the devnet gateway → **honest "network offline" outcome** (gateway is dead; 0 peers at last probe).
- REAL reads: Sepolia block, balance, ENS `pq-key` read-back for `qdaywallet.eth` via viem on public RPC.
- REAL registry: Arkiv live-read attempt with graceful fallback to the committed snapshot.
- Evidence stays: canonical REJECTED / unstaked REJECTED / staked Out-Of-Gas at 3.2M & 6.5M,
  stake readback 0.024 ETH — labeled history, never hidden, never fake-accepted.

Design direction unchanged (industrial wallet terminal on graphite). No rebrand. No new dependencies.
Stack stays React 18 + framer-motion + zustand + custom CSS layers (see Appendix A for the CSS decision).

---

## 1. Information architecture

Sidebar navigation on desktop ≥1280px (like a real wallet product); collapsed icon rail 768–1279;
bottom tab bar <768.

**Final nav (in order):**

| # | id | Label | Screen file | Evolved from |
|---|---|---|---|---|
| 1 | `home` | Home | `S1WalletHome` → `HomeScreen` | S1 WalletHome |
| 2 | `send` | Send | NEW `SendScreen` | S1 DemoConsole (compose half) |
| 3 | `keys` | Keys | `S2Key` → `KeysScreen` | S2 WalletKey |
| 4 | `identity` | Identity | `S4Identity` → `IdentityScreen` | S4 |
| 5 | `registry` | Registry | `S3Registry` → `RegistryScreen` | S3 |
| 6 | `evidence` | Evidence | NEW `EvidenceScreen` | S1 DemoConsole (captured-evidence half) |
| 7 | `architecture` | Architecture | `S5Architecture` → `ArchitectureScreen` | S5 |

**Naming decisions (with reasons):**

- **"Compose" → "Send".** It now really signs and really attempts a submission. A screen called
  "Compose" that never sends was honest in v1 and is a lie in v2. "Send" is what it does.
- **"Key" → "Keys".** The screen now holds ceremony + exposure + rotation record + keyfile I/O.
- **"DemoConsole" → "Evidence".** The captured rejections are a permanent, honest exhibit, not a demo
  mode. The v1 simulator (fake `ACCEPTED` lane D, "Run journey" theater) is deleted (§8); the live
  attempt belongs to Send.
- **Hero is deleted** (§8); `home` becomes the landing screen. Order rationale: the money path first
  (Home answers "what do I have", Send answers "can I move it with a PQ key"), then the machinery
  behind it (Keys), then public continuity records (Identity, Registry), then the paper trail
  (Evidence), then the map (Architecture).
- Deep-link aliases kept so v1 URLs survive: `?screen=console` → `send`, `?screen=key` → `keys`,
  `?screen=hero` → `home`. All other ids unchanged.

**One question per screen (3-second test):**

| Screen | The one question |
|---|---|
| Home | What do I have, and is my key live? |
| Send | Can I authorize a spend with a quantum-safe key — and what did the network say? |
| Keys | Where is my key, and how exposed am I? |
| Identity | Does my name still resolve to a PQ key? |
| Registry | Where is my migration record, and can I read it right now? |
| Evidence | What did the mempools actually say? |
| Architecture | How do the pieces fit, and what is unaudited? |

---

## 2. Shell

```
┌──────────────────────────────────────────────────────────────────────┐
│ header: ◈ Q-Day Wallet · [SEPOLIA · LIVE ▮12,4xx,xxx] [DEVNET · OFFLINE ▮11,051]  ·  account chip │
├───────────┬──────────────────────────────────────────────────────────┤
│ sidebar   │  screen content (max-width 1160px, left-aligned)         │
│ (desktop) │                                                          │
├───────────┴──────────────────────────────────────────────────────────┤
│ footer: limitation strip (unchanged copy, live values)               │
└──────────────────────────────────────────────────────────────────────┘
```

**Header** (`account-header`, stays one row ≥1280px):

- **Brand**: `◈ Q-Day Wallet` (existing SVG mark). Click → `home`. Space Grotesk.
- **Chain status cluster** — replaces the chain switcher:
  - `ChainStatusChips` component, two fixed chips:
    - `SEPOLIA · LIVE` — mint dot (pulse 2s, static under reduced motion), block number in mono
      ticking from viem public-RPC polling every 12s (e.g. starts above 12,080,244 — the captured
      build-time block; live value is whatever the RPC returns). Poll failure → chip flips to
      `SEPOLIA · STALE` (amber) with the last good block; second consecutive failure →
      `SEPOLIA · UNREACHABLE` (red). Never silently freezes on a fake-live dot.
    - `DEVNET · OFFLINE` — red dot, block `11,051` suffixed `last known`. Tooltip (hover/focus):
      "Gateway last reachable 07 Nov 2026; latest probe 0 peers. Admission attempts cannot be mined."
- **Account chip**: `qdaywallet.eth · 0x3b7C…79b1 · ML-DSA-44` — name Space Grotesk, hash mono 6+4
  (`CopyChip`), scheme tag violet. Prepended by a session-key dot: mint when a session key exists,
  amber hollow when not.
- **Deleted:** `DEVNET/SEPOLIA` toggle buttons, `balance-chip` (balance lives on Home), the
  `evidence-caption` strip ("read at build time") — v2 reads live; committed snapshots are labeled
  in-place on the screens that use them.

**Footer** — unchanged role, updated copy:
`ML-DSA-44 verifies in 2,664,784 gas · alt-mempool evidence · contract layer unaudited demo ·
transactions link to their explorers` + link to `docs/VULNERABILITIES.md`.

**Deep links:** `?screen=<id>` remains authoritative. `demoStore` keeps `Screen = home | send | keys |
identity | registry | evidence | architecture` (+ alias map on init). On every navigation,
`history.pushState("?screen=<id>")`; `popstate` updates the store so browser back/forward work.
Active nav item follows store state. No router dependency added.

**Store changes (zustand):** `demoStore` shrinks to routing + nav; new `netStore` (sepolia block /
balance / resolution probes + gateway ping state), `keyStore` (session key + fingerprint), and
`sendStore` (Send state machine, §4). See Appendix B.

---

## 3. Screens

Every screen keeps the existing `screen-heading` pattern (mono eyebrow, Space Grotesk h2, muted lede)
but the lede now states what the screen *does*, not what it *shows*.

### 3.1 Home (`home`)

**Purpose:** one glance at the account — identity, live balance, stake posture, session key state.

**Layout** (12-col content grid):

- **Zone A — `AccountStrip`** (full width, ~96px). Left: `qdaywallet.eth` (28–32px) + owner chip
  `OWNER / 0xe104…c9b0`. Right: the screen's single primary button **`Send`** → navigates to `send`.
- **Zone B — three equal panels** (grid `1fr 1fr 1fr`, gap 12px, compact height ~150px):
  - `BalancePanel` — kicker `BALANCE / SEPOLIA 11155111`; big mono value; foot `block <live block> ·
    address 0x3b7C…79b1`.
  - `StakePanel` — kicker `STAKE READBACK / REGISTRY`; `0.0240 ETH`; status chip `STAKED / READBACK OK`
    (mint); foot `subject 0xf2ba…6006 / registry 0xd51c…22d2f`. Amber footnote: "devnet offline —
    value is committed evidence, not a live read."
  - `KeyPanel` — kicker `SESSION KEY`; state-dependent: `NOT GENERATED` (amber hollow dot) or
    `ML-DSA-44 READY` (violet dot) + `pk fingerprint sha256:…` truncated; CTA link → `keys`.
- **Zone C — `ActivityTable`** (full width, data table, compact rows 44px): the 11 recorded artifacts
  from `txHistory` (factory/verifier/wallet deploys, registerA/registerT, SpikeWallet stake,
  ENS registration, Arkiv create/patch, Swarm passport) + one permanent queue row
  `PQ frame admission — not achieved (see Evidence)` (amber chip). Columns: kind glyph · label ·
  chain chip · hash `6+4` `CopyChip` · status chip · explorer ↗.

**States:**

| State | Trigger | Treatment |
|---|---|---|
| empty | n/a (evidence always present) | n/a |
| busy | balance/block fetch in flight | skeleton rows (pulse 1.2s), value column dimmed |
| live | RPC responds | values update with 300ms count-up on change only |
| offline | RPC unreachable | `BalancePanel` shows `READ UNAVAILABLE` + last good value grayed with `stale` tag; chips in header degrade per §2 |
| error | malformed RPC response | panel-level red inline line + retry link; screen never crashes (ErrorBoundary unchanged) |

Balance zero-honest copy (if the participant EOA reads 0 on Sepolia):
`0.0000 ETH — reads work; nothing was funded on Sepolia for this address.`

### 3.2 Send (`send`) — the centerpiece

**Purpose:** sign a real spend intent with ML-DSA-44, build the real EIP-8141 frame, verify it
locally, and attempt live submission — reporting the network's honest answer.

**Layout** (desktop): two columns, `7fr 5fr`.

- **Left (flow column):**
  - `IntentForm` — recipient address input (42-char validation, red inline error), amount input
    (ETH, 4 decimals, right-aligned mono), advanced disclosure (collapsed): nonce (prefilled `8`,
    caption "devnet contract wallets start at nonce 8 — HegotaSupport creates 7 helper contracts"),
    chainId `1337`, execution limit `3,200,000`. Caption under form:
    `Intent authorizes a spend on QDayWallet 0xc5a8…091f (devnet 1337).`
  - `StepTracker` — 6 numbered steps (§4), vertical on desktop, fills top-down.
  - `OutcomePanel` — terminal state of the flow (§4 step 6).
- **Right (inspection column, sticky):**
  - `FrameInspector` — the real frame: txType `0x06`, frames `VERIFY (1) + SENDER (2)`, sig scheme
    `ARBITRARY (0x0)` violet chip, signature `2,420 B ML-DSA-44`, intent digest `32 B` (6+4 + copy),
    frame hash (6+4 + copy, click → full hex in a `RawWindow`), byte-length line
    `frame prefix <n> B + 2,420 B signature`.
  - `GasPanel` — two bars: canonical lane (budget `100,000`, measured `2,664,784` → bar caps, red
    overshoot flag, caption `~26.6× the MAX_VERIFY_GAS budget`); alt-mempool lane (declared
    `3,200,000` → 83.3% violet fill; second recorded attempt bar at `6,500,000` → 41% fill; amber
    tag on both: `recorded Out Of Gas at this limit — gas is not the current blocker; gateway
    validation is`).
  - `SubmissionPanel` — endpoint row `eth_sendFrameTransaction @ https://altmempoolgateway.forshtat.com/rpc`
    with a probe dot (red `unreachable` / mint `responding`), and the session's attempt list
    (timestamp · method · result chip). Full copy spec in §4.

**States:** empty (no key — see below) / busy (signing, frame building) / live (verified, awaiting
submission decision) / offline (gateway unreachable → amber outcome) / error (invalid input,
verify `false`, RPC error text). See §4 for exact per-step treatments.

**The single primary button** sits under `IntentForm`, and its label advances with the machine:
`Build intent` → `Sign & build frame` → `Attempt submission`. Never two primaries.

### 3.3 Keys (`keys`)

**Purpose:** run the real ML-DSA-44 key ceremony and manage the session key's export/import.

**Layout:**

- **Left 7/12 — `KeyDevice`** (existing panel): byte-grid (violet materialize on generate, 300ms),
  device status LED row, fingerprint line `pk fingerprint sha256:86c7…8b62` style (6+16+…+16 for
  the 64-char hex is too long — display `sha256:86c769…f28b62` 6+6, full on click), sticky copy.
  Under it `KeyStats`: `pk 1,312 B · sk 2,560 B / masked · sig 2,420 B` (mono, right-aligned numerals).
- **Right 5/12 — `ExposureCard`** (red panel while no key: `EXPOSED / harvest-now-decrypt-later risk
  active — owner EOA's ECDSA pubkey has been public since its first transaction`), flips to mint-tinted
  `MITIGATED / spend authorization now ML-DSA-44 (V9 residual dual-sig remains)` once a session key
  exists. Beneath: `RotationRecord` read-only strip — `pq-key version 1 · rotated on-chain
  tx 0x1471…7dafb ↗ · owner unchanged` (violet).
- **Bottom — `KeyfileExport` / import**: Export → modal (NOT `window.prompt`): passphrase + confirm
  fields, weak-passphrase warning line, encrypts `{algo:"ML-DSA-44", pk, sk}` with keccak-stretched
  passphrase (noble) → downloads `qday-keyfile.encrypted.json`. Import → file drop + same modal to
  decrypt; on success the session key is restored and the fingerprint recomputed. Caption (always):
  `The secret key lives in this tab only. Refresh clears it; the keyfile restores it.`

**States:** empty (primary `Generate ML-DSA-44 key`) / busy (generating ~300ms, button
`Generating…` disabled) / live (primary becomes `Download encrypted keyfile`; regenerate demoted to
quiet with confirm modal `This replaces your session key. Continue?`) / error (wrong passphrase on
import → red inline `decryption failed`, import file malformed → red inline) / offline n/a
(ceremony is offline by design — say so: `Ceremony runs locally. No network needed.`).

### 3.4 Identity (`identity`)

**Purpose:** prove the ENS name resolves to a PQ key and survives rotation.

**Layout:**

- **Zone A — `NameHero`** (full width, ~120px): `qdaywallet.eth` + owner chip `OWNER / 0xe104…c9b0`
  + `ResolutionCard` (right): `REGISTERED · PQ RECORD ON-CHAIN` mint chip + one-line status.
- **Zone B — two columns:**
  - `PqRecordCard` (7/12) — kicker `PQ RECORD / text/pq-key`; live-read block: on mount and on the
    screen's primary action (`Verify resolution`), viem reads the `pq-key` text record through the
    Universal Resolver on Sepolia; shows fetched value `sha256:86c769…f28b62`, the resolver
    `0x863b62fA…bc8e4` (our Permissioned Resolver), and a comparison chip against the session pk
    fingerprint: `MATCH` (mint) when the session key IS the rotated key (possible after import) /
    `DIFFERENT KEY` (amber, expected for a fresh session — caption `the on-chain record points at
    the rotated v1 key; your session key is fresh`). Fallback state: committed read-back value
    labeled `committed evidence · read back through UniversalResolverV2`.
  - `ResolverCard` (5/12) — `Permissioned Resolver 0x863b…c8e4 · wallet holds ROLE_SET_TEXT only for
    pq-key (argument-scoped grant)`; links: setResolver tx `0xc1c1…1488 ↗`.
- **Zone C — `RotationTimeline`** (full width, existing `Timeline`): three nodes, all real:
  1. `registration` — done · tx `0xd6d1…25f1` ↗
  2. `PQ text write` — done · tx `0x8dfe…b4b4` ↗ · read-back byte-equal
  3. `key rotation` — done · tx `0x1471…7dafb` ↗ · `the name never moved; only the key did.`

  v1's speculative live-rotation flow (mint/approve/commit/reveal stepper) is **deleted** —
  rotation already happened on Sepolia; the screen now shows it as fact (§8).

**States:** busy (skeleton lines in `PqRecordCard`) / live (fetched record + comparison chip) /
fallback (RPC down → committed value labeled as such) / error (resolution throws → red inline
`resolution failed: <message>` + retry). Empty n/a (name is registered).

### 3.5 Registry (`registry`)

**Purpose:** surface the public migration record and attempt a live Arkiv read with graceful fallback.

**Layout:**

- **Zone A — toolbar** (full width): `schema = qday.migration` · `network = Rabdi (7794095)` ·
  `LiveProbe` status dot.
- **Zone B — `EntityCard`** (full width): entity `0xc6c0…d048` (`CopyChip`), status chip
  `ACTIVE` (mint), `pqKeyVersion 1`, writer `0xe104…c9b0`, patch tx `0xcd9c…d8f5 ↗`
  (rabdi.explorer.arkiv.network), created date IST.
- **Zone C — `SnapshotTable`** (data table): field / committed value / action — rows for entity key,
  schema, swarm ref (`81c74b46…49c74` + copy), patch tx, expiry. Values from committed evidence,
  each row labeled with a source chip `COMMITTED` until a live read refreshes it (`LIVE` mint chip).
- **Zone D — `PassportDrawer`** (right slide-in from row action `Open passport`): fetches
  `https://bzz.limo/bzz/81c74b4669f7c8fd574cb4fa2f911e7d5603a54e12fd9fe8ea32e04474c49c74`
  (public gateway — genuinely reachable), renders passport JSON in `RawWindow`, `byte-equal
  read-back verified` mint chip, `open original ↗`.
- **`LiveProbe`** (in toolbar + inline under `EntityCard`): primary action `Fetch live entity` —
  imports `@arkiv-network/sdk` and reads the entity **only if** `VITE_ARKIV_ACCESS_KEY` is present;
  otherwise the button renders disabled with the honest caption
  `live read needs a browser access key — showing committed snapshot` (existing behavior, kept).

**States:** busy (`Fetching…`) / live (`LIVE` chips, entity fields refreshed) / fallback (committed
snapshot — default and always correct) / error (fetch failure → red inline with the SDK error
message verbatim) / offline (same as fallback, dot amber).

### 3.6 Evidence (`evidence`) — DemoConsole evolved, never hidden

**Purpose:** the permanent honest record of what the mempools actually returned — labeled history,
no simulation, no fake acceptance.

**Layout:** stacked `VerdictLane` rows (reading order, not columns):

1. `VerdictLane — CANONICAL MEMPOOL` (red): stamp `REJECTED · rule: MAX_VERIFY_GAS` (rotated −4°,
   existing `Stamp`), caption `code −32000 — Frame transaction prefix gas budget (frames + sig cost)
   exceeds MAX_VERIFY_GAS`, `RawWindow` with the verbatim JSON
   (`{"error":{"code":-32000,"message":"…MAX_VERIFY_GAS"},"id":1,"jsonrpc":"2.0"}`), source chip
   `CAPTURED · docs/FINDINGS.md`.
2. `VerdictLane — STANDARD ALT-MEMPOOL, UNSTAKED` (red): `REJECTED · Out Of Gas` —
   `validation frame 0: ran out of gas (Out Of Gas)` + verbatim raw.
3. `VerdictLane — STANDARD ALT-MEMPOOL, STAKED` (amber, the honest frontier): `Out Of Gas` at BOTH
   declared limits `3,200,000` and `6,500,000`; both raw responses; caption
   `no admitted, mined PQ frame is claimed. Awaiting gateway-to-miner restore (REDEPLOY_RUNBOOK).`
4. `StakeProofPanel` (mint): `SpikeWallet stake — mined · 0.0240 ETH · registry readback via
   getDepositInfo: OK · tx 0x58ab…5678 ↗`.
5. `FindingsExport` (footer row): quiet button `Export FINDINGS summary (JSON)` downloads
   `{canonical, unstaked, staked, gas}` with raw responses embedded.

Each lane header carries `HISTORY` chip (amber) + the chain's current posture from §2
(`DEVNET · OFFLINE`), so the exhibit can never be mistaken for a live state. A quiet link
`Try a live attempt from Send →` is the only cross-link.

**States:** static/labeled by construction (no live fetch here); `RawWindow` toggle open/closed;
export busy/error handled inline. There is deliberately **no** empty, no live, and no success state
on this screen — the absence of a green lane IS the message.

### 3.7 Architecture (`architecture`)

**Purpose:** map intent → proof → identity → mempools → public records, with pinned addresses.

**Layout:** keep the 5-node flow (`Noble signer → frame/relayer → MLDSAVerifier → QDayWallet →
ENS/Arkiv`), upgraded:

- Node cards gain copyable pinned addresses on hover/expand (verifier `0x17b0…17e4`, wallet
  `0xc5a8…091f`, factory `0xa37d…06b3`, registerA `0x6E38…7f86`, registerT `0x109c…3BEB`).
- The `frame / relayer` node carries an amber `OFFLINE` dot (consistent with header).
- `GasFootnote`: `measured 2,664,784 / pinned reference 2,689,594 · canonical budget ~100,000 ·
  precompute 5.54M + 2.29M`.
- `UNAUDITED CONTRACT STACK` badge stays (top right); link to `docs/VULNERABILITIES.md` stays.

**States:** static (reference screen). Hover/focus tooltips on nodes only; no empty/error states.

---

## 4. Send flow state machine (the centerpiece)

`sendStore.state`: `idle → intent_built → signed → frame_built → verified → submitting → outcome`.
`outcome ∈ { offline | rejected{code,rule,hint} | mined{hash} }` plus the guard `verify_failed`.
Gate: if no session key, all steps render but the tracker shows step 1 as `KEY REQUIRED` and the
primary button becomes `Generate a key first` (violet, navigates to `keys`) — the flow never fakes
progress without a real key.

| Step | Trigger | What the user sees | Panels updated |
|---|---|---|---|
| 0 `idle` | screen mount | Form empty, tracker all dim, inspector shows schema placeholders (sizes only, no hex) | — |
| 1 `intent_built` | `Build intent` (validates recipient 0x-40hex, amount > 0, ≤ 8 decimals) | digest appears in inspector: `intent 32 B · keccak256(wallet, recipient, amount, nonce, chainId) · 0x<6+4>` (copy); step 1 dot mint; nonce `8` + chainId `1337` displayed as plain mono rows | IntentForm (fields lock), StepTracker, FrameInspector |
| 2 `signed` | `Sign & build frame` part 1 — `ml_dsa44.sign(digest, sk)` | violet step dot; sig row `signature 2,420 B ML-DSA-44 · sha256 <6+6>` (copy); button label switches to `Attempt submission` only after step 4 | StepTracker, FrameInspector |
| 3 `frame_built` | codec assembles EIP-8141 frame (`@forshtat/hegota-support`), VERIFY + SENDER frames, ARBITRARY 0x0, txType 0x06, exec limit 3,200,000 | FrameInspector fully populates incl. frame hash + byte view (hex dump, first 96 B, in `RawWindow`); step 3 mint | FrameInspector, StepTracker |
| 4 `verified` | `ml_dsa44.verify(sig, digest, pk)` locally — **real result** | mint chip `LOCAL VERIFY: TRUE`; if `false` (bug, not UX) → red banner `local verification failed — flow halted`, export diagnostics link, terminal state `verify_failed` | StepTracker, FrameInspector (verify chip) |
| 5 `submitting` | `Attempt submission` — POST `eth_sendFrameTransaction` to the gateway, 8s timeout, 1 retry | button → spinner `Submitting…` (never a fake progress bar); tracker step 5 amber pulse; probe dot updates with the real ping result | SubmissionPanel, StepTracker |
| 6a `offline` | fetch throws / timeout (the expected case today) | amber `OutcomePanel`: heading `NETWORK OFFLINE — nothing was broadcast`; body: `altmempoolgateway.forshtat.com did not respond (last probe 07 Nov 2026, 0 peers). Your signature, frame, and local verification are real; the devnet that would admit this frame is gone.`; actions: quiet `Export signed frame (JSON)` (writes `qday-frame-<framehash>.json` with intent, digest, sig, frame hex, gateway URL, timestamp) + quiet `View Evidence →` | OutcomePanel, SubmissionPanel (attempt row `unreachable` red), header DEVNET chip re-affirmed |
| 6b `rejected` | gateway alive and RPC −32502-style rejection | red `RuleStamp` with verbatim `{code, rule}` + hint line from the response; attempt row `rejected` | OutcomePanel, SubmissionPanel |
| 6c `mined` | gateway accepts | mint chip `SUBMITTED` + explorer link `https://explorer.altmempool.wtf/<hash>` ↗; step 6 mint | OutcomePanel, SubmissionPanel, ActivityTable (session attempt appended, marked `session`) |

Rules: each attempt is appended (timestamped) to the session attempt list; `Reset` clears the
machine but never the attempt list; the flow is re-runnable end-to-end; **the app never renders
`ACCEPTED` without a real gateway response** — that sentence is the contract of this screen.
Reduced motion: dots fill, no pulses; stamps appear statically.

---

## 5. Number formatting

| Data | Rule | Examples (real values) |
|---|---|---|
| ETH amounts | 4 decimals, right-aligned mono, `tabular-nums`; hover/focus tooltip with full precision + wei | `0.5497 ETH` tooltip `0.549661 ETH · 549,660,836,018,000,000 wei`; stake `0.0240 ETH` tooltip `0.024 ETH exact · 24,000,000,000,000,000 wei` |
| Hashes / addresses | `6+4` truncation mid-hash, `CopyChip` copies full value, `title`/tooltip holds full hex | `0x0d85…07b2`, `0x3b7C…79b1`, `0x58ab…5678` |
| Gas | thousands separators, every 3 digits (plain `en-US` grouping — the `en-IN` locale grouping used today is dropped; blocks like `12,080,244` must read like block explorers) | `2,664,784` · `2,689,594` · `3,200,000` · `6,500,000` · `100,000` · `5,540,000 + 2,290,000` |
| Blocks | thousands separators | `12,080,244` (captured) · `11,051` (devnet last known) |
| Byte sizes | thousands separators | `1,312 B` · `2,560 B` · `2,420 B` · `32 B` |
| Big numbers | right-aligned, mono, `tabular-nums`, count-up animation 300ms on change only (none under reduced motion) | balance, gas values, block ticker |
| Timestamps | captured evidence: `07 Nov 2026 · 06:26 IST`; live events: browser-locale short + explicit `IST` or UTC suffix — never ambiguous | `generatedAt 2026-11-07T00:56:11Z` → `07 Nov 2026 · 06:26 IST` |

All shared via one `format.ts` helper set (`fmtEth`, `fmtHash6_4`, `fmtGas`, `fmtBlock`, `fmtBytes`)
— no per-component formatting, so Evidence and Home can never disagree about the same number.

---

## 6. Anti-slop checklist (explicit, audited per screen)

- **No card nesting.** One panel level inside a screen section; inner grouping is done with 1px
  hairline dividers, not boxes. (Concretely: `FrameInspector` stops wrapping `RawWindow` inside a
  bordered sub-card; the sub-window is a divider-separated region.)
- **No gradient heroes.** Hero screen deleted (§8); the body `radial-gradient` in `craft.css`
  (lines 22–25) is removed → flat `--bg`; `gas-measured` bar loses its `linear-gradient` → flat
  violet fill; flat panels on graphite with 1px hairline borders, shadows trimmed to
  `0 6px 16px rgba(0,0,0,.25)` max and only on hover/drawer.
- **No uniform radius everywhere.** Deliberate ladder, sharpened back toward industrial:
  screens `4px`, panels `4px`, data windows (`RawWindow`) `2px`, buttons/chips `2px`, stamps and
  status chips `0`. The `10px` `--panel-radius` softness from the v1 polish pass is removed.
- **No emoji icons.** Nav icons are inline SVG, 16px, `1.5px` stroke, `currentColor` (home, send
  arrow, key, name tag, layers/box, certificate, map). Typographic glyphs already in the brand
  (`◈` mark, `→`, `↗`) are fine and stay. No emoji anywhere, including states.
- **Semantic accent usage only, five roles:** mint `#7fdcb4` = live/success/verified/admitted;
  violet `#a78bfa` = PQ crypto (keys, signatures, frame scheme, PQ verify); red `#f43f5e` =
  rejection/danger/exposure; amber `#e7b45c` = pending/withdrawn/unstaked/offline. Nothing else.
  Token corrections from current CSS: `--violet #9aa8ff → #a78bfa`, `--red #ef7b84 → #f43f5e`
  (brief-fixed values); old `--cyan` and `--green` tokens merge into one `--mint`.
- **One primary action per screen:** Home → `Send`; Send → the contextual advance button (§4);
  Keys → `Generate key` (empty) / `Download encrypted keyfile` (ready); Identity → `Verify
  resolution`; Registry → `Fetch live entity` (disabled-with-caption without access key); Evidence →
  none (export is quiet); Architecture → none. Everything else is `button-quiet`.
- **No fake data:** every number on screen traces to the live RPC, the browser's real crypto, or
  `demoEvidence.json`; anything from the JSON is labeled `COMMITTED` / `CAPTURED`.
- **Honest copy survives:** the unaudited line, the not-achieved queue row, and the V9 residual
  note are permanent fixtures, not footnotes.

---

## 7. Responsive

| Range | Shell | Notes |
|---|---|---|
| ≥1280 | Fixed sidebar 200px (labels + icons), content max 1160px | Sidebar bottom: `UNAUDITED` badge → VULNERABILITIES.md |
| 768–1279 | Collapsed sidebar 56px icon rail; icon tooltips on hover/focus | Header keeps brand + account chip; chain chips compact (`SEPOLIA · LIVE` without block on <900px) |
| <768 | Sidebar gone; **bottom tab bar**: `Home · Send · Keys · Identity · More` | 7 tabs on a 375px viewport ≈ 53px each with unlabelable text ("Architecture"); grouping to 5 keeps ≥44px touch targets. `More` opens a sheet listing `Registry · Evidence · Architecture` (and closes on selection). Tab bar height 56px, safe-area padding, active = mint label + icon |
| <768 Send flow | Single column: `IntentForm` → `StepTracker` (vertical) → collapsible `FrameInspector` (collapsed by default, opens after `frame_built`) → `GasPanel` → `SubmissionPanel` | Sticky bottom action bar above the tab bar holds the contextual primary button; on `submitting`, the bar shows the spinner inline. `OutcomePanel` renders as a full-width sheet on completion |
| <480 | Zone B panels stack to 1 column on Home; tables degrade: `ActivityTable`/`SnapshotTable` drop the `action` column into a row-tap | Hash chips keep `6+4`; nothing truncates into ambiguity |

Breakpoints consolidate the current scattered `@media 1100/900/600` rules onto `1279` and `767`
(+`479` for the micro tweaks). Existing mobile behaviors worth keeping: header wraps to two rows,
`screen` padding compresses, hover lifts disabled.

---

## 8. What gets DELETED (decisive)

1. **`S0Hero` screen and its nav slot** — a marketing pitch wall has no job in a working wallet.
   Its proof stats are already superseded by the Evidence lanes; its quote block is removed with it.
   Landing screen becomes `home`.
2. **Chain switcher** (`DEVNET/SEPOLIA` toggle + `activeChain` store state + the `chain-active`
   styling) — devnet is offline-only; there is nothing to switch *into*. Replaced by the fixed
   `ChainStatusChips` pair (§2).
3. **The DemoConsole simulator** — `Run journey A→B→C→D`, the timed runner in `useEffect`, the
   `Simulate on canonical / alt-mempool` buttons, the `READ-ONLY SIMULATION` badge, and the
   simulated lane-D `ACCEPTED` stamp. This was the v1 money shot; in v2 it would be the product's
   one dishonest pixel. Its captured halves move to `Evidence` (labeled), its live halves move to
   `Send` (real).
4. **Header `balance-chip`** — duplicates Home's `BalancePanel`; the header keeps identity +
   network posture only.
5. **`evidence-caption` strip** ("Chain data read at build time") — v2 reads live; committed
   snapshots are labeled at their point of use (`COMMITTED` chips on Identity/Registry).
6. **Identity's speculative registration flow** (mint/approve/commit-countdown/reveal stepper
   ideas from v1 spec §S4) — registration and rotation are *done facts* on Sepolia with tx links;
   the screen renders history + live read-back, not a flow to re-run.
7. **`en-IN` locale grouping** for numbers/blocks (§5) — replaced by plain 3-digit grouping.
8. **Soft-radius + gradient drift** from the v1 polish pass (`--panel-radius: 10px`, body
   radial gradient, gas-bar gradient, `0 18px 48px` panel shadows) — sharpened per §6.
9. **Old accent tokens** `--cyan`, `--green` (merged to `--mint`) and the off-brief `--violet`,
   `--red` values.
10. **`window.prompt` passphrase** on keyfile export — replaced by the modal (§3.3).

**Kept deliberately:** `RawWindow`, `Stamp`, `CopyChip`, `Timeline`, `ErrorBoundary`, the
limitation footer strip, `?screen=` deep links, one-line-JSX file style is an engineering choice
out of design scope, and the existing CSS-layer import order.

---

## Appendix A — CSS approach

**Extend the existing custom CSS layers; do not switch to Tailwind.** The codebase has a tuned
import order (`style.css` → `screen-overrides.css` → `brand-font.css` → `chi.css` → `craft.css`
last) and every token already lives in CSS custom properties. v2 adds one layer file
`app/src/v2.css` imported after `craft.css` containing: sidebar/rail/tab-bar shell rules,
`ChainStatusChips`, the Send screen panels, `VerdictLane`, corrected token block
(`--violet: #a78bfa; --red: #f43f5e; --mint: #7fdcb4` with `--green/--cyan` aliased to `--mint`
during migration), the radius ladder variables, and the consolidated media queries.
Tailwind remains available in the stack but adopting it now would touch every screen for zero
visual gain. Typography: **Space Mono wins the mono slot** — it is already bundled
(`@fontsource/space-mono/400.css`), needs no new dependency, and its quirky serifed mono pairs with
Space Grotesk's technical character; JetBrains Mono would add a package and read generic-dev-tool.
Space Grotesk stays display-only (headings, brand, buttons); Space Mono owns all numerals,
addresses, hashes, tables, and labels (kickers/eyebrows stay mono via `brand-font.css` routing).

## Appendix B — State & data layer (zustand)

- `appStore` (ex-`demoStore`): `screen`, alias resolution, `pushState`/`popstate` sync.
- `netStore`: sepolia `{block, balanceWei, status: live|stale|unreachable}` polled 12s; ens
  `{pqKey, status}`; gateway `pingState: unknown|responding|unreachable`; last-good timestamps.
- `keyStore`: `sk/pk` in-memory only; `fingerprint` mirrored to `localStorage` (presence flag, not
  the key); `export(passphrase)`, `import(file, passphrase)`; `regenerate(confirm)`.
- `sendStore`: machine from §4; `attempts[]` (session-scoped, not persisted); `exportFrame()`.
- All stores expose `reset()`; no store fabricates states (v1's `dryRun` idea is not carried over).

## Appendix C — Canonical copy strings (use verbatim)

- Devnet offline outcome: `NETWORK OFFLINE — nothing was broadcast.`
- Offline body: `altmempoolgateway.forshtat.com did not respond (last probe 07 Nov 2026, 0 peers).`
- Not-achieved row: `PQ frame admission — NOT ACHIEVED. Staked attempts returned literal Out Of Gas
  at 3.2M and 6.5M declared VERIFY limits.`
- Session-key caption: `The secret key lives in this tab only. Refresh clears it; the keyfile
  restores it.`
- Limitation footer: `ML-DSA-44 verifies in 2,664,784 gas · alt-mempool evidence · contract layer
  unaudited demo · transactions link to their explorers.`
- Never printed anywhere: `accepted`, `secure`, `100%`.
