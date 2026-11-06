import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPublicClient } from "@arkiv-network/sdk";
import { defineSchema, str } from "@arkiv-network/sdk/schema";
import { eq } from "@arkiv-network/sdk/query";
import { rabdi } from "@arkiv-network/sdk/chains";
import { http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getArkivAccessKey, getArkivRelayerPrivateKey } from "./lib/env.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QDayMigration = defineSchema("qday.migration", { scheme: str().indexed(), wallet: str().optional(), ensName: str().optional(), pqKeyVersion: str().indexed(), pqPkHash: str().optional(), status: str().indexed(), swarmRef: str().optional() });
const state = JSON.parse(fs.readFileSync(path.join(root, "tooling/mempool-workshop/.arkiv-state.json"), "utf8")) as { entityKey: `0x${string}`; patchTxHash: string };
const query = 'scheme = "ML-DSA-44"';
const client = createPublicClient({ chain: rabdi({ accessKey: getArkivAccessKey() }), transport: http() });
const writer = privateKeyToAccount(getArkivRelayerPrivateKey() as `0x${string}`).address;

const entity = await client.getEntity(state.entityKey, QDayMigration);
if (entity.scheme.value !== "ML-DSA-44") throw new Error("entity read assertion failed");
const selected = await client.select({ $key: true, pqKeyVersion: true, status: true }).from(QDayMigration).where(eq("scheme", "ML-DSA-44")).fetch();
if (selected.entities.length < 1) throw new Error("query assertion failed");

const output = {
  fetchedAt: new Date().toISOString(),
  network: { name: "Arkiv Rabdi testnet", chainId: 7794095, rpc: "https://rpc.rabdi.db-chain.testnet.arkiv.network" },
  writer,
  schema: "qday.migration",
  query,
  resultCount: selected.entities.length,
  entity: { key: state.entityKey, scheme: entity.scheme.value, pqKeyVersion: entity.pqKeyVersion.value, status: entity.status.value, swarmRef: entity.swarmRef?.value ?? null, wallet: entity.wallet?.value ?? null, ensName: entity.ensName?.value ?? null, patchTx: state.patchTxHash, explorerUrl: `https://rabdi.explorer.arkiv.network/tx/${state.patchTxHash}` },
};
const outFile = path.join(root, "app/src/data/arkivLive.json");
fs.writeFileSync(outFile, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, output: path.relative(root, outFile), resultCount: output.resultCount, writer }));
