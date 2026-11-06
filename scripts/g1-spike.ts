import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  encodeFunctionData,
  http,
  keccak256,
  parseEther,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { profile } from "@forshtat/hegota-support/profiles/ethrex-eip8141-tracer";
import { encodeTx, frame, newTx, secp256k1Placeholder, sigScheme, signTx, txHash } from "@forshtat/hegota-support/tx";
import { toWire } from "@forshtat/hegota-support/rpc";
import { appendFinding, ethrexUrl, pollFrameStatus, preflightCanonical, preflightSidecar, readStake, stakingRegistry } from "./lib/devnet.js";

const gatewayUrl = "https://altmempoolgateway.forshtat.com/rpc";
const recipient = "0x8943545177806ED17B9F23F0a21ee5948eCaa776" as const;
const statePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../tooling/mempool-workshop/.workshop-state.json",
);
const artifactPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../contracts/out/SpikeWallet.sol/SpikeWallet.json",
);
const runStatePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tooling/mempool-workshop/.g1-spike-state.json");
const chain = defineChain({
  id: 1337,
  name: "EIP-8141 Workshop Devnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [gatewayUrl] } },
});

type WorkshopState = { participantKey?: Hex };
type SpikeState = { deployHash?: Hex };
type RpcOutcome = { accepted: true; hash: Hex } | { accepted: false; error: Record<string, unknown> };

function readParticipantKey(): Hex {
  const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as WorkshopState;
  if (!state.participantKey) throw new Error(`Missing participant key in ${statePath}`);
  return state.participantKey;
}

function readArtifact(): { abi: readonly unknown[]; bytecode: Hex } {
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as { abi: readonly unknown[]; bytecode: { object: Hex } };
  return { abi: artifact.abi, bytecode: artifact.bytecode.object };
}

function assertSpikeRuntime(code: Hex) {
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as { deployedBytecode: { object: Hex; immutableReferences?: Record<string, { start: number; length: number }[]> } };
  let normalized = code.slice(2);
  for (const references of Object.values(artifact.deployedBytecode.immutableReferences ?? {})) {
    for (const { start, length } of references) normalized = `${normalized.slice(0, start * 2)}${"00".repeat(length)}${normalized.slice((start + length) * 2)}`;
  }
  if (keccak256((`0x${normalized}`) as Hex) !== keccak256(artifact.deployedBytecode.object)) throw new Error("Spike normalized runtime codehash mismatch");
  return { runtimeCodehash: keccak256(code), normalizedRuntimeCodehash: keccak256((`0x${normalized}`) as Hex) };
}

function rpcError(error: unknown): Record<string, unknown> {
  const seen = new Set<unknown>();
  let current: unknown = error;
  const chain: Record<string, unknown>[] = [];
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as { code?: unknown; message?: unknown; details?: unknown; cause?: unknown };
    chain.push({
      ...(record.code === undefined ? {} : { code: record.code }),
      ...(record.message === undefined ? {} : { message: record.message }),
      ...(record.details === undefined ? {} : { details: record.details }),
    });
    current = record.cause;
  }
  return { error: String(error), chain };
}

async function attempt(send: () => Promise<Hex>): Promise<RpcOutcome> {
  try {
    return { accepted: true, hash: await send() };
  } catch (error) {
    return { accepted: false, error: rpcError(error) };
  }
}

const addStakeAbi = [{ type: "function", name: "addStake", stateMutability: "payable", inputs: [{ type: "uint32" }], outputs: [] }] as const;

function finding(stage: string, response: unknown) {
  appendFinding({ gate: "G1", stage, response });
}

async function main() {
  const canonicalOnly = process.argv.includes("--canonical");
  const canonicalSubmit = process.argv.includes("--canonical-submit");
  const sidecarOnly = process.argv.includes("--sidecar");
  if (process.argv.includes("--preflight")) {
    const account = privateKeyToAccount(readParticipantKey());
    const readiness = await (canonicalOnly ? preflightCanonical : preflightSidecar)(account.address);
    console.log(JSON.stringify({ ok: true, mode: canonicalOnly ? "canonical" : "sidecar", ...readiness }));
    return;
  }
  if ((canonicalOnly ? 1 : 0) + (canonicalSubmit ? 1 : 0) + (sidecarOnly ? 1 : 0) !== 1) throw new Error("demo:spike requires --canonical, --canonical-submit, or --sidecar");
  const privateKey = readParticipantKey();
  const account = privateKeyToAccount(privateKey);
  const canonicalMode = canonicalOnly || canonicalSubmit;
  const readiness = await (canonicalMode ? preflightCanonical : preflightSidecar)(account.address);
  finding(canonicalMode ? "preflight_canonical" : "preflight_sidecar", readiness);
  const rpcUrl = canonicalMode ? ethrexUrl : gatewayUrl;
  const publicClient: any = createPublicClient({ chain, transport: http(rpcUrl) });
  const walletClient: any = createWalletClient({ account, chain, transport: http(rpcUrl) });
  const artifact = readArtifact();
  let deployHash: Hex;
  let wallet: Address;
  if (canonicalSubmit || sidecarOnly) {
    const saved = JSON.parse(fs.readFileSync(runStatePath, "utf8")) as SpikeState;
    if (!saved.deployHash) throw new Error("resume mode requires a prior canonical deployment state");
    deployHash = saved.deployHash;
    const deployReceipt = await publicClient.getTransactionReceipt({ hash: deployHash });
    if (deployReceipt.status !== "success" || !deployReceipt.contractAddress) throw new Error(`saved Spike deployment is not successful: ${deployHash}`);
    wallet = deployReceipt.contractAddress;
  } else {
    deployHash = await walletClient.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode, account, chain, value: parseEther("0.15"), gas: 6_000_000n, gasPrice: 2_000_000n });
    fs.writeFileSync(runStatePath, JSON.stringify({ deployHash }) + "\n");
    const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash, timeout: 120_000, pollingInterval: 2_000 });
    if (deployReceipt.status !== "success" || !deployReceipt.contractAddress) throw new Error(`Spike deployment failed: ${deployHash}`);
    wallet = deployReceipt.contractAddress;
  }
  const deployedCode = await publicClient.getCode({ address: wallet });
  if (!deployedCode) throw new Error("Spike deployment has no runtime code");
  finding("spike_deploy", { deployHash, wallet, ...assertSpikeRuntime(deployedCode) });
  const signature = (`0x${"00".repeat(2420)}`) as Hex;
  const tx = newTx({
    chainId: BigInt(chain.id),
    sender: wallet,
    nonceSeq: BigInt(await publicClient.getTransactionCount({ address: wallet, blockTag: "latest" })),
    frames: [
      frame(profile, "VERIFY", { scope: "EXECUTION_AND_PAYMENT", target: null, execution: 3_200_000n, data: "0x01" }),
      frame(profile, "SENDER", { target: recipient, execution: 50_000n, state: 200_000n, value: 1_000_000_000n }),
    ],
    signatures: [{ scheme: sigScheme(profile, "ARBITRARY"), signer: "0x", msg: "0x", signature }],
    fees: { maxFeePerGas: 2_000_000_000n },
  });
  const hash = txHash(profile, tx);
  const canonical = await attempt(() => publicClient.request({ method: "eth_sendRawTransaction" as never, params: [encodeTx(profile, tx)] as never }));
  finding("canonical_arbitrary_verify", canonical);
  if (canonicalMode) {
    const raw = JSON.stringify(canonical);
    if (canonical.accepted) throw new Error("canonical ARBITRARY VERIFY frame was unexpectedly accepted");
    if (/nonce|malformed/i.test(raw) || !/(MAX_VERIFY_GAS|GREP-|REPUTATION-)/.test(raw)) throw new Error("canonical rejection was not a budget-type rule");
    console.log(JSON.stringify({ ok: true, mode: "canonical", wallet, deployHash, txHash: hash, canonical }));
    return;
  }
  const sidecar = await attempt(() => publicClient.request({ method: "eth_sendFrameTransaction" as never, params: [toWire(tx)] as never }));
  finding("sidecar_unstaked_arbitrary_verify", sidecar);
  if (canonical.accepted || sidecar.accepted) throw new Error("expected both pre-stake ARBITRARY submissions to reject");

  const stakeTx = await signTx(profile, newTx({
    chainId: BigInt(chain.id),
    sender: wallet,
    nonceSeq: BigInt(await publicClient.getTransactionCount({ address: wallet, blockTag: "latest" })),
    frames: [
      frame(profile, "VERIFY", { scope: "EXECUTION_AND_PAYMENT", target: null, execution: 70_000n }),
      frame(profile, "SENDER", {
        target: stakingRegistry,
        execution: 150_000n,
        state: 300_000n,
        value: parseEther("0.012"),
        data: encodeFunctionData({ abi: addStakeAbi, functionName: "addStake", args: [86_400] }),
      }),
    ],
    signatures: [secp256k1Placeholder(profile, account.address)],
    fees: { maxFeePerGas: 2_000_000_000n },
  }), privateKey);
  const stakeSubmit = await attempt(() => publicClient.request({ method: "eth_sendFrameTransaction" as never, params: [toWire(stakeTx)] as never }));
  finding("self_stake_sender_frame", stakeSubmit);
  if (!stakeSubmit.accepted) throw new Error("self-stake was rejected; no retry performed");
  const stakeReceipt = await publicClient.waitForTransactionReceipt({ hash: stakeSubmit.hash, timeout: 120_000, pollingInterval: 5_000 });
  const stake = await readStake(wallet as Address);
  finding("self_stake_receipt", { receipt: stakeReceipt, stakeWei: stake.toString() });
  if (stakeReceipt.status !== "success" || stake <= parseEther("0.01")) throw new Error(`stake did not settle strictly above 0.01 ETH: ${stake}`);

  const staked = await attempt(() => publicClient.request({ method: "eth_sendFrameTransaction" as never, params: [toWire(tx)] as never }));
  finding("sidecar_staked_arbitrary_verify", staked);
  if (!staked.accepted) throw new Error("staked ARBITRARY submission rejected");
  const statuses = await pollFrameStatus(staked.hash);
  for (const status of statuses) finding("sidecar_staked_status", status);
  const finalStatus = statuses.at(-1);
  if (!/OnChain/.test(JSON.stringify(finalStatus))) throw new Error("staked ARBITRARY frame was not OnChain within five minutes");
  const explorerUrl = `https://explorer.altmempool.wtf/${staked.hash}`;
  finding("explorer_link", { hash: staked.hash, explorerUrl });
  console.log(JSON.stringify({
    ok: true,
    wallet,
    deployHash,
    txHash: hash,
    signatureLayout: { signatureIndex: 0, schemeParam: 1, signatureLengthParam: 3, sigdatacopy: { dataOffset: 0, length: "sigparam(0, SIGNATURE_LENGTH)", signatureIndex: 0 } },
    canonical,
    sidecar,
    stakeSubmit,
    stakeWei: stake.toString(),
    staked,
    finalStatus,
    explorerUrl,
  }));
}

main().catch((error) => {
  const captured = rpcError(error);
  appendFinding({ gate: "G1", error: captured });
  console.log(JSON.stringify({ ok: false, error: captured }));
  process.exitCode = 1;
});
