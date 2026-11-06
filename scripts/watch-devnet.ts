import fs from "node:fs";
const ethrexUrl = "https://altmempool.forshtat.com";
const gatewayUrl = "https://altmempoolgateway.forshtat.com/rpc";
const resumeBlock = 0x63ac6;

async function rpc(url: string, method: string) {
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params: [] }) });
  const body = await response.json() as { result?: unknown; error?: { code: number; message: string } };
  if (body.error) throw new Error(`${body.error.code}:${body.error.message}`);
  return body.result;
}

function compact(value: unknown) {
  if (Array.isArray(value)) return String(value.length);
  if (value && typeof value === "object") return String(Object.keys(value).length);
  return String(value);
}

function txpoolCount(value: unknown) {
  if (typeof value === "string") return String(parseInt(value, 16));
  if (!value || typeof value !== "object") return compact(value);
  const status = value as { pending?: string; queued?: string };
  return String(BigInt(status.pending ?? "0x0") + BigInt(status.queued ?? "0x0"));
}

async function poll() {
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
  const [block, chainId, txpool, peers] = await Promise.allSettled([
    rpc(ethrexUrl, "eth_blockNumber"), rpc(ethrexUrl, "eth_chainId"), rpc(ethrexUrl, "txpool_status"), rpc(gatewayUrl, "skandha_explorer_peers"),
  ]);
  const value = (result: PromiseSettledResult<unknown>) => result.status === "fulfilled" ? compact(result.value) : `ERR:${result.reason.message}`;
  const blockHex = block.status === "fulfilled" ? String(block.value) : "ERR";
  const pool = txpool.status === "fulfilled" ? txpoolCount(txpool.value) : `ERR:${txpool.reason.message}`;
  const line = `${time} IST block=${blockHex} chain=${value(chainId)} txpool=${pool} peers=${value(peers)}`;
  console.log(line); fs.appendFileSync("tooling/watch-devnet.log", `${line}\n`);
  if (block.status === "fulfilled" && Number(BigInt(String(block.value))) > resumeBlock) {
    console.log(`RESUMED at ${time} IST`);
    process.exit(0);
  }
}

await poll();
setInterval(() => void poll(), 30_000);
