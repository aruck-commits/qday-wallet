import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient, createWalletClient, http, type Abi, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { getSepoliaRelayerPrivateKey, sepoliaRelayerStatus } from "./lib/env.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const statePath = path.join(root, "tooling/sepolia-deploy-state.json");
const fixturePath = path.join(root, "test/fixtures/pq.json");
const rpcUrl = "https://ethereum-sepolia-rpc.publicnode.com";
const plan = ["deploy MLDSAKeyFactory", "deploy MLDSAVerifier(factory)", "deploy QDayWallet(relayer, verifier, fixture pk)", "assert code at each address"];
type Artifact = { abi: Abi; bytecode: { object: Hex } };
type State = { factory?: Address; verifier?: Address; wallet?: Address; txHashes?: Record<string, Hex> };
const json = (v: unknown) => JSON.stringify(v, (_, x) => typeof x === "bigint" ? x.toString() : x);
const artifact = (name: string) => JSON.parse(fs.readFileSync(path.join(root, "contracts/out", `${name}.sol`, `${name}.json`), "utf8")) as Artifact;
const readState = (): State => { try { return JSON.parse(fs.readFileSync(statePath, "utf8")) as State; } catch { return {}; } };
const writeState = (state: State) => fs.writeFileSync(statePath, `${json(state)}\n`);
const appendFinding = (entry: unknown) => fs.appendFileSync(path.join(root, "docs/FINDINGS.md"), `\n- ${json({ gate: "G4", entry })}\n`);

async function main() {
  if (!process.argv.includes("--execute")) {
    console.log(json({ ok: true, executed: false, reviewRequired: true, chainId: sepolia.id, rpcUrl, plan }));
    return;
  }

  // Review lock: remove only with the separately committed live-run authorization.
  throw new Error("Sepolia deployment remains review-locked");

  const privateKey = getSepoliaRelayerPrivateKey() as Hex;
  const account = privateKeyToAccount(privateKey);
  console.error(sepoliaRelayerStatus());
  const publicClient: any = createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  const walletClient: any = createWalletClient({ account, chain: sepolia, transport: http(rpcUrl) });
  const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8")) as { pk: Hex };
  if ((fixture.pk.length - 2) / 2 !== 1312) throw new Error("fixture ML-DSA public key must be 1312 bytes");
  const previous = readState();
  const txHashes = previous.txHashes ?? {};
  const deploy = async (label: string, contract: Artifact, args: readonly unknown[], existing?: Address): Promise<Address> => {
    if (existing && !process.argv.includes("--fresh")) {
      const code = await publicClient.getCode({ address: existing });
      if (code && code !== "0x") return existing;
    }
    const hash = await walletClient.deployContract({ abi: contract.abi, bytecode: contract.bytecode.object, args: args as never });
    txHashes[label] = hash;
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 180_000, pollingInterval: 2_000 });
    if (receipt.status !== "success" || !receipt.contractAddress) throw new Error(`${label} deployment failed: ${hash}`);
    const code = await publicClient.getCode({ address: receipt.contractAddress });
    if (!code || code === "0x") throw new Error(`${label} receipt has no deployed code: ${hash}`);
    return receipt.contractAddress;
  };
  const factory = await deploy("factory", artifact("MLDSAKeyFactory"), [], previous.factory);
  const verifier = await deploy("verifier", artifact("MLDSAVerifier"), [factory], previous.verifier);
  const wallet = await deploy("wallet", artifact("QDayWallet"), [account.address, verifier, fixture.pk], previous.wallet);
  const result = { factory, verifier, wallet, txHashes, relayer: account.address };
  writeState(result);
  appendFinding({ stage: "sepolia_stack_deployed", result });
  console.log(json({ ok: true, chainId: sepolia.id, ...result }));
}
main().catch((error) => { console.log(json({ ok: false, error: error instanceof Error ? error.message : String(error) })); process.exitCode = 1; });
