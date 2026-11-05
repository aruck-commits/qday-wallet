# FINDINGS — Q-Day Wallet empirical log

Every devnet contradiction, rule name, gas surprise, and API quirk discovered during G0–G6
goes here (newest first). This file is the source for README's "captured rejections" section.
Format: gate · UTC time · what we tried · verbatim result · action taken.

---

## G1 (pending tonight)

- [ ] canonical rejection rule name for >100k VERIFY frame (ARBITRARY entry)
- [ ] sidecar unstaked rejection rule
- [ ] ARBITRARY entry layout: sigparam indices + sigdatacopy offsets (fixture)
- [ ] exact VERIFY-frame execution limit observed per profile

## G0 (workshop baseline — pre-running before spec lock)

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
