# AI Usage Disclosure — Q-Day Wallet

ETHGlobal requires disclosure of AI assistance. This file is the running ledger (updated as
we go, in the same commits as the work — never reconstructed at the end). Prompts live in
`specs/prompts/YYYY-MM-DD-<topic>.md`.

## Tools

| Tool | Role | When |
|---|---|---|
| `opencode` (GLM) | project planning, spec authoring, deep codebase research, agent-driving | Nov 4–6 |
| `Codex` (OpenAI, subscription) | primary build agent in VS Code across contracts/scripts/app | Nov 5–7 |
| (planned) Claude Code CLI | contingency builder (separate working tree only if activated) | — |

## Ground rules used during this build

1. All pinned facts (addresses, gas figures, API signatures) in SPEC/AGENTS were verified
   against primary sources before writing spec files.
2. Every substantive AI session produced a prompt log file under `specs/prompts/`.
3. Contract code that touches memory-safety-sensitive logic (signature verification, nonce
   bumping) was reviewed by the human with the spec open — the spec exists to make review possible.
4. We disclose limitation: the onchain verifier dependency (mldsa-solidity) is third-party,
   unaudited, MIT — declared in README + VULNERABILITIES.md.

## Session ledger

| date | tool | gates touched | prompts file |
|---|---|---|---|
| 2026-11-04 | opencode (GLM) | planning + spec v1.0 | prompts/2026-11-04-spec-v1.md |
| 2026-11-05 | opencode (GLM) | G0 workshop baseline (steps 1–2), source research | prompts/2026-11-05-workshop-baseline.md |
| 2026-11-05 | Codex | G0 workshop baseline and G1 ARBITRARY spike | prompts/2026-11-05-g0-g1-codex.md |
| 2026-11-06 | Codex | G0 workshop baseline continuation (steps 7–13) | prompts/2026-11-06-g0-continuation.md |
| 2026-11-06 | Codex | G1 ARBITRARY spike and G2 contract scaffold | prompts/2026-11-06-g1-g2-lanes.md |
| 2026-11-06 | Codex | credential templates, env loader, and G2 implementation | prompts/2026-11-06-g1-g2-lanes.md |
| 2026-11-06 | Codex | G2 verification tests and G1 fixed-burn calibration | prompts/2026-11-06-g1-g2-lanes.md |
