import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const endpoints = {
  devnet: "https://altmempoolgateway.forshtat.com/rpc",
  sepolia: "https://ethereum-sepolia-rpc.publicnode.com",
};
const evidence = JSON.parse(fs.readFileSync(path.join(root, "app/src/data/demoEvidence.json"), "utf8"));
const rpc = async (url, method, params = []) => {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const body = await r.json();
  return body.error ? { error: body.error } : body.result;
};

const snapshot = { frozenAt: new Date().toISOString(), note: "Raw RPC responses captured from public endpoints. Kept so the proof survives if a devnet is reset.", devnet: { endpoint: endpoints.devnet, chainId: 1337 }, sepolia: { endpoint: endpoints.sepolia, chainId: 11155111 }, blockHeaders: {}, transactions: [] };
const devnetBlock = await rpc(endpoints.devnet, "eth_blockNumber");
snapshot.devnet.blockNumberAtFreeze = parseInt(devnetBlock, 16);
snapshot.blockHeaders.devnet = await rpc(endpoints.devnet, "eth_getBlockByNumber", [devnetBlock, false]);
for (const item of evidence.txHistory) {
  const endpoint = item.chain === "devnet" ? endpoints.devnet : item.chain === "sepolia" ? endpoints.sepolia : null;
  if (!endpoint) continue;
  const receipt = await rpc(endpoint, "eth_getTransactionReceipt", [item.hash]);
  snapshot.transactions.push({ label: item.label, chain: item.chain, hash: item.hash, explorerUrl: item.explorerUrl, receipt: receipt ?? null });
}
const stakeSubject = evidence.live.devnet.stakeSubject;
const registry = evidence.demo.staked.stakeRegistry;
snapshot.stakeReadback = { registry, subject: stakeSubject, getDepositInfoResult: await rpc(endpoints.devnet, "eth_call", [{ to: registry, data: "0x5287ce12" + stakeSubject.slice(2).padStart(64, "0") }, "latest"]) };
const outDir = path.join(root, "docs/evidence");
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outFile = path.join(outDir, `devnet-sepolia-snapshot-${stamp}.json`);
fs.writeFileSync(outFile, `${JSON.stringify(snapshot, null, 2)}\n`);
const missing = snapshot.transactions.filter((t) => !t.receipt).map((t) => t.label);
console.log(JSON.stringify({ ok: missing.length === 0, output: path.relative(root, outFile), transactions: snapshot.transactions.length, missingReceipts: missing }));
