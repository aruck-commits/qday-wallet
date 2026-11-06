import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const statePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tooling/mempool-workshop/.qday-deploy-state.json");
const steps = ["deploy MLDSAVerifier", "deploy MLDSAKeyFactory", "registerA", "registerT", "deploy QDayWallet", "assert deployed code"];

if (process.argv.includes("--execute")) throw new Error("Devnet execution is disabled while ethrex is stalled at block 408262");
fs.writeFileSync(statePath, JSON.stringify({ planned: true, steps, gasPriceWei: "2000000", deployGas: "6000000" }, null, 2));
console.log(JSON.stringify({ ok: true, executed: false, statePath, steps }));
