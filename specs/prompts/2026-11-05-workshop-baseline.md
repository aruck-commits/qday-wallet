# Prompt log — 2026-11-05 (workshop baseline + spec package on disk)

Tool: opencode (GLM) · Session: environment setup + baseline (pre-Codex).

Work performed:
- Cloned forshtat/mempool-workshop + skalenetwork/mldsa-solidity into qday/tooling/ (shallow),
  installed workshop deps (yarn 1.22.22 global install).
- Ran workshop step_1_check (PASS — participant key funded) and step_2_tx_first (PASS —
  frame tx mined, block 403253, 2 frames).
- step_3_tx_paymaster failed on gateway RPC_UNREACHABLE (transient network; retry queued).
- Wrote the full spec package to disk under qday/ (AGENTS.md, specs/*, docs/*, arkiv/*).
User decisions recorded:
- Build policy: NO build work without explicit user go-ahead.
- Builder: Codex primary in VS Code; opencode kept for planning/verification lanes.
- Name locked: **Q-Day Wallet** (repo `qday-wallet`, schema `qday.migration`).
