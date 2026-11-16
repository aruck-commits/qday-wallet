import { createPublicClient, encodeFunctionData, formatEther, http, namehash, type Address, type Hex } from "viem";
import { sepolia } from "viem/chains";

/**
 * Live chain reads from the browser. No keys, no wallets, no signers — public
 * RPC only. Every function degrades gracefully to `{ online: false }` so the UI
 * can show honest offline states instead of breaking.
 */

// Verified constants (see README + docs/evidence):
export const SEPOLIA = {
  chainId: 11155111,
  name: "qdaywallet.eth",
  hookedWallet: "0xe104a972a2d18a09744b66fb5886f5271a5cc9b0" as Address,
  participant: "0x3b7CdFf8ED99272338abF93A3B31b13421f779b1" as Address,
  /** Our own Permissioned Resolver that owns the `pq-key` record. */
  resolver: "0x863b62fA8988Ba340C24F389FFDF568b3ccbc8e4" as Address,
  explorerTx: (hash: string) => `https://sepolia.etherscan.io/tx/${hash}`,
} as const;

export const ARKIV = {
  rpc: "https://rpc.rabdi.db-chain.testnet.arkiv.network",
  chainId: 7794095,
  schema: "qday.migration",
  entityKey: "0xc6c072904c6dd995b59046e2465e33283f09fb14c61c7f63c9ccc723c84dd048" as Hex,
  explorerTx: (hash: string) => `https://rabdi.explorer.arkiv.network/tx/${hash}`,
} as const;

export const DEVNET = {
  gateway: "https://altmempoolgateway.forshtat.com/rpc",
  chainId: 1337,
  explorerTx: (hash: string) => `https://explorer.altmempool.wtf/${hash}`,
} as const;

const SEPOLIA_RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://1rpc.io/sepolia",
  "https://rpc.sepolia.org",
];

async function sepoliaClient() {
  for (const url of SEPOLIA_RPCS) {
    try {
      const client = createPublicClient({ chain: sepolia, transport: http(url, { timeout: 8_000 }) });
      await client.getBlockNumber();
      return client;
    } catch {
      // try the next public RPC
    }
  }
  return null;
}

export type SepoliaLive = {
  online: boolean;
  blockNumber: string | null;
  balances: { hooked: string | null; participant: string | null };
  error: string | null;
};

export async function readSepoliaLive(): Promise<SepoliaLive> {
  try {
    const client = await sepoliaClient();
    if (!client) return { online: false, blockNumber: null, balances: { hooked: null, participant: null }, error: "all public RPCs unreachable" };
    const [blockNumber, hooked, participant] = await Promise.all([
      client.getBlockNumber(),
      client.getBalance({ address: SEPOLIA.hookedWallet }).catch(() => null),
      client.getBalance({ address: SEPOLIA.participant }).catch(() => null),
    ]);
    return {
      online: true,
      blockNumber: blockNumber.toString(),
      balances: {
        hooked: hooked === null ? null : formatEther(hooked),
        participant: participant === null ? null : formatEther(participant),
      },
      error: null,
    };
  } catch (error) {
    return { online: false, blockNumber: null, balances: { hooked: null, participant: null }, error: String(error) };
  }
}

const textAbi = [{ type: "function", name: "text", stateMutability: "view", inputs: [{ type: "bytes32" }, { type: "string" }], outputs: [{ type: "string" }] }] as const;

export type EnsPqRecord = {
  online: boolean;
  value: string | null;
  resolver: Address;
  node: Hex;
  textKey: string;
  error: string | null;
};

/** Live read of the `pq-key` text record straight from our Permissioned Resolver. */
export async function readEnsPqRecord(): Promise<EnsPqRecord> {
  const base: EnsPqRecord = { online: false, value: null, resolver: SEPOLIA.resolver, node: namehash(SEPOLIA.name) as Hex, textKey: "pq-key", error: null };
  try {
    const client = await sepoliaClient();
    if (!client) return { ...base, error: "sepolia RPC unreachable" };
    const data = encodeFunctionData({ abi: textAbi, functionName: "text", args: [namehash(SEPOLIA.name), "pq-key"] });
    const raw = await client.call({ to: SEPOLIA.resolver, data });
    const value = raw.data && raw.data !== "0x" ? raw.data.replace(/^0x/, "") : "";
    const decoded = valueLengthPrefixed(value);
    return { ...base, online: true, value: decoded, error: null };
  } catch (error) {
    return { ...base, error: String(error) };
  }
}

/** Decode an ABI-encoded string return (offset, length, bytes) from raw hex. */
function valueLengthPrefixed(hex: string): string | null {
  try {
    const length = parseInt(hex.slice(64, 128), 16);
    const bytes: number[] = [];
    for (let index = 0; index < length; index += 1) bytes.push(parseInt(hex.slice(128 + index * 2, 130 + index * 2), 16));
    return String.fromCharCode(...bytes);
  } catch {
    return null;
  }
}

export type DevnetStatus = { online: boolean; chainId: string | null; error: string | null };

/** The EIP-8141 workshop devnet ran for the hackathon; it may be retired now. */
export async function probeDevnetGateway(): Promise<DevnetStatus> {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8_000);
    const response = await fetch(DEVNET.gateway, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }),
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    const body = (await response.json()) as { result?: string; error?: unknown };
    if (body.result) return { online: true, chainId: body.result, error: null };
    return { online: false, chainId: null, error: JSON.stringify(body.error ?? body).slice(0, 200) };
  } catch (error) {
    return { online: false, chainId: null, error: String(error).slice(0, 200) };
  }
}

// ---------------------------------------------------------------------------
// Arkiv: public RPC answers reads WITHOUT an access key (verified live).
// Query syntax: attributes are typed literals — scheme = str('ML-DSA-44').
// ---------------------------------------------------------------------------

type ArkivAttribute = { name: string; type: string; value: string };

export type ArkivEntity = {
  online: boolean;
  key: string | null;
  owner: string | null;
  attributes: Record<string, string>;
  expiresAtBlock: string | null;
  currentBlock: string | null;
  error: string | null;
};

function parseAttributes(raw: unknown): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const item of Array.isArray(raw) ? raw : []) {
    const text = typeof item === "string" ? item : JSON.stringify(item);
    const match = /name=([^;]+); type=([^;]+); value=(.*?)\}?$/s.exec(text) ?? /@?\{?name=([^;]+); type=([^;]+); value=([^;]*)\}?/.exec(text);
    if (match) attributes[match[1]] = match[3];
  }
  return attributes;
}

export async function readArkivEntity(): Promise<ArkivEntity> {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(ARKIV.rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "arkiv_getEntity", params: [ARKIV.entityKey] }),
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    const body = (await response.json()) as { result?: { key?: string; owner?: string; attributes?: unknown; expiresAt?: string }; error?: unknown };
    if (!body.result) return { online: false, key: null, owner: null, attributes: {}, expiresAtBlock: null, currentBlock: null, error: JSON.stringify(body.error ?? body).slice(0, 200) };
    return {
      online: true,
      key: body.result.key ?? ARKIV.entityKey,
      owner: body.result.owner ?? null,
      attributes: parseAttributes(body.result.attributes),
      expiresAtBlock: body.result.expiresAt ?? null,
      currentBlock: null,
      error: null,
    };
  } catch (error) {
    return { online: false, key: null, owner: null, attributes: {}, expiresAtBlock: null, currentBlock: null, error: String(error).slice(0, 200) };
  }
}

export async function queryArkivMigration(): Promise<{ online: boolean; keys: string[]; block: string | null; error: string | null }> {
  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);
    const response = await fetch(ARKIV.rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "arkiv_query", params: ["scheme = str('ML-DSA-44')"] }),
      signal: controller.signal,
    });
    window.clearTimeout(timeout);
    const body = (await response.json()) as { result?: { data?: string[]; blockNumber?: string }; error?: unknown };
    if (!body.result) return { online: false, keys: [], block: null, error: JSON.stringify(body.error ?? body).slice(0, 200) };
    return { online: true, keys: (body.result.data ?? []).map((item) => /0x[0-9a-f]+/i.exec(item)?.[0] ?? item), block: body.result.blockNumber ?? null, error: null };
  } catch (error) {
    return { online: false, keys: [], block: null, error: String(error).slice(0, 200) };
  }
}
