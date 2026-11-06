# FINDINGS — Q-Day Wallet empirical log

Every devnet contradiction, rule name, gas surprise, and API quirk discovered during G0–G6
goes here (newest first). This file is the source for README's "captured rejections" section.
Format: gate · UTC time · what we tried · verbatim result · action taken.

---

## G1 (pending tonight)

## G5 evidence

- 2026-11-06 · Rabdi SDK 1.0.1 PASS · created `qday.migration` entity `0xc6c072904c6dd995b59046e2465e33283f09fb14c61c7f63c9ccc723c84dd048` in tx `0x36def5cf23e075599abefeb0d9c012b67d18aee977976357cc5533691aa0c2fc`; public get asserted; patch tx `0xc62614cd4dbfc523841af3e8924f25e2a6df669c4c7699596f6c07301792d9a4`; filtered query count `1`.

- 2026-11-06 · operator error · an accidental `demo:spike --help` invocation submitted a second identical spike deployment at nonce `7`, hash `0x219ea9207770c465f3e3f2f3c9bc7aecec0de165d8ca1c9fccf2d1477be0f8b0`; the intended deployment remains nonce `6`, hash `0x92e1384824f64eb1c731268bffd2e1eb31c56e9a1e53b0ce90888ce5209cc5a8`. Both remain pending on the stalled chain and will not be resubmitted.

- [ ] canonical rejection rule name for >100k VERIFY frame (ARBITRARY entry)
- [ ] sidecar unstaked rejection rule
- [ ] ARBITRARY entry layout: sigparam indices + sigdatacopy offsets (fixture)
- [ ] exact VERIFY-frame execution limit observed per profile

## G0 (scope closed for qualification)

- 2026-11-06 · G0 accepted as sufficient for this build: steps 9–11 are conditional follow-up patterns; steps 12–13 are cut-list item #4. Step 8 remains pending and will not be resubmitted.

## G0 (workshop baseline — pre-running before spec lock)

- 2026-11-06 · step_8 inclusion check · chain advanced to block `408262` (`0x63ac6`) while `eth_getTransactionCount(violatingWallet, "latest")` remained `9`; sidecar debug still reports the nonce-`9` tx `0xeba434c2051d6399a5cc8ff9ac804296abdc5d0efffe35fb75c5b5093b3f242a` as `New` with no receipt. This is an inclusion stall, not a stopped chain.
- 2026-11-06 · step_8_tx_violating_alt PENDING · tx `0xeba434c2051d6399a5cc8ff9ac804296abdc5d0efffe35fb75c5b5093b3f242a` admitted by the standard alt-mempool: `ACCEPTED`, 17 checks passed, lifecycle `admitted`, status `New`, receipt `null`; retry poll unchanged. The staked foreign-storage VERIFY transaction uses nonce `9`; do not submit it again while it remains known to the sidecar.
- 2026-11-06 · step_7_stake PASS · preflight `getStake(0x0641c41fc7fbbeade3df90fb2ae15e7f1c1f182b)` returned `{amount:"12000000000000000", unstakeDelay:86400, withdrawTime:0}`; guarded rerun returned `{ok:true, staked:true, alreadyStaked:true, stakeWei:"12000000000000000", unstakeDelaySec:86400}` and submitted no second stake.
- 2026-11-05 · step_7_stake PENDING · stake tx `0xc8703b08be9c0f627b09068123b24919f5e4069b7615833bc03cf8595d07aefa` admission: `ACCEPTED`, 17 checks passed, lifecycle `admitted`, status `New`, receipt `null`; registry stake remains `0` wei. Re-submission returned `{code:"RPC_-32602", message:"Frame transaction already known"}`. Do not submit another stake; wait for inclusion or devnet recovery.
- 2026-11-05 · step_6_tx_violating_canonical PASS · canonical mempool: `{code:"RPC_-32502", rule:"STO", hint:"validation may only touch the sender's own or associated storage; a staked entity may read more in the standard alt-mempool (yarn step_7_stake)", message:"Invalid params: Frame transaction validation-prefix simulation failed: StorageReadNonSender"}`; standard alt-mempool unstaked: `{rule:"STO", message:"unstaked payer accessed 0xa37d3a42c4117bafe189dd21b6170a96f17406b3 slot 0x0000000000000000000000000000000000000000000000000000000000000000"}`; tx `0x11b2db0ed8e6d2a38f3034fdc20d9efd35cbf59d800f7727152dcb1d5b852fc9`.
- 2026-11-05 23:3x · unblock: faucet empty (`FUNDING_FAILED`); restored funded participant state from the earlier run; no faucet dependency.
- 2026-11-05 · step_1_check BLOCKED · gateway faucet result: `{ok:false, code:"FUNDING_FAILED", rule:null, hint:"each address can ask once an hour; use the Faucet button in the explorer with another address, or ask the host", message:"The faucet refused 0xbBE08746A050b76d392F1276D5fBD3983a1279AB: The faucet is empty"}` · do not proceed to steps 2–13 until a faucet-funded participant key is available.
- 2026-11-05 · step_1_check PASS · participant 0x3b7CdFf8ED99272338abF93A3B31b13421f779b1,
  funded 1 ETH, gateway alive, chainId 1337.
- 2026-11-05 · step_2_tx_first PASS · tx 0xd990332987d900ef6fb5bdedad7b24df61cadc674c08d45c88a9749813f987e8
  mined block 403253 · 2 frames (SENDER + VERIFY) · explorer confirms.
- 2026-11-05 · step_3_tx_paymaster FAIL · RPC_UNREACHABLE on gateway URL, retry 180 s timeout
  → transport/transient (network flake); will retry before proceeding.
- source-walk findings (from workshop repo + hegota-support dist):
  · profile `ethrex-eip8141-tracer` exposes sigSchemes incl. **ARBITRARY = 0x0** (accepted on
    devnet, probed 2026-10-24 upstream) — basis of G1 design.
  · contract-wall wallets start at **nonce 8** (7 internal helpers).
  · storage read of non-owned contract in VERIFY frame = canonical reject `StorageReadNonSender`
    (workshop-proven pattern, analogous to our >budget case).
  · violation discriminator = non-empty frame data (empty = clean path) → our clean/PQ branch design.

- {"gate":"G1","error":{"code":null,"rule":null,"hint":null,"message":"ethrex stalled at 408262; aborting"}}

- {"gate":"G1","error":{"code":null,"rule":null,"hint":null,"message":"ethrex stalled at 228; aborting"}}
