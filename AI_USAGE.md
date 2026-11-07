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
| 2026-11-06 | Codex | G2 real-verifier vectors and G3 script scaffolds | prompts/2026-11-06-g1-g2-lanes.md |
| 2026-11-06 | Codex | G2 gas cross-check and G4 live deployment preparation | prompts/2026-11-06-g1-g2-lanes.md |
| 2026-11-06 | Codex | G4 ENSv2 ABI verification and Sepolia deploy/register implementation | prompts/2026-11-06-g1-g2-lanes.md |
| 2026-11-06 | Codex | G4 ERC1155 receiver fix, wallet redeploy, and ENSv2 registration | prompts/2026-11-06-g1-g2-lanes.md |
| 2026-11-06 | Codex | G1 raw RPC evidence capture and sidecar-gate monitoring | prompts/2026-11-06-g1-g2-lanes.md |
| 2026-11-06 | Codex | overnight execution runbook and G1 risk-gated finalization | prompts/2026-11-06-g1-g2-lanes.md |
| 2026-11-06 | Codex | G6 evidence pipeline and honest dry-run evidence model | prompts/2026-11-06-prompt-beta-ui.md |
| 2026-11-07 | Codex | Omega runbook and G3 fresh-chain deployment/precompute | prompts/2026-11-07-omega.md |
| 2026-11-07 | Codex | Omega G4 hard-stop, Swarm evidence, and G6 UI completion | prompts/2026-11-07-omega.md |
| 2026-11-08 | Codex | Tau ENS diagnosis, real G6 screens, and G7 deliverables | prompts/2026-11-08-tau.md |
| 2026-11-08 | Codex | ETA Swarm bzz.limo byte-equal read-back, Arkiv patch, G6 console substance, and final video beats | prompts/2026-11-08-eta.md |
| 2026-11-06 | Codex | UI-2 design-pack rebuild, brand system, evidence-only screens, and craft polish; telemetry disabled | prompts/2026-11-06-psi-ui2-design-pack.md |
| 2026-11-06 | Codex | χ-v2 live read-only evidence export, account header, and wallet-home foundation | prompts/2026-11-06-chi-v2-wallet-product.md |
| 2026-11-07 | opencode (GLM, build mode) | G4 ENS PQ write via own Permissioned Resolver; G5 Arkiv build-time SDK read, README writer and query; public GitHub Pages deploy | prompts/2026-11-07-ens-arkiv-deploy.md |
| 2026-11-06 | opencode (GLM, build mode) | G6 craft pass execution: Midnight Stake unification, hero choreography, JSON highlighting, chi.css race fix, balance chip; skills pack installed with telemetry off | prompts/2026-11-06-craft-pass.md |
| 2026-11-06 | Codex | completion push: live peer-gate check and honest booth/video narrative alignment | prompts/2026-11-06-completion-push.md |
| 2026-11-07 | Codex | read-only submission hardening: refreshed evidence export, reconciled current G1/G3/ENS/Swarm status, and verified build gates | prompts/2026-11-07-submission-hardening.md |
| 2026-11-07 | Codex | logo refresh from supplied visual direction: original shield/lens SVG, header treatment, favicon, and production build | prompts/2026-11-07-logo-refresh.md |
| 2026-11-07 | Codex | final closure: read-only peer gate, refreshed live evidence, honest zero-peer status, and final app verification | prompts/2026-11-07-final-closure.md |
| 2026-11-07 | Codex | 20-minute frontend skills-pack craft pass: shell hierarchy, console controls, focus states, tabular evidence numerals, and mobile-safe interactions; telemetry disabled | prompts/2026-11-07-ui-polish-pack.md |
