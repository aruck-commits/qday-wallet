# UI Spec — Q-Day Wallet v1.0

Professional demo-grade interface. Not a production wallet — a **product showcase** that
makes the architecture legible. Every screen answers one question; animation carries the story.

---

## 1. Stack & principles

- **Vite + React 18 + TypeScript + Tailwind v4 + framer-motion + zustand.** No wagmi/MetaMask
  dependency (venue-proof: our keys sign locally, no wallet-injection gamble on show Wi-Fi).
- **Design language:** dark terminal-meets-quantum. Dense data, generous whitespace, mono
  numerals, one accent per concept. If a screen can't be understood in 3 seconds, redesign it.

| Token | Value | Meaning |
|---|---|---|
| `bg` `#0A0E14` / panel `#111827` | base | void |
| `cyan` `#22D3EE` | primary | alt-mempool / frame txs / success-admitted |
| `red` `#F43F5E` | danger | canonical rejections / broken crypto / harvested keys |
| `violet` `#A78BFA` | PQ | ML-DSA keys, signatures, rotation |
| `emerald` `#34D399` | ok | staked / verified / live entities |
| `amber` `#FBBF24` | warn | unstaked, pending, gas warnings |
| Text `#E5E7EB` / muted `#6B7280` | | |
| Fonts | **Space Grotesk** (headings) · **JetBrains Mono** (numbers/addresses/code) | |
| Motion | springs: `{stiffness: 300, damping: 30}` entrances · 150ms exits · `prefers-reduced-motion` honored globally | |

## 2. Screens (desktop-first ≥1280px; responsive baseline for judges' laptops)

### S0 · Hero
- Full-viewport. Left: product wordmark **qday-wallet**, subtitle
  *"A wallet that keeps working on the day quantum computers break Ethereum."*
  Vitalik Devcon-8 Mumbai (Nov 3 2026) + Drake Dec-2028 quote wall (pull-quote style, sourced).
- Right/background: animated lattice grid (SVG beads, slow parallax, subtle noise). Red
  "Q-DAY IN −847d" countdown chip (from Drake's Dec 2028; computed live).
- CTA: **"Run the demo"** → DemoConsole. Secondary: key ceremony, registry, architecture.
- Nav (top, mono): DEMO · KEY · REGISTRY · IDENTITY · ARCH. Live chain badges (1337 · Sepolia · Rabdi).

### S1 · DemoConsole (the money shot — never cut)
A single canonical view of the mempool split. Three fixed lanes:
- **Lane A "canonical mempool"** (muted): our tx lands → shakes → stamp
  `REJECTED · rule: <captured at G1>` → slides to a reject pile with count.
- **Lane B "standard alt-mempool"**: same tx, unstaked → stamp `REJECTED (unstaked)`; after
  user clicks **"Stake 0.012 ETH"** (clean-path flow runs in a sub-panel with its own status),
  the SAME tx resubmits → cyan pulse → `ACCEPTED · frame-mode VERIFY · gas ~2.69M` →
  "View on explorer ↗" (real link from the mined tx).
- **Lane C "frame inspector"**: tx hash, frame count, sig-scheme chips (ARBITRARY violet),
  live gas counter (100k budget bar vs 2.69M used — bar animates overshoot in red on reject,
  green on admit).
- Status pipeline per attempt: `built → signed → submitted → {ACCEPTED|REJECTED:rule}` with
  timestamps; every rejected attempt stores the verbatim `{code, rule, hint}` ( surfaced in
  tooltip + FINDINGS export button).
- One "Run demo [A→B→C→D]" auto-sequence button + per-step manual replay. Idempotent markers.

### S2 · WalletKey (key ceremony)
- **"Generate ML-DSA-44 key"** → animated byte-grid materializes from noise (violet), then
  settles into pk hex with sticky copy button. Panels: pk 1312 B · sk (masked toggle) 2560 B ·
  sig 2420 B. Right rail: **exposure card** — `owner EOA 0x3b7C…79b1 · ECDSA pubkey exposed
  since first tx · harvest-now-decrypt-later: ACTIVE` (red). Beneath: our answer — pq pk
  registered FIPS 204, verification admitted via alt-mempool (cyan).
- Actions: download JSON keyfile (**encrypted, prompt for passphrase**, argon2-lite via
  noble: keccak-stretched), regenerate (with confirm), import (file drop).

### S3 · Registry (Arkiv)
- Filter bar (status / wallet / scheme eq) + live **watch feed** (emerald pulse row-in on event).
- Table: wallet · pqPkHash (copy) · status chip (`ACTIVE` emerald / `ROTATED` amber /
  `EXPIRED` red) · scheme `ML-DSA-44` · verifier addr · expiry countdown · created.
- Row click → detail drawer: **migration passport fetched from Swarm via `swarmRef`**
  (rendered fields + "open original ↗"), raw JSON, Arkiv entity + explorer links, re-sync button.
- Empty state: 3-step onboarding (faucet → access key → sync) with status per step.

### S4 · Identity (ENS)
- Top card: current name `<label>.eth` (owner = QDayWallet badge), resolution state
  (resolver, records). Right card: **PQ record** (`text/pq-key` = pk fingerprint) with last-write
  proof (tx hash + intent hash).
- **Rotation flow** is the animated centerpiece: old key (violet, 90% opacity) slides out,
  new key slides in, a horizontal "time" bar shows: records before → rotation tx → records
  after, **all resolving identically** — caption: *"The name never moved; only the key did."*
- Flow needs Sepolia ETH/mint steps surfaced inline (MockUSDC approve, commitment countdown
  ring 60s, reveal). All steps resumable (state machine in zustand store).

### S5 · Architecture
- SVG diagram (from ARCHITECTURE.md) with **draw-on-scroll** (pathLength animation), nodes
  hoverable → tooltip cards with pinned addresses (copyable). Layers: browser keys /
  QDayWallet / verifier / mempools / ENS / Arkiv.
- footnote: unaudited-components badge + link to docs/VULNERABILITIES.md.

## 3. Cross-cutting components

| Component | Notes |
|---|---|
| `ChainBadge` | chainId + RPC latency dot; red on mismatch |
| `TxStatus` | enum `built\|signed\|submitted\|accepted\|rejected{code,rule}` with animated dot rail |
| `GasBar` | animated fill vs budget; overshoot turns red; tooltip sources (GAS.md) |
| `CopyChip` | truncate mid (4+4…4), click-copy, 1.2s checkmark morph |
| `RuleStamp` | rejected-{$code, $rule} stamp; rotates -6°, mono; stores to FINDINGS on render |
| `StepTracker` | numbered pipeline with resumable state (ENS flow, key ceremony) |
| `Toast` | error code → human hint via mapping table (AGENTS §9 semantics) |
| `ErrorBoundary` | full-screen card with "export diagnostics" (JSON blob) |

## 4. State (zustand stores)

- `demoStore`: mempool-lane state machine, attempt list (persist last 20 in localStorage),
  explorer URLs, captured rules.
- `keyStore`: in-memory only. pk fingerprint + presence flag persisted; sk NEVER persisted
  unencrypted (session-only; export via encrypted file).
- `ensStore`: flow state machine (idle/mint/approve/commit/waiting/reveal/registered/writing/rotated).
- `arkivStore`: entity cache + live events.
- All stores expose `reset()` for demo re-runs; `demoStore` has a `dryRun` toggle that
  fabricates states for offline rehearsal (venue Wi-Fi insurance).

## 5. Motion rules

- **Never** animate >600ms; **never** block interaction; skeletons for all async fetches.
- Money-shot choreography is the ONLY slow montage: lane A reject (400ms shake-in, stamp
  200ms after settle) → 350ms beat → lane B unstaked reject → user stakes → lane B accept
  with cyan pulse ring 500ms. Total auto-sequence ~4s + real chain waits shown as status.
- Reduced-motion: replace decays/pulses with opacity fades ≤120ms; keep stamps (static).
- All numerals JetBrains Mono, tabular-nums; gas counters count-up 300ms on change only.

## 6. Copy rules

- One pun max per screen; error copy always pairs code + hint; honest-limitations line
  in the footer of every screen ("ML-DSA-44 verifies in ~2.69M gas — live on alt-mempool;
  contract layer unaudited demo").
- Nothing says "100% secure". The words for the demo: *quantum-safe spend authorization*,
  *residual dual-sig layer (V9)*, *unaudited contract stack*.
