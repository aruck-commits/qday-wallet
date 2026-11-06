import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, decodeAbiParameters, encodeFunctionData, http, keccak256, namehash, parseAbiParameters, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { ml_dsa44 } from "@noble/post-quantum/ml-dsa.js";
import { getSepoliaRelayerPrivateKey } from "./lib/env.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rpc = "https://ethereum-sepolia-rpc.publicnode.com";
const resolver = "0xdc4a563d00f5c3012b699794eb9e13a561be386f" as Address;
const universal = "0x24e1d8e068620b647ca097f961a61055f4f42d72" as Address;
const walletState = JSON.parse(fs.readFileSync(path.join(root, "tooling/sepolia-deploy-state.json"), "utf8")) as { wallet: Address };
const fixture = JSON.parse(fs.readFileSync(path.join(root, "contracts/test/fixtures/pq.json"), "utf8")) as { testKeySecret: Hex };
const walletAbi = [{ type: "function", name: "currentIntent", stateMutability: "view", inputs: [{ type: "address" }, { type: "bytes" }, { type: "uint256" }], outputs: [{ type: "bytes32" }] }, { type: "function", name: "executePq", stateMutability: "payable", inputs: [{ type: "bytes32" }, { type: "bytes" }, { type: "address" }, { type: "bytes" }, { type: "uint256" }], outputs: [{ type: "bytes" }] }] as const;
const resolverAbi = [{ type: "function", name: "setText", stateMutability: "nonpayable", inputs: [{ type: "bytes32" }, { type: "string" }, { type: "string" }], outputs: [] }] as const;
const universalAbi = [{ type: "function", name: "resolve", stateMutability: "view", inputs: [{ type: "bytes" }, { type: "bytes" }], outputs: [{ type: "bytes" }, { type: "address" }] }] as const;
const dns = (name: string): Hex => `0x${name.split(".").map((part) => `${part.length.toString(16).padStart(2, "0")}${Buffer.from(part).toString("hex")}`).join("")}00`;
const out = (v: unknown) => JSON.stringify(v, (_, x) => typeof x === "bigint" ? x.toString() : x);
const findings = (entry: unknown) => fs.appendFileSync(path.join(root, "docs/FINDINGS.md"), `\n- ${out({ gate: "G4", stage: "ens_write", entry })}\n`);

async function main() {
  const publicClient: any = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const account = privateKeyToAccount(getSepoliaRelayerPrivateKey() as Hex);
  const balance = await publicClient.getBalance({ address: account.address });
  if (balance <= 20_000_000_000_000_000n) throw new Error(`relayer balance ${balance} is not above 0.02 ETH`);
  const name = dns("qdaywallet.eth");
  const node = namehash("qdaywallet.eth");
  const value = `sha256:${createHash("sha256").update(Buffer.from(fixture.testKeySecret.slice(2), "hex")).digest("hex")}`;
  const callData = encodeFunctionData({ abi: resolverAbi, functionName: "setText", args: [node, "pq-key", value] });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
  const intent = await publicClient.readContract({ address: walletState.wallet, abi: walletAbi, functionName: "currentIntent", args: [resolver, callData, deadline] });
  const sig = ml_dsa44.sign(Buffer.from((intent as Hex).slice(2), "hex"), Buffer.from(fixture.testKeySecret.slice(2), "hex"));
  const hash = await createWalletClient({ account, chain: sepolia, transport: http(rpc) }).writeContract({ address: walletState.wallet, abi: walletAbi, functionName: "executePq", args: [intent, `0x${Buffer.from(sig).toString("hex")}`, resolver, callData, deadline] });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const resolveData = encodeFunctionData({ abi: [{ type: "function", name: "text", inputs: [{ type: "bytes" }, { type: "string" }], outputs: [{ type: "string" }], stateMutability: "view" }] as const, functionName: "text", args: [name, "pq-key"] });
  const [resolved] = await publicClient.readContract({ address: universal, abi: universalAbi, functionName: "resolve", args: [name, resolveData] });
  const [readValue] = decodeAbiParameters(parseAbiParameters("string"), resolved);
  if (readValue !== value) throw new Error(`ENS text mismatch: ${readValue}`);
  const result = { ok: receipt.status === "success", wallet: walletState.wallet, digest: intent, value, txHash: hash, txUrl: `https://sepolia.etherscan.io/tx/${hash}`, readBack: readValue };
  findings(result); console.log(out(result));
}
main().catch((error) => { const result = { ok: false, error: error instanceof Error ? error.message : String(error) }; findings(result); console.log(out(result)); process.exitCode = 1; });
