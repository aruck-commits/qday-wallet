import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseEther,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { profile } from "@forshtat/hegota-support/profiles/ethrex-eip8141-tracer";
import { encodeTx, frame, newTx, sigScheme, txHash } from "@forshtat/hegota-support/tx";
import { toWire } from "@forshtat/hegota-support/rpc";

const gatewayUrl = "https://altmempoolgateway.forshtat.com/rpc";
const recipient = "0x8943545177806ED17B9F23F0a21ee5948eCaa776" as const;
const statePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../tooling/mempool-workshop/.workshop-state.json",
);
const artifactPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../contracts/out/SpikeWallet.sol/SpikeWallet.json",
);
const chain = defineChain({
  id: 1337,
  name: "EIP-8141 Workshop Devnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [gatewayUrl] } },
});

type WorkshopState = { participantKey?: Hex };
type Rejection = { code: number | null; rule: string | null; hint: string | null; message: string };

function readParticipantKey(): Hex {
  const state = JSON.parse(fs.readFileSync(statePath, "utf8")) as WorkshopState;
  if (!state.participantKey) throw new Error(`Missing participant key in ${statePath}`);
  return state.participantKey;
}

function readArtifact(): { abi: readonly unknown[]; bytecode: Hex } {
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8")) as { abi: readonly unknown[]; bytecode: { object: Hex } };
  return { abi: artifact.abi, bytecode: artifact.bytecode.object };
}

function rejection(error: unknown): Rejection {
  const seen = new Set<unknown>();
  let current: unknown = error;
  let code: number | null = null;
  let message = String(error);
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as { code?: unknown; message?: unknown; details?: unknown; cause?: unknown };
    if (typeof record.code === "number") code = record.code;
    if (typeof record.details === "string" && record.details.length > 0) message = record.details;
    else if (typeof record.message === "string" && record.message.length > 0) message = record.message;
    current = record.cause;
  }
  const rule = /([A-Z][A-Z0-9_-]{1,})/.exec(message)?.[1] ?? null;
  return { code, rule, hint: null, message };
}

async function attempt(send: () => Promise<Hex>): Promise<{ accepted: true; hash: Hex } | { accepted: false; rejection: Rejection }> {
  try {
    return { accepted: true, hash: await send() };
  } catch (error) {
    return { accepted: false, rejection: rejection(error) };
  }
}

async function main() {
  const privateKey = readParticipantKey();
  const account = privateKeyToAccount(privateKey);
  const publicClient = createPublicClient({ chain, transport: http(gatewayUrl) });
  const walletClient = createWalletClient({ account, chain, transport: http(gatewayUrl) });
  const artifact = readArtifact();
  const deployHash = await walletClient.deployContract({
    abi: artifact.abi,
    bytecode: artifact.bytecode,
    account,
    value: parseEther("0.03"),
    gas: 6_000_000n,
    gasPrice: 2_000_000n,
  });
  const deployReceipt = await publicClient.waitForTransactionReceipt({ hash: deployHash, timeout: 120_000, pollingInterval: 2_000 });
  if (deployReceipt.status !== "success" || !deployReceipt.contractAddress) throw new Error(`Spike deployment failed: ${deployHash}`);
  const wallet = deployReceipt.contractAddress;
  const signature = (`0x${"00".repeat(2420)}`) as Hex;
  const tx = newTx({
    chainId: chain.id,
    sender: wallet,
    nonceSeq: await publicClient.getTransactionCount({ address: wallet, blockTag: "latest" }),
    frames: [
      frame(profile, "VERIFY", { scope: "EXECUTION_AND_PAYMENT", target: null, execution: 3_200_000n, data: "0x01" }),
      frame(profile, "SENDER", { target: recipient, execution: 50_000n, state: 200_000n, value: 1_000_000_000n }),
    ],
    signatures: [{ scheme: sigScheme(profile, "ARBITRARY"), signer: "0x", msg: "0x", signature }],
    fees: { maxFeePerGas: 2_000_000_000n },
  });
  const hash = txHash(profile, tx);
  const canonical = await attempt(() => publicClient.request({ method: "eth_sendRawTransaction" as never, params: [encodeTx(profile, tx)] as never }));
  const sidecar = await attempt(() => publicClient.request({ method: "eth_sendFrameTransaction" as never, params: [toWire(tx)] as never }));
  console.log(JSON.stringify({
    ok: !canonical.accepted && !sidecar.accepted,
    wallet,
    deployHash,
    txHash: hash,
    signatureLayout: { signatureIndex: 0, schemeParam: 1, signatureLengthParam: 3, sigdatacopy: { dataOffset: 0, length: "sigparam(0, SIGNATURE_LENGTH)", signatureIndex: 0 } },
    canonical,
    sidecar,
  }));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, error: rejection(error) }));
  process.exitCode = 1;
});
