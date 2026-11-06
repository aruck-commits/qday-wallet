import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, decodeAbiParameters, encodeFunctionData, http, namehash, parseAbiParameters, toFunctionSelector, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { ml_dsa44 } from "@noble/post-quantum/ml-dsa.js";
import { getSepoliaRelayerPrivateKey } from "./lib/env.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rpc = "https://ethereum-sepolia-rpc.publicnode.com";
const name = "qdaywallet.eth";
const label = "qdaywallet";
const factory = "0xda70306c98e97ece36f997a21368e53298572991" as Address;
const implementation = "0x115eb53f0c60696633855f90b138178fb40b2b2c" as Address;
const registry = "0xd4ebcbbdf463c9c45784603db0ddd499bc44a8b4" as Address;
const universal = "0x24e1d8e068620b647ca097f961a61055f4f42d72" as Address;
const salt = 1n;
const ROLE_SET_TEXT_ADMIN = 1n << 132n;
const KEY = "pq-key";
const walletState = JSON.parse(fs.readFileSync(path.join(root, "tooling/sepolia-deploy-state.json"), "utf8")) as { wallet: Address };
const fixture = JSON.parse(fs.readFileSync(path.join(root, "contracts/test/fixtures/pq.json"), "utf8")) as { testKeySecret: Hex };
const stateFile = path.join(root, "tooling/sepolia-ens-resolver-state.json");
const state = (fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile, "utf8")) : {}) as { resolver?: Address; steps?: Record<string, string> };

const out = (v: unknown) => JSON.stringify(v, (_, x) => (typeof x === "bigint" ? x.toString() : x));
const findings = (entry: unknown) => fs.appendFileSync(path.join(root, "docs/FINDINGS.md"), `\n- ${out({ gate: "G4", stage: "ens_resolver", entry })}\n`);
const dns = (n: string): Hex => `0x${n.split(".").map((part) => `${part.length.toString(16).padStart(2, "0")}${Buffer.from(part).toString("hex")}`).join("")}00`;

const factoryAbi = [
  { type: "function", name: "deployProxy", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }, { type: "bytes" }], outputs: [{ type: "address" }] },
  { type: "function", name: "predictProxyAddress", stateMutability: "view", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "address" }] },
] as const;
const resolverAbi = [
  { type: "function", name: "initialize", stateMutability: "nonpayable", inputs: [{ name: "grants", type: "tuple[]", components: [{ name: "account", type: "address" }, { name: "roleBitmap", type: "uint256" }] }, { name: "calls", type: "bytes[]" }], outputs: [] },
  { type: "function", name: "grantSetterRoles", stateMutability: "nonpayable", inputs: [{ type: "bytes" }, { type: "address" }], outputs: [] },
  { type: "function", name: "setText", stateMutability: "nonpayable", inputs: [{ type: "bytes" }, { type: "string" }, { type: "string" }], outputs: [] },
] as const;
const registryAbi = [
  { type: "function", name: "findTokenId", stateMutability: "view", inputs: [{ type: "string" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "getResolver", stateMutability: "view", inputs: [{ type: "string" }], outputs: [{ type: "address" }] },
  { type: "function", name: "setResolver", stateMutability: "nonpayable", inputs: [{ type: "uint256" }, { type: "address" }], outputs: [] },
] as const;
const walletAbi = [
  { type: "function", name: "currentIntent", stateMutability: "view", inputs: [{ type: "address" }, { type: "bytes" }, { type: "uint256" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "executePq", stateMutability: "payable", inputs: [{ type: "bytes32" }, { type: "bytes" }, { type: "address" }, { type: "bytes" }, { type: "uint256" }], outputs: [{ type: "bytes" }] },
] as const;
const universalAbi = [{ type: "function", name: "resolve", stateMutability: "view", inputs: [{ type: "bytes" }, { type: "bytes" }], outputs: [{ type: "bytes" }, { type: "address" }] }] as const;
const textAbi = [{ type: "function", name: "text", stateMutability: "view", inputs: [{ type: "bytes32" }, { type: "string" }], outputs: [{ type: "string" }] }] as const;

async function main() {
  const publicClient: any = createPublicClient({ chain: sepolia, transport: http(rpc) });
  const account = privateKeyToAccount(getSepoliaRelayerPrivateKey() as Hex);
  const wallet = createWalletClient({ account, chain: sepolia, transport: http(rpc) });
  const walletAddr = walletState.wallet;
  const value = `sha256:${createHash("sha256").update(Buffer.from(fixture.testKeySecret.slice(2), "hex")).digest("hex")}`;

  const implCode = (await publicClient.getCode({ address: implementation })) ?? "0x";
  const initSelector = toFunctionSelector("initialize((address,uint256)[],bytes[])").slice(2);
  if (!implCode.includes(initSelector)) throw new Error("implementation does not expose the expected initialize selector");

  // Stage A: deploy our own Permissioned Resolver proxy. The relayer is the initial admin with text-admin rights.
  const predicted = (await publicClient.readContract({ address: factory, abi: factoryAbi, functionName: "predictProxyAddress", args: [account.address, salt] })) as Address;
  if (!(await publicClient.getCode({ address: predicted }))) {
    const data = encodeFunctionData({ abi: resolverAbi, functionName: "initialize", args: [[{ account: account.address, roleBitmap: ROLE_SET_TEXT_ADMIN }], []] });
    const hash = await wallet.writeContract({ address: factory, abi: factoryAbi, functionName: "deployProxy", args: [implementation, salt, data] });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`resolver deploy reverted: ${hash}`);
    state.steps = { ...state.steps, deployProxy: hash };
  }
  state.resolver = predicted;

  // Stage B: grant the wallet ROLE_SET_TEXT for the "pq-key" text key only (argument-scoped grant).
  const setterCall = encodeFunctionData({ abi: resolverAbi, functionName: "setText", args: [dns(name), KEY, ""] });
  const hashB = await wallet.writeContract({ address: predicted, abi: resolverAbi, functionName: "grantSetterRoles", args: [setterCall, walletAddr] });
  const receiptB = await publicClient.waitForTransactionReceipt({ hash: hashB });
  if (receiptB.status !== "success") throw new Error(`grantSetterRoles reverted: ${hashB}`);
  state.steps = { ...state.steps, grantSetterRoles: hashB };

  // Stage C + D: the wallet (name owner) points the name at our resolver, then writes the record, both through executePq.
  const tokenId = (await publicClient.readContract({ address: registry, abi: registryAbi, functionName: "findTokenId", args: [label] })) as bigint;
  const pq = async (target: Address, callData: Hex) => {
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const intent = (await publicClient.readContract({ address: walletAddr, abi: walletAbi, functionName: "currentIntent", args: [target, callData, deadline] })) as Hex;
    const sig = ml_dsa44.sign(Buffer.from(intent.slice(2), "hex"), Buffer.from(fixture.testKeySecret.slice(2), "hex"));
    const hash = await wallet.writeContract({ address: walletAddr, abi: walletAbi, functionName: "executePq", args: [intent, `0x${Buffer.from(sig).toString("hex")}`, target, callData, deadline] });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`executePq reverted: ${hash}`);
    return { hash, intent };
  };

  const currentResolver = (await publicClient.readContract({ address: registry, abi: registryAbi, functionName: "getResolver", args: [label] })) as Address;
  if (currentResolver.toLowerCase() !== predicted.toLowerCase()) {
    const callData = encodeFunctionData({ abi: registryAbi, functionName: "setResolver", args: [tokenId, predicted] });
    const { hash } = await pq(registry, callData);
    state.steps = { ...state.steps, setResolver: hash };
  }

  const callText = encodeFunctionData({ abi: resolverAbi, functionName: "setText", args: [dns(name), KEY, value] });
  const written = await pq(predicted, callText);
  state.steps = { ...state.steps, setText: written.hash };

  // Read back through the Universal Resolver, never a hard-coded address.
  const resolveData = encodeFunctionData({ abi: textAbi, functionName: "text", args: [namehash(name), KEY] });
  const [resolved] = await publicClient.readContract({ address: universal, abi: universalAbi, functionName: "resolve", args: [dns(name), resolveData] });
  const [readValue] = decodeAbiParameters(parseAbiParameters("string"), resolved);
  if (readValue !== value) throw new Error(`ENS text mismatch: ${readValue}`);

  fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
  const result = { ok: true, name, resolver: predicted, wallet: walletAddr, tokenId, digest: written.intent, value, readBack: readValue, steps: state.steps, txUrls: Object.fromEntries(Object.entries(state.steps ?? {}).map(([k, h]) => [k, `https://sepolia.etherscan.io/tx/${h}`])) };
  findings(result);
  console.log(out(result));
}

main().catch((error) => {
  const result = { ok: false, error: error instanceof Error ? error.message : String(error) };
  findings(result);
  console.log(out(result));
  process.exitCode = 1;
});
