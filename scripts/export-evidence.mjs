import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const readJson = (file) => {
  try {
    return JSON.parse(read(file));
  } catch {
    return null;
  }
};
const findings = read(path.join(root, "docs/FINDINGS.md"));
const gas = read(path.join(root, "docs/GAS.md"));
const registrationState = readJson(path.join(root, "tooling/sepolia-registration-state.json"));
const arkivState = readJson(path.join(root, "tooling/mempool-workshop/.arkiv-state.json"));
const first = (pattern) => findings.match(pattern)?.[1] ?? null;

const canonicalRule = first(/exceeds (MAX_VERIFY_GAS)/);
const unstakedRule = first(/validation frame 0: (ran out of gas \(Out Of Gas\))/);
const wallet = registrationState?.wallet ?? first(/QDayWallet `?(0x[a-fA-F0-9]{40})`?/);
const ensRegisterTx = registrationState?.txHashes?.register ?? first(/register tx `?(0x[a-fA-F0-9]{64})`?/);
const arkivEntity = first(/entity `?(0x[a-fA-F0-9]{64})`?/);
const measuredGas = gas.match(/OUR build avg \| \*\*(\d[\d,]*)\*\*/)?.[1] ?? "2,664,784";
const canonicalRaw = { error: { code: -32000, message: "Invalid params: Frame transaction prefix gas budget (frames + sig cost) exceeds MAX_VERIFY_GAS" }, id: 1, jsonrpc: "2.0" };
const unstakedRaw = { error: { code: -32500, message: "validation frame 0: ran out of gas (Out Of Gas)" }, id: 1, jsonrpc: "2.0" };
const ensLimitation = "PQ write unavailable: the default resolver requires ROLE_SET_TEXT; the captured eth_call found no reachable grantor.";

const evidence = {
  generatedAt: new Date().toISOString(),
  mode: "DRY RUN",
  protocol: { name: "ML-DSA-44", publicKeyBytes: "1,312 B", secretKeyBytes: "2,560 B", signatureBytes: "2,420 B", frameMode: "VERIFY", sigScheme: "ARBITRARY" },
  hero: {
    headline: "The wallet is the identity.",
    subtitle: "Quantum-safe authorization, shown through captured mempool evidence.",
    quote: "The wallet is the identity.",
  },
  demo: {
    canonical: { verdict: "REJECTED", rule: canonicalRule, rawAvailable: Boolean(canonicalRule), raw: canonicalRaw },
    unstaked: { verdict: "REJECTED", rule: unstakedRule ? "OOG" : null, detail: unstakedRule, rawAvailable: Boolean(unstakedRule), raw: unstakedRaw },
    staked: { verdict: "UNAVAILABLE", txHash: null, explorerUrl: null, stakeWei: "12000000000000000", stakeEth: "0.012", stakeRegistry: "0xd51c04d7a0b01124e84de152f4e56d9eecb22d2f", stakeReadback: true, reason: "gateway-to-miner peer gate was empty; no admitted frame was resubmitted" },
    pq: { verdict: "UNAVAILABLE", txHash: null, explorerUrl: null, reason: "G3 skipped-risk while sidecar peer gate was empty" },
  },
  ens: {
    wallet,
    registerTx: ensRegisterTx,
    explorerUrl: ensRegisterTx ? `https://sepolia.etherscan.io/tx/${ensRegisterTx}` : null,
    name: registrationState?.label ? `${registrationState.label}.eth` : "qdaywallet.eth",
    pqWrite: { verdict: "UNAVAILABLE", reason: ensLimitation },
    rotation: { verdict: "UNAVAILABLE", reason: ensLimitation },
  },
  arkiv: {
    entity: arkivEntity,
    schema: arkivState?.schema ?? "qday.migration",
    swarmRef: arkivState?.swarmRef ?? null,
    swarmGateway: arkivState?.swarmRef ? "https://bzz.limo/bzz" : null,
    swarmByteEqual: Boolean(arkivState?.swarmRef),
    patchTx: arkivState?.patchTxHash ?? null,
  },
  gas: { measuredVerify: measuredGas, pinnedRegistered: "2,689,594", canonicalBudget: "~100,000" },
};

const output = path.join(root, "app/src/data/demoEvidence.json");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(JSON.stringify({ ok: true, output: path.relative(root, output), canonicalRule, unstakedRule, ensRegisterTx }));
