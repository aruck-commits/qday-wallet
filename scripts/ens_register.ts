import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http, keccak256, toHex, zeroAddress, zeroHash, type Abi, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { getSepoliaRelayerPrivateKey, sepoliaRelayerStatus } from "./lib/env.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const statePath = path.join(root, "tooling/sepolia-deploy-state.json");
const registrationStatePath = path.join(root, "tooling/sepolia-registration-state.json");
const rpcUrl = "https://ethereum-sepolia-rpc.publicnode.com";
const registrar = "0xf633e7fc17e2bbe0d0965d18ec1821dcb754a3d3" as Address;
const mockUsdc = "0x240b0316df57887dbbe58b586508b19e633a14aa" as Address;
const resolver = "0xdc4a563d00f5c3012b699794eb9e13a561be386f" as Address;
const duration = 31_536_000n;
const primary = "qdaywallet";
const optional = "qday";
const plan = ["MockUSDC.mint(relayer, 100e6)", "approve ETHRegistrar", "makeCommitment(wallet owner)", "commit", "wait at least 60 seconds", "register qdaywallet.eth with QDayWallet as owner", "optionally quote qday.eth only if balance covers it"];
const registrarAbi = [
  { type: "function", name: "isAvailable", stateMutability: "view", inputs: [{ type: "string" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "getRegisterPrice", stateMutability: "view", inputs: [{ type: "string" }, { type: "uint64" }, { type: "address" }], outputs: [{ type: "uint256" }, { type: "uint256" }] },
  { type: "function", name: "makeCommitment", stateMutability: "pure", inputs: [{ type: "string" }, { type: "address" }, { type: "bytes32" }, { type: "address" }, { type: "address" }, { type: "uint64" }, { type: "bytes32" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "commit", stateMutability: "nonpayable", inputs: [{ type: "bytes32" }], outputs: [] },
  { type: "function", name: "commitmentAt", stateMutability: "view", inputs: [{ type: "bytes32" }], outputs: [{ type: "uint64" }] },
  { type: "function", name: "register", stateMutability: "nonpayable", inputs: [{ type: "string" }, { type: "address" }, { type: "bytes32" }, { type: "address" }, { type: "address" }, { type: "uint64" }, { type: "address" }, { type: "bytes32" }], outputs: [{ type: "uint256" }] },
] as const satisfies Abi;
const erc20Abi = [
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ type: "address" }, { type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
] as const satisfies Abi;
type DeployState = { wallet?: Address };
type RegistrationState = { label: string; wallet: Address; secret: Hex; commitment: Hex; committedAt?: number; registered?: boolean; txHashes?: Record<string, Hex> };
const json = (v: unknown) => JSON.stringify(v, (_, x) => typeof x === "bigint" ? x.toString() : x);
const read = <T>(file: string): T | undefined => { try { return JSON.parse(fs.readFileSync(file, "utf8")) as T; } catch { return undefined; } };
const write = (file: string, value: unknown) => fs.writeFileSync(file, `${json(value)}\n`);
const appendFinding = (entry: unknown) => fs.appendFileSync(path.join(root, "docs/FINDINGS.md"), `\n- ${json({ gate: "G4", entry })}\n`);

async function main() {
  if (!process.argv.includes("--execute")) {
    console.log(json({ ok: true, executed: false, reviewRequired: true, chainId: sepolia.id, registrar, mockUsdc, plan }));
    return;
  }

  // live run approved 2026-11-06

  const privateKey = getSepoliaRelayerPrivateKey() as Hex;
  const account = privateKeyToAccount(privateKey);
  console.error(sepoliaRelayerStatus());
  const publicClient: any = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const walletClient: any = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) });
  const deploy = read<DeployState>(statePath);
  if (!deploy?.wallet) throw new Error(`Missing deployed QDayWallet in ${statePath}; run deploy:sepolia first`);
  const wallet = deploy.wallet;
  const completed = read<RegistrationState>(registrationStatePath);
  if (completed?.wallet === wallet && completed.registered) {
    console.log(json({ ok: true, alreadyRegistered: true, wallet, label: `${completed.label}.eth`, txHashes: completed.txHashes }));
    return;
  }
  const [available, priceProbe, commitmentProbe] = await Promise.all([
    publicClient.readContract({ address: registrar, abi: registrarAbi, functionName: "isAvailable", args: [primary] }),
    publicClient.readContract({ address: registrar, abi: registrarAbi, functionName: "getRegisterPrice", args: [primary, duration, mockUsdc] }),
    publicClient.readContract({ address: registrar, abi: registrarAbi, functionName: "makeCommitment", args: [primary, wallet, zeroHash, zeroAddress, resolver, duration, zeroHash] }),
  ]);
  if (!available || !priceProbe || !commitmentProbe) throw new Error(`${primary}.eth is not available or registrar probes failed`);
  const [base, premium] = priceProbe;
  const price = base + premium;
  let registration = completed;
  if (!registration || registration.label !== primary || registration.wallet !== wallet || registration.registered) {
    const secret = keccak256(toHex(`${primary}:${wallet}:${Date.now()}:${Math.random()}`));
    const commitment = await publicClient.readContract({ address: registrar, abi: registrarAbi, functionName: "makeCommitment", args: [primary, wallet, secret, zeroAddress, resolver, duration, zeroHash] });
    registration = { label: primary, wallet, secret, commitment, txHashes: {} };
    write(registrationStatePath, registration);
  }
  const txHashes = registration.txHashes ?? {};
  const submit = async (label: string, request: any) => {
    const hash = await walletClient.writeContract(request);
    txHashes[label] = hash;
    registration.txHashes = txHashes;
    write(registrationStatePath, registration);
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000, pollingInterval: 2_000 });
    if (receipt.status !== "success") throw new Error(`${label} reverted: ${hash}`);
    return hash;
  };
  const balanceBeforeMint = await publicClient.readContract({ address: mockUsdc, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
  if (balanceBeforeMint < 100_000_000n) await submit("mint", { address: mockUsdc, abi: erc20Abi, functionName: "mint", args: [account.address, 100_000_000n], account });
  const balanceAfterMint = await publicClient.readContract({ address: mockUsdc, abi: erc20Abi, functionName: "balanceOf", args: [account.address] });
  if (balanceAfterMint < price) throw new Error(`MockUSDC balance ${balanceAfterMint} does not cover primary price ${price}`);
  const allowance = await publicClient.readContract({ address: mockUsdc, abi: erc20Abi, functionName: "allowance", args: [account.address, registrar] });
  if (allowance < price) await submit("approve", { address: mockUsdc, abi: erc20Abi, functionName: "approve", args: [registrar, price], account });
  let committedAt = await publicClient.readContract({ address: registrar, abi: registrarAbi, functionName: "commitmentAt", args: [registration.commitment] });
  if (committedAt === 0n) {
    await submit("commit", { address: registrar, abi: registrarAbi, functionName: "commit", args: [registration.commitment], account });
    committedAt = await publicClient.readContract({ address: registrar, abi: registrarAbi, functionName: "commitmentAt", args: [registration.commitment] });
    if (committedAt === 0n) throw new Error("commitment was not recorded");
  }
  registration.committedAt = Number(committedAt);
  registration.txHashes = txHashes;
  write(registrationStatePath, registration);
  const block = await publicClient.getBlock();
  const waitMs = Math.max(0, Number((committedAt + 60n - BigInt(block.timestamp)) * 1000n));
  if (waitMs > 0) await new Promise((resolve) => setTimeout(resolve, waitMs + 1_000));
  await submit("register", { address: registrar, abi: registrarAbi, functionName: "register", args: [primary, wallet, registration.secret, zeroAddress, resolver, duration, mockUsdc, zeroHash], account });
  registration.registered = true;
  registration.txHashes = txHashes;
  write(registrationStatePath, registration);
  const [optionalAvailable, optionalQuote, balanceAfterPrimary] = await Promise.all([
    publicClient.readContract({ address: registrar, abi: registrarAbi, functionName: "isAvailable", args: [optional] }),
    publicClient.readContract({ address: registrar, abi: registrarAbi, functionName: "getRegisterPrice", args: [optional, duration, mockUsdc] }).catch(() => undefined),
    publicClient.readContract({ address: mockUsdc, abi: erc20Abi, functionName: "balanceOf", args: [account.address] }),
  ]);
  const optionalPrice = optionalQuote ? optionalQuote[0] + optionalQuote[1] : undefined;
  const optionalResult = { label: `${optional}.eth`, available: optionalAvailable, price: optionalPrice, balance: balanceAfterPrimary, attempted: false, reason: optionalPrice && balanceAfterPrimary >= optionalPrice ? "not required after primary registration" : "not covered by remaining MockUSDC" };
  const result = { wallet, label: `${primary}.eth`, registrar, mockUsdc, price, txHashes, optional: optionalResult };
  appendFinding({ stage: "ens_registered", result });
  console.log(json({ ok: true, chainId: sepolia.id, ...result }));
}
main().catch((error) => { console.log(json({ ok: false, error: error instanceof Error ? error.message : String(error) })); process.exitCode = 1; });
