import { privateKeyToAccount } from "viem/accounts";
import fs from "node:fs";
import { preflight } from "./lib/devnet.js";

const stages = ["A canonical ARBITRARY rejection", "B unstaked sidecar rejection", "C clean-path 0.012 ETH stake", "D staked sidecar admission and mining"];
const state = JSON.parse(fs.readFileSync("tooling/mempool-workshop/.workshop-state.json", "utf8")) as { participantKey: `0x${string}` };
if (!process.argv.includes("--preflight")) throw new Error("Use --preflight only until explicit resume authorization");
console.log(JSON.stringify({ ok: true, mode: "preflight", ...(await preflight(privateKeyToAccount(state.participantKey).address)), stages }));
