# Prompt: 2026-11-06 — Craft pass (agent-executed UI polish)

## Context
After the χ semantics round (Codex), the UI was structurally complete but visually raw.
This session was executed directly by the assistant agent (opencode/GLM build mode),
working in `qday-wallet` on top of `bc4202a..bc4202a`, verified visually through a
production preview served on localhost and inspected in Chrome.

## Instruction (paraphrased from the human)
1. Install the `frontend-skills-set.tar.gz` design skills pack for all agents with
   telemetry disabled.
2. Take the remaining UI work directly — make the app look like a real wallet.

## What the agent did (committed)
- `569afd9` craft pass: `app/src/craft.css` (imported last) unifying the palette to
  brand.md Midnight Stake tokens, single self-hosted Space Mono everywhere (IBM Plex
  Mono references had no font file), fixing the missing `.stamp-cyan` tone used in
  the lane D queue stamp, hover/focus polish, scrollbar/selection details.
- `c6e1014` hero choreography: staggered spring entrance for subtitle/quote/actions/
  proof chips; replaced the duplicated hero quote (headline == quote) with the real
  captured canonical rejection rule from evidence; favicon + title/meta in index.html.
- `c0c7b56` syntax-highlighted raw JSON: minimal tokenizer (`RawWindow` exports
  `highlight`) coloring keys/strings/numbers/booleans/null, reused for the Swarm
  passport drawer; byte-grid shading variation.
- `6454113` fix: restored `app/src/chi.css` from git after a concurrent-write race
  truncated it (agent append raced with the other agent session's rewrite); no rules
  lost; added `.balance-chip`.
- `c0a1ce8` account header balance chip (devnet live read), "as of <time> IST"
  evidence caption, EmptyProof default label UNAVAILABLE → PENDING.

## Verification
- `bun run build` green (35 kB css / 108 kB gzip js) after every commit.
- Production preview inspected in Chrome: 3-column wallet home grid renders,
  history rows, chain switcher, composer panel all styled.
- Note verified in prod bundle: Vite 8 (rolldown + lightningcss) reorders CSS
  declarations alphabetically when minifying — naive string checks against
  `property{prop:` order produce false negatives.

## Lesson recorded
Concurrent agent sessions editing the same CSS file can clobber each other via
`Set-Content`-style whole-file writes; restores must go through git, and appends
must use read-merge-edit, never raw overwrite.
