import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSepoliaRelayerPrivateKey, sepoliaRelayerStatus } from "./lib/env.js";

const statePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tooling/sepolia-deploy-state.json");
const plan = ["deploy MLDSAKeyFactory", "deploy MLDSAVerifier(factory)", "deploy QDayWallet(relayer, verifier, fixture pk)", "assert code at each address"];

if (!process.argv.includes("--execute")) {
  console.log(JSON.stringify({ ok: true, executed: false, reviewRequired: true, plan }));
  process.exit(0);
}
console.error(sepoliaRelayerStatus());
getSepoliaRelayerPrivateKey();
fs.writeFileSync(statePath, JSON.stringify({ reviewRequired: true, plan }, null, 2));
throw new Error("Sepolia deployment remains review-locked; remove this guard only after human review");
