import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createWalletClient, defineSchema, str } from "@arkiv-network/sdk";
import { rabdi } from "@arkiv-network/sdk/chains";
import { http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getArkivAccessKey, getArkivRelayerPrivateKey } from "./lib/env.js";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); const gateway = "https://api.gateway.ethswarm.org/bzz";
const out = (v: unknown) => JSON.stringify(v, (_, x) => typeof x === "bigint" ? x.toString() : x); const finding = (v: unknown) => fs.appendFileSync(path.join(root, "docs/FINDINGS.md"), `\n- ${out({ gate: "G5b", stage: "swarm_passport", entry: v })}\n`);
const schema = defineSchema("qday.migration", { scheme: str().indexed(), wallet: str().optional(), ensName: str().optional(), pqKeyVersion: str().indexed(), pqPkHash: str().optional(), status: str().indexed(), swarmRef: str().optional() });
async function main() {
  const fixture = JSON.parse(fs.readFileSync(path.join(root, "contracts/test/fixtures/pq.json"), "utf8")) as { pk: `0x${string}` };
  const deploy = JSON.parse(fs.readFileSync(path.join(root, "tooling/mempool-workshop/.qday-deploy-state.json"), "utf8")) as { verifier: string; wallet: string };
  const arkivState = JSON.parse(fs.readFileSync(path.join(root, "tooling/mempool-workshop/.arkiv-state.json"), "utf8")) as { entityKey: string };
  const passport = { wallet: "0xe104a972a2d18a09744b66fb5886f5271a5cc9b0", pqpk: createHash("sha256").update(Buffer.from(fixture.pk.slice(2), "hex")).digest("hex"), verifier: deploy.verifier, ensName: "qdaywallet.eth", arkivRef: arkivState.entityKey, gas: { verify: 2664784, registeredReference: 2689594 } };
  const body = Buffer.from(`${JSON.stringify(passport, null, 2)}\n`);
  const uploaded = await fetch(gateway, { method: "POST", headers: { "content-type": "application/json" }, body }); const rawUpload = await uploaded.text();
  if (!uploaded.ok) { const result = { ok: false, stage: "UPLOAD", http: uploaded.status, raw: rawUpload }; finding(result); console.log(out(result)); process.exitCode = 1; return; }
  const ref = (JSON.parse(rawUpload) as { reference?: string }).reference; if (!ref) throw new Error(`Swarm upload omitted reference: ${rawUpload}`);
  const fetched = await fetch(`${gateway}/${ref}`); const readBack = Buffer.from(await fetched.arrayBuffer());
  if (!fetched.ok || !readBack.equals(body)) { const result = { ok: false, stage: "READ_BACK", reference: ref, http: fetched.status, expectedBytes: body.length, observedBytes: readBack.length, expectedSha256: createHash("sha256").update(body).digest("hex"), observedSha256: createHash("sha256").update(readBack).digest("hex"), rawUpload, rawReadBack: readBack.toString("utf8") }; finding(result); console.log(out(result)); process.exitCode = 1; return; }
  const client = createWalletClient({ account: privateKeyToAccount(getArkivRelayerPrivateKey() as `0x${string}`), chain: rabdi({ accessKey: getArkivAccessKey() }), transport: http() });
  const patched = await client.patchEntity(schema, arkivState.entityKey, { set: { swarmRef: ref } });
  fs.mkdirSync(path.join(root, "arkiv"), { recursive: true }); fs.writeFileSync(path.join(root, "arkiv/swarm.md"), `# Swarm passport\n\nGateway: ${gateway}\nReference: ${ref}\n\nRe-upload the passport bytes with POST to the gateway and verify GET /bzz/{reference} returns byte-identical JSON.\n`);
  const result = { ok: true, reference: ref, patchTxHash: patched.txHash, gateway, passportBytes: body.length }; finding(result); console.log(out(result));
}
main().catch((error) => { const result = { ok: false, error: error instanceof Error ? error.message : String(error) }; finding(result); console.log(out(result)); process.exitCode = 1; });
