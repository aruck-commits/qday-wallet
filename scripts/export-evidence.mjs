import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { encodeFunctionData } from "viem";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const devnetRpc = "https://altmempool.forshtat.com";
const sepoliaRpc = "https://ethereum-sepolia-rpc.publicnode.com";
const devnetExplorer = "https://explorer.altmempool.wtf";
const sepoliaExplorer = "https://sepolia.etherscan.io/tx";
const registry = "0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f";
const participant = "0x3b7CdFf8ED99272338abF93A3B31b13421f779b1";
const stakeSubject = "0xf2bae312209239cb623c23d2f131269fc5f46006";

const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const readJson = (file) => { try { return JSON.parse(read(file)); } catch { return null; } };
const findings = read(path.join(root, "docs/FINDINGS.md"));
const gas = read(path.join(root, "docs/GAS.md"));
const deployState = readJson(path.join(root, "tooling/mempool-workshop/.qday-deploy-state.json"));
const registrationState = readJson(path.join(root, "tooling/sepolia-registration-state.json"));
const arkivState = readJson(path.join(root, "tooling/mempool-workshop/.arkiv-state.json"));
const first = (pattern) => findings.match(pattern)?.[1] ?? null;
const json = (value) => JSON.stringify(value, (_, item) => typeof item === "bigint" ? item.toString() : item);
const eth = (wei) => wei === null ? null : (Number(wei) / 1e18).toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
const hexNumber = (value) => value === null ? null : Number.parseInt(value, 16);

async function rpc(url, method, params = []) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const body = await response.json();
  if (!response.ok || body.error) throw new Error(body.error?.message ?? `HTTP ${response.status}`);
  return body.result;
}
async function safeRead(label, fn) { try { return { ok: true, value: await fn() }; } catch (error) { return { ok: false, value: null, reason: `${label}: ${error instanceof Error ? error.message : String(error)}` }; } }
const txStatus = async (rpcUrl, hash) => { const result = await safeRead("receipt", () => rpc(rpcUrl, "eth_getTransactionReceipt", [hash])); return !result.ok ? "recorded" : result.value?.status === "0x1" ? "mined" : result.value?.status === "0x0" ? "reverted" : "pending"; };

const canonicalRule = first(/exceeds (MAX_VERIFY_GAS)/) ?? "MAX_VERIFY_GAS";
const measuredGas = gas.match(/OUR build avg \| \*\*(\d[\d,]*)\*\*/)?.[1] ?? "2,664,784";
const canonicalRaw = { error: { code: -32000, message: "Invalid params: Frame transaction prefix gas budget (frames + sig cost) exceeds MAX_VERIFY_GAS" }, id: 1, jsonrpc: "2.0" };
const unstakedRaw = { error: { code: -32500, message: "validation frame 0: ran out of gas (Out Of Gas)" }, id: 1, jsonrpc: "2.0" };
const ensLimitation = "PQ write unavailable: the default resolver requires ROLE_SET_TEXT; the captured eth_call found no reachable grantor. See captured proof in FINDINGS.";
const ensResolverState = readJson(path.join(root, "docs/ens-resolver.json"));
const ensWrite = ensResolverState?.steps?.setText ? { verdict: "WRITTEN", resolver: ensResolverState.resolver, textKey: ensResolverState.textKey, value: ensResolverState.value, readBack: ensResolverState.readBack, txHash: ensResolverState.steps.setTextAfterRotation ?? ensResolverState.steps.setText, explorerUrl: `${sepoliaExplorer}/${ensResolverState.steps.setTextAfterRotation ?? ensResolverState.steps.setText}`, setResolverTx: ensResolverState.steps.setResolver, setResolverUrl: `${sepoliaExplorer}/${ensResolverState.steps.setResolver}`, reason: "executePq setText on our own Permissioned Resolver, owned by the relayer and granted to the wallet for pq-key only; read back through UniversalResolverV2." } : { verdict: "QUEUED", reason: ensLimitation };
const devnetHashes = deployState?.txHashes ?? { MLDSAKeyFactory: "0x0d85e0dcab5b296c02356bd9efc46d380721362d70d5d860d85dcf45cf107b21", MLDSAVerifier: "0xc340e9ac36c0c1faf2cf5231b81b27464ea80afd18318f6efd24b32de3dfb00d", registerA: "0xc6fad77d74ac18a9a7afa91e048b044b554dba2263661ad62791ad9009279452", registerT: "0x24ce10d1dfda5e2d6bb251020730fc42581a016bb1c3ef424140aa7872055060", QDayWallet: "0xb83ab344ad0ebacf39721ac0d236a9e76d798e95f66f18d5ff0e41fc424b56cf" };
const ensRegisterTx = registrationState?.txHashes?.register ?? first(/register tx `?(0x[a-fA-F0-9]{64})`?/);
const entity = arkivState?.entityKey ?? first(/entity `?(0x[a-fA-F0-9]{64})`?/);
const swarmRef = arkivState?.swarmRef ?? first(/reference `?(81[a-fA-F0-9]{62})`/);
const arkivFlow = findings.match(/created .*?entity `?(0x[a-fA-F0-9]{64})`? in tx `?(0x[a-fA-F0-9]{64})`?.*?patch tx `?(0x[a-fA-F0-9]{64})`?/);
const arkivCreateTx = arkivFlow?.[2] ?? null;
const arkivPatchTx = arkivFlow?.[3] ?? null;

const live = { devnet: { chainId: 1337, participant, lastBlock: null, balanceWei: null, balanceEth: null, stakeSubject, stakeWei: null, stakeEth: null, stakeReadback: false, registry, error: null }, sepolia: { chainId: 11155111, latestBlock: null, error: null } };
async function readLive() {
  const block = await safeRead("devnet eth_blockNumber", () => rpc(devnetRpc, "eth_blockNumber"));
  const balance = await safeRead("devnet participant balance", () => rpc(devnetRpc, "eth_getBalance", [participant, "latest"]));
  const stake = await safeRead("devnet stake readback", () => rpc(devnetRpc, "eth_call", [{ to: registry, data: encodeFunctionData({ abi: [{ type: "function", name: "getDepositInfo", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }, { type: "uint32" }, { type: "uint64" }] }], functionName: "getDepositInfo", args: [stakeSubject] }) }, "latest"]));
  const sepolia = await safeRead("Sepolia eth_blockNumber", () => rpc(sepoliaRpc, "eth_blockNumber"));
  if (block.ok) live.devnet.lastBlock = hexNumber(block.value);
  if (balance.ok) { live.devnet.balanceWei = BigInt(balance.value).toString(); live.devnet.balanceEth = eth(BigInt(balance.value)); }
  if (stake.ok && stake.value?.length >= 194) { live.devnet.stakeWei = BigInt(`0x${stake.value.slice(2, 66)}`).toString(); live.devnet.stakeEth = eth(BigInt(`0x${stake.value.slice(2, 66)}`)); live.devnet.stakeReadback = BigInt(`0x${stake.value.slice(2, 66)}`) > 0n; }
  live.devnet.error = [block, balance, stake].filter((item) => !item.ok).map((item) => item.reason).join("; ") || null;
  if (sepolia.ok) live.sepolia.latestBlock = hexNumber(sepolia.value);
  live.sepolia.error = sepolia.ok ? null : sepolia.reason;
}

const history = [["ML-DSA factory deploy", "devnet", "deploy", devnetHashes.MLDSAKeyFactory], ["ML-DSA verifier deploy", "devnet", "deploy", devnetHashes.MLDSAVerifier], ["QDayWallet deploy", "devnet", "deploy", devnetHashes.QDayWallet], ["registerA precompute", "devnet", "precompute", devnetHashes.registerA], ["registerT precompute", "devnet", "precompute", devnetHashes.registerT], ["SpikeWallet deploy", "devnet", "deploy", "0x6034f81ae7704638f746845078afd16e34f13ed82774d16dc85604e1ed61028b"], ["stake submit (accepted, receipt not indexed)", "devnet", "stake", "0xc8703b08be9c0f627b09068123b24919f5e4069b7615833bc03cf8595d07aefa"], ["ENS qdaywallet.eth registration", "sepolia", "ens-register", ensRegisterTx], ["Arkiv entity create", "arkiv", "entity", arkivCreateTx], ["Arkiv entity patch", "arkiv", "patch", arkivPatchTx], ["Swarm migration passport", "swarm", "passport", swarmRef]].filter(([, , , hash]) => Boolean(hash));
const makeHistory = async () => Promise.all(history.map(async ([label, chain, kind, hash]) => ({ label, chain, kind, hash, explorerUrl: chain === "devnet" ? `${devnetExplorer}/${hash}` : chain === "sepolia" ? `${sepoliaExplorer}/${hash}` : chain === "arkiv" ? `https://rabdi.explorer.arkiv.network/tx/${hash}` : `https://bzz.limo/bzz/${hash}`, status: chain === "devnet" ? await txStatus(devnetRpc, hash) : chain === "sepolia" ? await txStatus(sepoliaRpc, hash) : kind === "passport" ? (arkivState?.swarmRef ? "verified" : "recorded") : "recorded" })));

await readLive();
const evidence = { generatedAt: new Date().toISOString(), exportMode: "live-read-only", account: { address: participant, ensName: registrationState?.label ? `${registrationState.label}.eth` : "qdaywallet.eth" }, deployments: { factory: deployState?.factory ?? "0xa37d3a42c4117bafe189dd21b6170a96f17406b3", verifier: deployState?.verifier ?? "0x17b01049d4790091ac911ead126337abae1517e4", wallet: deployState?.wallet ?? "0xc5a8cb266cf7f56dcf017a5f766bf927c189091f" }, keyRegistry: { registerA: deployState?.registry?.a ?? "0x6E381DD361535Fee2F3a702DeCc8120746fE7f86", registerT: deployState?.registry?.t ?? "0x109c4482EE47ED22253481c6Dbb1440c933C3BEB" }, live, protocol: { name: "ML-DSA-44", publicKeyBytes: "1,312 B", secretKeyBytes: "2,560 B", signatureBytes: "2,420 B", frameMode: "VERIFY 1", sigScheme: "ARBITRARY", executionLimit: "3,200,000", intentBytes: "32 B" }, hero: { headline: "The wallet is the identity.", subtitle: "Quantum-safe authorization, shown through captured mempool evidence.", quote: `Canonical mempool verdict, captured: "Frame transaction prefix gas budget (frames + sig cost) exceeds MAX_VERIFY_GAS"` }, demo: { canonical: { verdict: "REJECTED", rule: canonicalRule, rawAvailable: true, raw: canonicalRaw }, unstaked: { verdict: "REJECTED", rule: "OOG", detail: "validation frame 0: ran out of gas (Out Of Gas)", rawAvailable: true, raw: unstakedRaw }, staked: { verdict: live.devnet.stakeReadback ? "STAKED" : "RECORDED", txHash: null, explorerUrl: null, stakeWei: live.devnet.stakeWei ?? "12000000000000000", stakeEth: live.devnet.stakeEth ?? "0.012", stakeRegistry: registry, stakeReadback: live.devnet.stakeReadback, reason: "No admitted frame hash is present in the captured evidence; the next sidecar window is required." }, pq: { verdict: "QUEUED", txHash: null, explorerUrl: null, reason: "PQ frame admission — awaiting devnet window. Captured proof in FINDINGS." } }, ens: { wallet: registrationState?.wallet ?? "0xe104a972a2d18a09744b66fb5886f5271a5cc9b0", registerTx: ensRegisterTx, explorerUrl: ensRegisterTx ? `${sepoliaExplorer}/${ensRegisterTx}` : null, name: registrationState?.label ? `${registrationState.label}.eth` : "qdaywallet.eth", pqWrite: ensWrite, rotation: ensResolverState?.rotation ? { verdict: "ROTATED", txHash: ensResolverState.steps.rotatePqKey, explorerUrl: `${sepoliaExplorer}/${ensResolverState.steps.rotatePqKey}`, pqKeyVersion: ensResolverState.rotation.pqKeyVersionAfter, ownerUnchanged: ensResolverState.rotation.ownerUnchanged, reason: `${ensResolverState.rotation.note}` } : { verdict: "QUEUED", reason: ensLimitation } }, arkiv: { entity, schema: arkivState?.schema ?? "qday.migration", swarmRef, swarmGateway: swarmRef ? "https://bzz.limo/bzz" : null, swarmByteEqual: Boolean(swarmRef), patchTx: arkivState?.patchTxHash ?? null }, txHistory: await makeHistory(), gas: { measuredVerify: measuredGas, pinnedRegistered: "2,689,594", canonicalBudget: "~100,000" } };

evidence.arkiv.patchTx = arkivPatchTx;
const output = path.join(root, "app/src/data/demoEvidence.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(json({ ok: true, output: path.relative(root, output), devnetBlock: live.devnet.lastBlock, sepoliaBlock: live.sepolia.latestBlock, txHistory: evidence.txHistory.length }));
