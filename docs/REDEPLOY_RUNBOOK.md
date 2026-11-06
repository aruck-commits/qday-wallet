# Redeploy runbook: new EIP-8141 devnet

Use this the moment the devnet operator gives us a new RPC. Nothing here runs until that happens.

## Inputs from the devnet operator
- `DEVNET_RPC`: ethrex JSON-RPC URL
- `DEVNET_GATEWAY`: sidecar gateway URL (`eth_sendFrameTransaction`, `skandha_explorer_peers`)
- `DEVNET_CHAIN_ID`: chain id (old devnet: 1337)
- Faucet method and limits (the old one was `skandha_explorer_faucet`, one request per address per hour)
- Staking registry address and minimum stake (old: `0xd51c…2d2f`, minimum 0.01 ETH, we stake 0.012)
- Explorer URL for transaction links

## Steps
1. Put the four values in `.env.devnet.local` (git-ignored) or export them. Example:
   `DEVNET_RPC=... DEVNET_GATEWAY=... DEVNET_CHAIN_ID=... `
2. Confirm the chain and peering before spending anything:
   - `eth_chainId` equals the new chain id
   - `eth_blockNumber` is increasing (check twice, 30 s apart)
   - `skandha_explorer_peers` is non-empty. If it's empty, stop and ask the operator. Do not deploy into a chain that can't admit frames.
3. Fund the deployer through the faucet. One request per address per hour, so plan for that.
4. `yarn deploy:devnet` with the same env. This creates the factory, verifier, precompute, and `QDayWallet`, and writes addresses and hashes to state.
5. Stake: `yarn demo:spike` (or the stake step) with the new registry. Record the mined transaction hash. Check the readback with `getDepositInfo(subject)` and save the receipt.
6. `yarn demo:mempool` for the admission sequence: canonical reject, unstaked reject, stake, staked accept. Save each raw response.
7. Freeze the new run: `node scripts/freeze_evidence.mjs` (extend its `endpoints.devnet` to the new gateway first).
8. Update `scripts/export-evidence.mjs` if the addresses changed, then `node scripts/export-evidence.mjs` and `yarn app:build`.
9. Commit with honest labels: the new run is a new chain, and the old run stays labeled as the old chain.

## If the new devnet doesn't come up in time
- The submission uses the frozen snapshot in `docs/evidence/` and the honest pending state in the demo.
- We do not claim an admitted frame that we did not observe.

## Known traps
- The stake frame from the old chain (`0xc8703b…`) was accepted but never mined, and the registry readback shows 0.012 ETH with no indexed log. Verify the mining transaction on the new chain before we quote it.
- Contract wall nonces start at 8 on this chain family. Expect that on the new chain too.
