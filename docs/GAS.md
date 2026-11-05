# Gas & Budget Facts — Q-Day Wallet

Every number that appears in UI copy must trace here. Live-measured numbers from OUR build
get their own rows (marked **[measured]**) — until then the table shows *pinned source data*
from the referenced projects (cited). Forge gas snapshots land in `contracts/.gas-snapshot`
and are reflected here at G2.

## Verification cost (ML-DSA-44, 32-byte message)

| what | value | source |
|---|---|---|
| verify — registered fast path | **2,689,594** | mldsa-solidity README (forge measured) |
| verify — full computation | **5,764,346** | mldsa-solidity README |
| MLDSAKeyFactory.registerA (pk precompute) | 5,542,745 | mldsa-solidity README |
| MLDSAKeyFactory.registerT/trie line | 2,290,093 | mldsa-solidity README |
| verify gas slope | +89,077 per 136-byte message increment | mldsa-solidity README |
| comparison: ECDSA-of-ECDSA "quantum emergency" wallet cited by Fireblocks | 1,234,201 | Fireblocks Dilithium blog post (2023) |

## Frame-tx budgets (devnet knobs; G1 asserts the real enforced limits)

| knob | plan | note |
|---|---|---|
| canonical mempool validation budget | ~100k (rule name TBD at G1) | why canonical rejects us |
| VERIFY frame execution limit | 3.2M (registered) / 6.5M (full) | set when implementing/measure |
| SENDER frame | 50k exec + 200k state | workshop-proven |
| deploy gas | 6M (creation + value) | workshop rule for contract txs |
| legacy gasPrice for contract/ops txs | 0.002 gwei | workshop rule |
| transfer size in demo | 1 gwei | workshop recipient pattern |

## Our contract's op-pad (to measure at G2, added to this table)

- PQ-path fallback approve (registered) *slot:* [measured]
- executePq registered verify + call: *slot:* [measured]
- rotatePqKey: *slot:* [measured]
- registered vs full spread is the **money shot number**: ~2.07M difference — precomputed ONCE
  (5.5M+2.29M) per key vs paying 5.76M EVERY verification; break-even at ~2 admin txs.

## Stake economics (devnet)

- minStake 0.01 ETH → we stake **0.012 ETH**, unstakeDelaySec 86400 (1 day) — one clean-path tx.
- reputation behavior for unstaked >budget frames documented at G3 with exact observed codes.

## UI copy numbers (from this file only — no invention)

- "2.69M gas — every ML-DSA check" · "vs ~100k canonical budget" · "5.76M without factory
  precompute" · "0.012 ETH stake" · "1312 / 2560 / 2420 bytes".
