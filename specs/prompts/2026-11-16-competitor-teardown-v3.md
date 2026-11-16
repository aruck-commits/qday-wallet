# Prompt — 2026-11-16 · Competitor teardown + v3 pivot (editorial-neon UI, own-chain plan)

**Operator:** Arudra — after first-place results were published: "look at this and think
what mistakes we did dude they won the first place we didnt" (re: ETHGlobal Mumbai winner
**Quantum Smart Wallet** by Nick Bailo / Andrei Ensobol — quantum-smart-wallet.vercel.app).

## Teardown: why they won and we didn't

1. **Their demo is alive when a judge clicks.** They self-host ethrex + Lighthouse beacon +
   32 validators + validating sidecar + gateway + static explorer on their own VPS
   (altmempool.bailo.london, chain 81411338 — probed live during this session). Our Send
   flow depended on the EF workshop's shared devnet, which died — our live site honestly
   shows `NETWORK OFFLINE`. A dead first impression beats honest documentation.
2. **Sponsored gas.** Their Vercel backend creates accounts and co-signs as gas sponsor —
   any visitor acts instantly with zero ETH. We required a funded + staked wallet.
3. **They own the rules.** Their sidecar policy: 2.5M verification gas for on-chain-staked
   senders, 100k for third parties. We inherited workshop rules; our ML-DSA-44 verify
   OOG'd at 3.2M/6.5M.
4. **Product actions vs mechanism exhibits.** Swap (Uniswap v4 + guarded hook), ENSv2
   names, portfolio — every action has a payoff. We demoed a 0.012 ETH transfer + captured
   rejection exhibits.
5. **UI energy.** Theirs: editorial serif vs mono, near-black + neon, the tx lifecycle as
   tabs (COMPOSE → SIGN → VERIFY → EXECUTE → SETTLE), a giant animated VERIFIED stamp
   over a radial pattern, ambient particles — a transaction as an EVENT. Ours: austere
   mono terminal with honesty badges as screen headers.
6. **First 3 seconds.** Theirs: a working wallet. Ours: stake readback + UNAUDITED badge.

## Probes performed (all read-only)

- Their RPC `https://altmempool.bailo.london/rpc` → eth_chainId = 0x4da3d0a (81411338). ALIVE.
- Their `/deployment.json`, `/api/config`, showcase page, README, server README, and
  `infra/devnet/README.md` (full VPS recipe, MIT) — fetched and studied.
- Their mempool policy: staked sender ≥0.01 ETH + ≥1 day delay → **2.5M** verification gas;
  distinct third-party entities → **100k**.
- Our measured registered-path verify: **2,664,784** (docs/GAS.md) — **165k over their 2.5M
  cap**; vendored mldsa-solidity has no precompute beyond A+T to shave it. Conclusion:
  our contracts cannot validate on their chain; funding there also requires their operator.
  Integration with THEIR chain is a dead end — documented deliberately, not attempted.

## Operator decisions (this session)

1. **UI: full editorial-neon redesign** (serif display + neon accents + animated
   celebration states + ambient motion; graphite base kept; honesty demoted to footnotes).
   → ui-designer subagent writing `specs/UI_SPEC_V3.md`.
2. **Chain: stand up OUR OWN EIP-8141 devnet** on an existing server (SSH details pending
   from operator), following the winners' public infra recipe with OUR mempool policy —
   staked budget 6.5M so BOTH our registered (2.66M) and full (5.76M) ML-DSA-44 verify
   paths admit. This demonstrates the real ERC-8421 thesis: the policy knob is how
   post-quantum verification fits Ethereum. Our contracts, our explorer, live Send flow.

## Honest-copy rules unchanged

Nothing fake was added to the app during this session; all probes were external reads.
