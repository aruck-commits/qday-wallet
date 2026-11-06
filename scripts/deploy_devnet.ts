import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, defineChain, http, keccak256, type Abi, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { appendFinding, ethrexUrl, devnetChainId } from "./lib/devnet.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const statePath = path.join(root, "tooling/mempool-workshop/.qday-deploy-state.json");
const fixturePath = path.join(root, "contracts/test/fixtures/pq.json");
const workshopPath = path.join(root, "tooling/mempool-workshop/.workshop-state.json");
const observedFactory = "0xa37d3a42c4117bafe189dd21b6170a96f17406b3" as Address;
const observedVerifier = "0x17b01049d4790091ac911ead126337abae1517e4" as Address;
const observedWallet = "0xc5a8cb266cf7f56dcf017a5f766bf927c189091f" as Address;
const observedTxHashes: Record<string, Hex> = {
  MLDSAKeyFactory: "0x0d85e0dcab5b296c02356bd9efc46d380721362d70d5d860d85dcf45cf107b21",
  MLDSAVerifier: "0xc340e9ac36c0c1faf2cf5231b81b27464ea80afd18318f6efd24b32de3dfb00d",
  registerA: "0xc6fad77d74ac18a9a7afa91e048b044b554dba2263661ad62791ad9009279452",
  registerT: "0x24ce10d1dfda5e2d6bb251020730fc42581a016bb1c3ef424140aa7872055060",
  QDayWallet: "0xb83ab344ad0ebacf39721ac0d236a9e76d798e95f66f18d5ff0e41fc424b56cf",
};
const chain = defineChain({ id: devnetChainId, name: "EIP-8141 Workshop Devnet", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [ethrexUrl] } } });
type Artifact = { abi: Abi; bytecode: { object: Hex } };
type State = { factory?: Address; verifier?: Address; wallet?: Address; participant?: Address; txHashes?: Record<string, Hex>; registry?: { a?: Address; t?: Address }; liveness?: { before: string; after: string } };
const json = (value: unknown) => JSON.stringify(value, (_, v) => typeof v === "bigint" ? v.toString() : v);
const artifact = (name: string) => JSON.parse(fs.readFileSync(path.join(root, "contracts/out", `${name}.sol`, `${name}.json`), "utf8")) as Artifact;
const writeState = (state: State) => fs.writeFileSync(statePath, `${json(state)}\n`);
const readParticipant = (): Hex => (JSON.parse(fs.readFileSync(workshopPath, "utf8")) as { participantKey?: Hex }).participantKey ?? (() => { throw new Error("Missing participantKey in workshop state"); })();

async function main() {
  if (!process.argv.includes("--fresh")) throw new Error("deploy:devnet requires --fresh for this execution plan");
  const account = privateKeyToAccount(readParticipant());
  const publicClient: any = createPublicClient({ chain, transport: http(ethrexUrl) });
  const walletClient: any = createWalletClient({ account, chain, transport: http(ethrexUrl) });
  const before = await publicClient.getBlockNumber();
  await new Promise((resolve) => setTimeout(resolve, 15_000));
  const after = await publicClient.getBlockNumber();
  const balance = await publicClient.getBalance({ address: account.address });
  if (after <= before) throw new Error(`ethrex stalled: ${before} -> ${after}; aborting`);
  if (balance < 200_000_000_000_000_000n) throw new Error(`participant balance ${balance} below 0.2 ETH`);
  const state: State = { participant: account.address, txHashes: { ...observedTxHashes }, liveness: { before: before.toString(), after: after.toString() } };
  const deploy = async (name: string, args: readonly unknown[], value = 0n): Promise<Address> => {
    const a = artifact(name);
    const gas = name === "MLDSAKeyFactory" ? 50_000_000n : name === "MLDSAVerifier" ? 40_000_000n : 18_000_000n;
    const hash = await walletClient.deployContract({ abi: a.abi, bytecode: a.bytecode.object, args: args as never, value, gas, gasPrice: 2_000_000n });
    state.txHashes![name] = hash;
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000, pollingInterval: 2_000 });
    if (receipt.status !== "success" || !receipt.contractAddress) throw new Error(`${name} deployment failed: ${hash}`);
    const code = await publicClient.getCode({ address: receipt.contractAddress });
    if (!code || code === "0x") throw new Error(`${name} has no code: ${receipt.contractAddress}`);
    return receipt.contractAddress;
  };
  const observedCode = await publicClient.getCode({ address: observedFactory });
  state.factory = observedCode && observedCode !== "0x" ? observedFactory : await deploy("MLDSAKeyFactory", []);
  const verifierCode = await publicClient.getCode({ address: observedVerifier });
  state.verifier = verifierCode && verifierCode !== "0x" ? observedVerifier : await deploy("MLDSAVerifier", [state.factory]);
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as { pk: Hex };
  const factoryAbi = artifact("MLDSAKeyFactory").abi;
  const registryReadAbi = [{ type: "function", name: "aPartAddress", stateMutability: "view", inputs: [{ type: "uint8" }, { type: "bytes32" }, { type: "uint256" }], outputs: [{ type: "address" }] }, { type: "function", name: "addressesOf", stateMutability: "view", inputs: [{ type: "uint8" }, { type: "bytes32" }], outputs: [{ type: "address" }, { type: "address" }] }] as const;
  const pkHash = keccak256(fixture.pk);
  const register = async (name: "registerA" | "registerT") => {
    const existing = name === "registerA"
      ? await publicClient.readContract({ address: state.factory!, abi: registryReadAbi, functionName: "aPartAddress", args: [0, pkHash, 0] })
      : (await publicClient.readContract({ address: state.factory!, abi: registryReadAbi, functionName: "addressesOf", args: [0, pkHash] }))[1];
    if (existing !== "0x0000000000000000000000000000000000000000") return;
    const hash = await walletClient.writeContract({ address: state.factory!, abi: factoryAbi, functionName: name, args: [0, fixture.pk], gas: name === "registerA" ? 25_000_000n : 12_000_000n, gasPrice: 2_000_000n });
    state.txHashes![name] = hash;
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000, pollingInterval: 2_000 });
    if (receipt.status !== "success") throw new Error(`${name} failed: ${hash}`);
  };
  await register("registerA");
  await register("registerT");
  const walletCode = await publicClient.getCode({ address: observedWallet });
  state.wallet = walletCode && walletCode !== "0x" ? observedWallet : await deploy("QDayWallet", [account.address, state.verifier, fixture.pk], 150_000_000_000_000_000n);
  state.registry = { a: await publicClient.readContract({ address: state.factory, abi: registryReadAbi, functionName: "aPartAddress", args: [0, pkHash, 0] }), t: (await publicClient.readContract({ address: state.factory, abi: registryReadAbi, functionName: "addressesOf", args: [0, pkHash] }))[1] };
  if (state.registry.a === "0x0000000000000000000000000000000000000000" || state.registry.t === "0x0000000000000000000000000000000000000000") throw new Error("precompute registry readback was empty");
  writeState(state);
  appendFinding({ gate: "G3", stage: "deploy_and_precompute", result: state });
  console.log(json({ ok: true, chainId: devnetChainId, ...state }));
}
main().catch((error) => { const result = { ok: false, error: error instanceof Error ? error.message : String(error) }; appendFinding({ gate: "G3", stage: "deploy_and_precompute_error", result }); console.log(json(result)); process.exitCode = 1; });
