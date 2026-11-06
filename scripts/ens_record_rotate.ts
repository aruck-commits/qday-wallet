import fs from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, decodeAbiParameters, encodeFunctionData, http, namehash, parseAbiParameters, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { ml_dsa44 } from "@noble/post-quantum/ml-dsa.js";
import { getSepoliaRelayerPrivateKey } from "./lib/env.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rpc = "https://ethereum-sepolia-rpc.publicnode.com";
const wallet = "0xe104a972a2d18a09744b66fb5886f5271a5cc9b0" as Address;
const resolver = "0x863b62fA8988Ba340C24F389FFDF568b3ccbc8e4" as Address;
const universal = "0x24e1d8e068620b647ca097f961a61055f4f42d72" as Address;
const name = "qdaywallet.eth";
const dns = (n: string): Hex => `0x${n.split(".").map((p) => `${p.length.toString(16).padStart(2, "0")}${Buffer.from(p).toString("hex")}`).join("")}00`;
const stateFile = path.join(root, "docs/ens-resolver.json");

const pub = createPublicClient({ chain: sepolia, transport: http(rpc) });
const relayer = createWalletClient({ account: privateKeyToAccount(getSepoliaRelayerPrivateKey() as Hex), chain: sepolia, transport: http(rpc) });
const newKey = ml_dsa44.keygen(new Uint8Array(32).fill(7));
const onChainPk = (await pub.readContract({ address: wallet, abi: [{ type: "function", name: "pqPublicKey", stateMutability: "view", inputs: [], outputs: [{ type: "bytes" }] }], functionName: "pqPublicKey" })) as Hex;
if (onChainPk.toLowerCase() !== `0x${Buffer.from(newKey.publicKey).toString("hex")}`) throw new Error("reproduced key does not match the wallet's on-chain key");

const value = `sha256:${createHash("sha256").update(newKey.publicKey).digest("hex")}`;
const abi = [
  { type: "function", name: "currentIntent", stateMutability: "view", inputs: [{ type: "address" }, { type: "bytes" }, { type: "uint256" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "executePq", stateMutability: "payable", inputs: [{ type: "bytes32" }, { type: "bytes" }, { type: "address" }, { type: "bytes" }, { type: "uint256" }], outputs: [{ type: "bytes" }] },
] as const;
const setText = encodeFunctionData({ abi: [{ type: "function", name: "setText", stateMutability: "nonpayable", inputs: [{ type: "bytes" }, { type: "string" }, { type: "string" }], outputs: [] }], functionName: "setText", args: [dns(name), "pq-key", value] });
const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
const intent = (await pub.readContract({ address: wallet, abi, functionName: "currentIntent", args: [resolver, setText, deadline] })) as Hex;
const sig = ml_dsa44.sign(Buffer.from(intent.slice(2), "hex"), newKey.secretKey);
const hash = await relayer.writeContract({ address: wallet, abi, functionName: "executePq", args: [intent, `0x${Buffer.from(sig).toString("hex")}`, resolver, setText, deadline] });
const receipt = await pub.waitForTransactionReceipt({ hash });
if (receipt.status !== "success") throw new Error(`executePq reverted: ${hash}`);

const universalAbi = [{ type: "function", name: "resolve", stateMutability: "view", inputs: [{ type: "bytes" }, { type: "bytes" }], outputs: [{ type: "bytes" }, { type: "address" }] }] as const;
const textData = encodeFunctionData({ abi: [{ type: "function", name: "text", stateMutability: "view", inputs: [{ type: "bytes32" }, { type: "string" }], outputs: [{ type: "string" }] }], functionName: "text", args: [namehash(name), "pq-key"] });
const [resolved] = await pub.readContract({ address: universal, abi: universalAbi, functionName: "resolve", args: [dns(name), textData] });
const [readBack] = decodeAbiParameters(parseAbiParameters("string"), resolved);
if (readBack !== value) throw new Error(`readback mismatch: ${readBack}`);

const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));
state.value = value;
state.readBack = readBack;
state.steps.setTextAfterRotation = hash;
state.rotation.note = "Rotation confirmed on-chain. pq-key text record updated after rotation: value is sha256 of the new ML-DSA-44 public key. The earlier record value was sha256 of the pre-rotation secret.";
fs.writeFileSync(stateFile, `${JSON.stringify(state, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, value, readBack, txHash: hash }));
