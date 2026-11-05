# Who uses Q-Day Wallet's public PQ-key registry — and why it matters

## The one-line answer

Anyone who needs to answer **"is this address quantum-safe, and since when?"** without
trusting an API — ENS integrators, exchanges doing withdrawal-key due diligence, explorers,
auditors, and end users deciding whether an address is worth writing a PQ key to.

## Concrete user groups

1. **Wallet providers / SDK teams.** Before shipping PQ support, they need data on *which*
   wallets are PQ-enrolled and how readings drift across events. The registry gives a public
   roster they can query without registering anywhere.
2. **Exchanges & custodial services.** Post-Q-day, they can decide per-address whether a
   deposit path is still reconcilable with the assumed security of the withdrawal key.
   `wallet → pqPkHash → status` is exactly the record needed for that policy.
3. **ENS-facing applications.** Names whose PQ record admins rotate via `rotatePqKey` are
   verifiable here — an integrator can assert "name owner has an ACTIVE PQ key" from Arkiv,
   then trust ENS. Without the registry, ENS integrators would have to parse frame txs.
4. **Auditors & researchers.** A structured dataset of real PQ keys + versions + verifier
   contracts is genuinely useful for PQ-migration measurement over time (adoption stats).
5. **The wallet's own UI** (and any webhook frontends): we consume our own registry via
   watch events — using the product dogfooding it, no special-casing.

## What groups can start doing with it IMMEDIATELY after the demo (no setup)

- Read the registry via any Arkiv client (the schema + access key are public; address keys
  queryable by rule `status eq 'ACTIVE'`).
- Follow the watch feed to see falls in `ACTIVE` and rises in `ROTATED` — an adoption pulse
  that didn't exist before.
- Cross-check any wallet address against its claimed PQ key fingerprint (the "who guards
  the vault keys" use case for exchanges in one query).

## Integration futures (stated honestly, not claimed as built)

- Enrich with per-event pointers (rotation tx hash fields) — trivial extension.
- Multi-chain expansion by adding `chain` column + per-chain verify contracts.
- Aggregations (migration dashboards) built by others on our registry — we don't claim them;
  the registry makes them possible.
