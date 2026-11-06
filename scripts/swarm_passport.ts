import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createWalletClient, defineSchema, str } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getArkivAccessKey, getArkivRelayerPrivateKey } from "./lib/env.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const gateways = ["https://api.gateway.ethswarm.org/bzz", "https://api.gateway.ethswarm.org/bzz?pin=true", "https://gateway.ethswarm.org/bzz", "https://bzz.limo/bzz"];
const out = (v: unknown) => JSON.stringify(v, (_, x) => typeof x === "bigint" ? x.toString() : x); const finding = (v: unknown) => fs.appendFileSync(path.join(root, "docs/FINDINGS.md"), `\n- ${out({ gate: "G5b", stage: "swarm_passport", entry: v })}\n`);
const schema = defineSchema("qday.migration", { scheme: str().indexed(), wallet: str().optional(), ensName: str().optional(), pqKeyVersion: str().indexed(), pqPkHash: str().optional(), status: str().indexed(), swarmRef: str().optional() });
async function main() {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, "contracts/test/fixtures/pq.json"), "utf8")) as { pk: `0x${string}` };
  const deploy = JSON.parse(fs.readFileSync(path.join(root, "tooling/mempool-workshop/.qday-deploy-state.json"), "utf8")) as { verifier: string; wallet: string };
  const arkivState = JSON.parse(fs.readFileSync(path.join(root, "tooling/mempool-workshop/.arkiv-state.json"), "utf8")) as { entityKey: string };
  const passport = { wallet: "0xe104a972a2d18a09744b66fb5886f5271a5cc9b0", pqpk: createHash("sha256").update(Buffer.from(fixture.pk.slice(2), "hex")).digest("hex"), verifier: deploy.verifier, ensName: "qdaywallet.eth", arkivRef: arkivState.entityKey, gas: { verify: 2664784, registeredReference: 2689594 } };
  const body = Buffer.from(`${JSON.stringify(passport, null, 2)}\n`); let ref: string | undefined; let selectedGateway: string | undefined; const attempts: unknown[] = [];
  for (const gateway of gateways) { try { const uploaded = await fetch(gateway, { method: "POST", headers: { "content-type": "text/plain" }, body }); const rawUpload = await uploaded.text(); const candidate = (JSON.parse(rawUpload) as { reference?: string }).reference; let readBack: Buffer | undefined; let fetchedStatus = 0; if (candidate) { const fetched = await fetch(`${gateway.replace(/\?.*$/, "")}/${candidate}`); fetchedStatus = fetched.status; readBack = Buffer.from(await fetched.arrayBuffer()); } const equal = Boolean(readBack?.equals(body)); attempts.push({ gateway, uploadStatus: uploaded.status, rawUpload, fetchedStatus, bytes: readBack?.length ?? 0, equal }); if (equal) { ref = candidate; selectedGateway = gateway.replace(/\?.*$/, ""); break; } } catch (error) { attempts.push({ gateway, error: String(error) }); } }
  if (!ref || !selectedGateway) { const result = { ok: false, stage: "READ_BACK", expectedBytes: body.length, expectedSha256: createHash("sha256").update(body).digest("hex"), attempts }; finding(result); console.log(out(result)); process.exitCode = 1; return; }
  const client = createWalletClient({ account: privateKeyToAccount(getArkivRelayerPrivateKey() as `0x${string}`), chain: rabdi({ accessKey: getArkivAccessKey() }), transport: http() });
  const patched = await client.patchEntity(schema, arkivState.entityKey, { set: { swarmRef: ref } });
  fs.mkdirSync(path.join(root, "arkiv"), { recursive: true }); fs.writeFileSync(path.join(root, "arkiv/swarm.md"), `# Swarm passport\n\nGateway: ${selectedGateway}\nReference: ${ref}\n\nRe-upload the passport bytes with POST to the gateway and verify GET /bzz/{reference} returns byte-identical JSON.\n`);
  fs.writeFileSync(path.join(root, "tooling/mempool-workshop/.arkiv-state.json"), JSON.stringify({ schema: "qday.migration", entityKey: arkivState.entityKey, swarmRef: ref, patchTxHash: patched.txHash }, null, 2));
  const result = { ok: true, reference: ref, patchTxHash: patched.txHash, gateway: selectedGateway, passportBytes: body.length, attempts }; finding(result); console.log(out(result));
}
main().catch((error) => { const result = { ok: false, error: error instanceof Error ? error.message : String(error) }; finding(result); console.log(out(result)); process.exitCode = 1; });
