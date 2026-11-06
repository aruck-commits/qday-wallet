import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, defineChain, encodeFunctionData, http, type Address, type Hex } from "viem";

export const ethrexUrl = "https://altmempool.forshtat.com";
export const gatewayUrl = "https://altmempoolgateway.forshtat.com/rpc";
export const stakingRegistry = "0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f" as Address;
export const minimumBalance = 150_000_000_000_000_000n;
export const minimumStake = 10_000_000_000_000_000n;
const chain = defineChain({ id: 1337, name: "EIP-8141 Workshop Devnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [ethrexUrl] } } });
export const ethrex = createPublicClient({ chain, transport: http(ethrexUrl) });
export const gateway = createPublicClient({ chain, transport: http(gatewayUrl) });

export async function preflight(payer: Address) {
  const firstBlock = await ethrex.getBlockNumber();
  await new Promise((resolve) => setTimeout(resolve, 15_000));
  const [block, balance, peers] = await Promise.all([
    ethrex.getBlockNumber(), ethrex.getBalance({ address: payer }), gateway.request({ method: "skandha_explorer_peers" as never, params: [] as never }),
  ]);
  const peerCount = Array.isArray(peers) ? peers.length : peers && typeof peers === "object" ? Object.keys(peers).length : 0;
  const result = { firstBlock: firstBlock.toString(), block: block.toString(), balance: balance.toString(), peerCount, payer };
  if (block <= firstBlock) throw new Error(`ethrex stalled: ${firstBlock} -> ${block}; aborting`);
  if (balance < minimumBalance) throw new Error(`payer balance ${balance} below ${minimumBalance}`);
  if (peerCount === 0) throw new Error("gateway→miner p2p down (Oct-24 signature), aborting");
  return result;
}

export async function readStake(wallet: Address) {
  const data = encodeFunctionData({ abi: [{ type: "function", name: "getDepositInfo", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }, { type: "uint32" }, { type: "uint64" }], stateMutability: "view" }], functionName: "getDepositInfo", args: [wallet] });
  const raw = await ethrex.call({ to: stakingRegistry, data });
  return BigInt(raw.data?.slice(0, 66) ?? "0x0");
}

export async function postResumePrepare(payer: Address, wallet: Address) {
  const ready = await preflight(payer); const stake = await readStake(wallet);
  if (stake <= minimumStake) throw new Error(`stake ${stake} must be strictly greater than ${minimumStake}`);
  return { ...ready, stake: stake.toString(), wallet };
}

export async function recoverIfReset(_payer: Address) {
  throw new Error("recovery writes are disabled until explicit resume execution authorization");
}

export async function submitWithResubmit(_payload: unknown) {
  throw new Error("gateway submissions are disabled until explicit resume execution authorization");
}

export async function simulateFallback(rawFrame: Hex) {
  const response = await ethrex.request({ method: "ethrex_simulateFrameTransaction" as never, params: [rawFrame] as never });
  appendFinding({ gate: "G1", simulateFallback: response });
  return response;
}

export function appendFinding(entry: unknown) {
  const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../docs/FINDINGS.md");
  fs.appendFileSync(file, `\n- ${JSON.stringify(entry)}\n`);
}

export async function pollFrameStatus(hash: `0x${string}`) {
  const statuses: unknown[] = [];
  for (let index = 0; index < 60; index++) {
    const status = await gateway.request({ method: "skandha_frameTransactionStatus" as never, params: [hash] as never });
    statuses.push(status);
    const text = JSON.stringify(status);
    if (/Cancelled|Expired|OnChain/.test(text)) break;
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }
  return statuses;
}
