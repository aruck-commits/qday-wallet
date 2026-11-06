# Submission hardening session

## Scope

Refresh the evidence-only export from live read-only RPC/state sources, reconcile stale
README and submission checklist claims, and verify the final contract, typecheck, and UI
build gates without redeploying contracts or resubmitting frame transactions.

## Decisions

- Keep the currently configured chain as the evidence target because the operator did not
  confirm a replacement genesis, faucet, or alternate endpoint.
- Treat the mined 0.024 ETH SpikeWallet registry readback and the bounded staked OOG
  attempts as the current G1/G3 truth; do not claim sidecar admission or a mined PQ frame.
- Treat ENS project-owned resolver write/rotation and bzz.limo byte-equal readback as
  completed evidence; preserve the official gateway approval limitation and do not claim
  the Swarm bonus.

## Verification

`bun run evidence` was run as a live-read-only export. The export captured chainId 1337,
the advancing devnet block, participant balance, 0.024 ETH stake readback, Sepolia block,
and the existing transaction/state artifacts. No signing, deployment, or frame submission
was performed in this session.
