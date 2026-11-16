# Product API — v2 lib layer (implementer contract)

The UI rebuild consumes these modules. **Do not edit files in `app/src/lib/`** — if an
API is missing or awkward, note it in your summary instead. Everything below typechecks
and is exercised by `tooling/probe_sign.ts`.

## `lib/pq.ts` — real ML-DSA-44 (FIPS 204)

```ts
PQ                        // { name: "ML-DSA-44", fips, algoId, pkBytes: 1312, skBytes: 2560, sigBytes: 2420 }
generatePqKey(): PqKeyPair                                  // { publicKey, secretKey, seed, createdAt }
fingerprintHex(bytes): Promise<string>                      // SHA-256 hex (same format the ENS record stores)
signDigest(digest32, secretKey): Uint8Array                 // 2420-byte signature
verifyDigest(digest32, signature, publicKey): boolean       // same check the on-chain verifier runs
encryptKeyfile(pair, passphrase): Promise<Keyfile>          // demo-grade keccak-stretch keyfile
decryptKeyfile(file, passphrase): Promise<PqKeyPair>
```

## `lib/frame.ts` — real EIP-8141 frame txs (hegota-support codec)

```ts
transferIntent({ chainId, wallet, recipient, amountWei, pqNonce, deadline }): Hex
// byte-exact mirror of QDayWallet.currentIntent (32-byte keccak digest)

buildPqFrameTx({ chainId, sender, recipient, amountWei, pqNonce, deadline,
                 messageDigest, signature, verifyExecutionLimit? }): BuiltFrameTx
// BuiltFrameTx = { txHash, wire (JSON wire form for eth_sendFrameTransaction),
//   rawCanonical (hex bytes — the canonical-mempool submission that gets rejected),
//   frames: [{ mode: "VERIFY", execution "3200000" }, { mode: "SENDER", target, execution, state, value }],
//   signature: { scheme: "ARBITRARY", algorithm, bytes: 2420, message: digest },
//   intent: { digest, pqNonce, deadline, recipient, amountWei, callData: "0x" } }
```

Constants: `VERIFY_EXECUTION_LIMIT 3_200_000n`, `SENDER_EXECUTION 50_000n`, `SENDER_STATE 200_000n`,
`MAX_FEE_PER_GAS 2 gwei`, `INTENT_TTL_SECONDS 3600n`, `FRAME_PROFILE "ethrex-eip8141-tracer"`.

## `lib/walletStore.ts` — session wallet state (zustand)

```ts
useWalletStore() // { keypair, fingerprint, intents, live, ...actions }
generateKey()              // generates + fingerprint; secret stays in memory only
forgetKey()                // wipes key + intents
importKeyfile(file, passphrase) / exportKeyfile(passphrase): Keyfile
signTransfer({ recipient, amountEth }): Promise<IntentRecord>
// recipient 0x-address, amountEth "0.012"-style → builds intent digest, signs with
// ML-DSA-44, verifies locally (throws if verify fails), builds the real frame tx,
// appends to `intents` (newest first, max 20)
refreshLive()              // parallel live reads, sets `live`
```

`IntentRecord = { id, createdAt, recipient, amountEth (wei string), digest, pqNonce, deadline,
txHash, wire, frames, signature: { bytes: 2420, ... }, verified: true, status: "signed",
submitNote }`.

`live: { sepolia: SepoliaLive, devnet: DevnetStatus, ens: EnsPqRecord,
arkiv: ArkivEntity, arkivQuery: { keys, block }, refreshing, refreshedAt }` — every live
value is nullable; render honest `—`/offline states (per UI spec §8).

`ensureLiveRefresh()` — call on mount of live-data screens; no-op if fresh (<2 min).

## `lib/chain.ts` — live reads (public RPC, no keys)

```ts
SEPOLIA  // { chainId, name "qdaywallet.eth", hookedWallet 0xe104…c9b0, participant 0x3b7C…79b1, resolver 0x863b…c8e4, explorerTx(hash) }
ARKIV    // { rpc, chainId 7794095, schema, entityKey 0xc6c0…d048, explorerTx(hash) }
DEVNET   // { gateway, chainId 1337, explorerTx(hash) }

readSepoliaLive(): { online, blockNumber, balances: { hooked, participant } (ETH strings), error }
readEnsPqRecord(): { online, value (the sha256 fingerprint stored on-chain), resolver, node, textKey, error }
probeDevnetGateway(): { online, chainId, error }   // expected OFFLINE post-hackathon
probeDevnetReceipt(hash): { online, blockNumber, error }  // eth_getTransactionReceipt vs the gateway;
                                                  // blockNumber non-null ONLY on a real mined receipt → "Settled"
                                                  // tier; null → "Admitted" (hash-only) tier. Never fake a block.
readArkivEntity(): { online, key, owner, attributes: { scheme, status, pqKeyVersion, swarmRef }, expiresAtBlock, error }
queryArkivMigration(): { online, keys, block, error }
```

## `lib/format.ts` — formatting (UI spec §5)

```ts
formatEth(wei)          // { display: "0.024", full: "0.024000000000000000" } — tooltip shows full
truncateHash(hash)      // "0x58ab15…d678"
formatGas(value)        // "2,664,784"
formatBytes(2420)       // "2,420 B"
formatAgo(ts)           // "12s ago"
parseEthToWei("0.012")  // bigint | null (gwei-precision safe input parse)
```

## Frozen data (unchanged, still available)

`data/demoEvidence.json` (typed by `lib/evidence.ts`) — captured EF exhibit: canonical
REJECTED rule, unstaked rejection, staked OOG at 3.2M/6.5M, stake 0.024 ETH readback,
ENS write + rotation, tx history with explorer links. `data/arkivLive.json` — build-time
Arkiv snapshot (fallback when live read fails).

## Honest-copy rules (non-negotiable)

- Devnet shows `OFFLINE` / "last-known" — never fake a live chain.
- Submission attempts on a dead gateway render `NETWORK OFFLINE — nothing was broadcast`.
- `ACCEPTED` may never appear unless a live gateway said so.
- Captured evidence keeps its `CAPTURED` label and explorer links.
- Session keys: "session-only" everywhere; export must warn demo-grade.
