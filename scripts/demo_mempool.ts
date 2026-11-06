import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const statePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../tooling/mempool-workshop/.qday-mempool-state.json");
const stages = ["A canonical ARBITRARY rejection", "B unstaked sidecar rejection", "C clean-path 0.012 ETH stake", "D staked sidecar admission and mining"];

if (process.argv.includes("--execute")) throw new Error("Devnet execution is disabled while ethrex is stalled at block 408262");
fs.writeFileSync(statePath, JSON.stringify({ planned: true, fresh: process.argv.includes("--fresh"), stages }, null, 2));
console.log(JSON.stringify({ ok: true, executed: false, statePath, stages }));
