# Q-Day Wallet video beat sheet (90 seconds)

The short video mirrors `docs/DEMO_SCRIPT.md`: show captured evidence first, then make
every unavailable state explicit. All links below come from `demoEvidence.json`.

- 00:00-00:08 - S0 Hero: open on "The wallet is the identity." Show ML-DSA-44,
  the DRY RUN badge, and the canonical/alt-mempool split in one frame.
- 00:08-00:25 - S1 lane A: run the demo. Show the literal canonical raw JSON rejection,
  including `MAX_VERIFY_GAS`; do not paraphrase the rule.
- 00:25-00:38 - S1 lane B + GasBar: show the same VERIFY frame rejected unstaked with
  the raw Out Of Gas response. Animate the real comparison: 2,664,784 measured gas
  versus the approximately 100,000 canonical budget.
- 00:38-00:52 - S1 lanes C and D: advance A -> B -> C -> D. Show the 0.012 ETH
  registry readback. If a mined frame hash exists, open its explorer link; otherwise
  say: "The gateway-to-miner peer gate was empty, so I claim no staked admission."
- 00:52-01:03 - S2 Wallet Key: generate a fresh session-only ML-DSA-44 key with the
  Noble subpath, show the exposure card, and show the encrypted local download action.
- 01:03-01:15 - S3 Registry: show the Arkiv entity, rotated status, and byte-equal
  Swarm passport reference. In dry run, show the neutral message that live fetch is
  disabled rather than pretending the browser has an access key.
- 01:15-01:25 - S4 Identity: open `qdaywallet.eth` and the real registration explorer
  link. Show the honest PQ-write and rotation-pending timeline.
- 01:25-01:30 - S5 Architecture: trace Noble signer -> frame/relayer -> verifier ->
  QDayWallet -> ENS/Arkiv, ending on the UNAUDITED VERIFIER badge.

Fallback narration: if asked why the staked or PQ URL is absent, point to the raw peer
probe and say the gateway-to-miner link was empty. If asked about ENS text mutation,
say registration and wallet ownership are real, but the default resolver demanded
`ROLE_SET_TEXT`; the captured `eth_call` proof makes that limitation part of the demo.
