import { encodeAbiParameters, keccak256, toHex, type Address, type Hex } from "viem";
import { profile } from "@forshtat/hegota-support/profiles/ethrex-eip8141-tracer";
import { encodeTx, frame, newTx, sigScheme, txHash } from "@forshtat/hegota-support/tx";
import { toWire } from "@forshtat/hegota-support/rpc";
import { PQ, hexlify } from "./pq";

/**
 * Real EIP-8141 frame-transaction construction in the browser.
 *
 * The spend intent digest mirrors contracts/src/QDayWallet.sol `currentIntent`
 * byte-for-byte (line 47):
 *   keccak256(abi.encode("QDAY_INTENT_V1", chainid, wallet, target,
 *                        keccak256(callData), pqNonce, deadline))
 * The ML-DSA-44 signature covers exactly those 32 bytes, which is what the
 * on-chain verifier checks (line 57: verifier.verify(ML_DSA_44, pqPublicKey,
 * abi.encodePacked(intent), pqSig)).
 *
 * Frame serialization uses @forshtat/hegota-support — the sanctioned codec
 * (see AGENTS.md §2). No frame bytes are hand-rolled here.
 */

export const FRAME_PROFILE = "ethrex-eip8141-tracer";

/** Captured devnet calibration: the VERIFY frame budget we submitted at. */
export const VERIFY_EXECUTION_LIMIT = 3_200_000n;
export const SENDER_EXECUTION = 50_000n;
export const SENDER_STATE = 200_000n;
export const MAX_FEE_PER_GAS = 2_000_000_000n; // 2 gwei, legacy price as on the devnet
export const INTENT_TTL_SECONDS = 3600n;

export type SpendIntentInput = {
  chainId: bigint;
  wallet: Address;
  target: Address;
  callData: Hex;
  pqNonce: bigint;
  deadline: bigint;
};

/** Byte-exact mirror of QDayWallet.currentIntent. */
export function intentDigest(input: SpendIntentInput): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "string" },
        { type: "uint256" },
        { type: "address" },
        { type: "address" },
        { type: "bytes32" },
        { type: "uint64" },
        { type: "uint256" },
      ],
      [
        "QDAY_INTENT_V1",
        input.chainId,
        input.wallet,
        input.target,
        keccak256(input.callData),
        input.pqNonce,
        input.deadline,
      ],
    ),
  );
}

/** A plain ETH transfer: empty callData, value carried by the SENDER frame. */
export function transferIntent(input: {
  chainId: bigint;
  wallet: Address;
  recipient: Address;
  amountWei: bigint;
  pqNonce: bigint;
  deadline: bigint;
}): Hex {
  return intentDigest({
    chainId: input.chainId,
    wallet: input.wallet,
    target: input.recipient,
    callData: "0x",
    pqNonce: input.pqNonce,
    deadline: input.deadline,
  });
}

export type FrameWire = Record<string, unknown>;

export type BuiltFrameTx = {
  txHash: Hex;
  /** JSON wire form for eth_sendFrameTransaction (sidecar gateway) — bigints as 0x-quantities */
  wire: FrameWire;
  /** canonical-mempool raw tx (eth_sendRawTransaction) — the one that gets rejected */
  rawCanonical: Hex;
  frames: {
    mode: "VERIFY" | "SENDER";
    scope: string | null;
    target: Address | null;
    execution: string;
    state: string | null;
    value: string | null;
  }[];
  signature: { scheme: "ARBITRARY"; algorithm: string; bytes: number; message: Hex };
  intent: { digest: Hex; pqNonce: string; deadline: string; recipient: Address; amountWei: string; callData: Hex };
};

export function buildPqFrameTx(input: {
  chainId: bigint;
  sender: Address;
  recipient: Address;
  amountWei: bigint;
  pqNonce: bigint;
  deadline: bigint;
  messageDigest: Hex;
  signature: Uint8Array;
  verifyExecutionLimit?: bigint;
}): BuiltFrameTx {
  if (input.messageDigest.length !== 66) throw new Error("message digest must be 32 bytes");
  if (input.signature.length !== PQ.sigBytes) throw new Error(`ML-DSA-44 signature must be ${PQ.sigBytes} bytes`);

  const execution = input.verifyExecutionLimit ?? VERIFY_EXECUTION_LIMIT;
  const tx = newTx({
    chainId: input.chainId,
    sender: input.sender,
    nonceSeq: input.pqNonce,
    frames: [
      frame(profile, "VERIFY", { scope: "EXECUTION_AND_PAYMENT", target: null, execution }),
      frame(profile, "SENDER", {
        target: input.recipient,
        execution: SENDER_EXECUTION,
        state: SENDER_STATE,
        value: input.amountWei,
      }),
    ],
    signatures: [
      {
        scheme: sigScheme(profile, "ARBITRARY"),
        signer: "0x",
        msg: input.messageDigest,
        signature: toHex(input.signature as never) as Hex,
      },
    ],
    fees: { maxFeePerGas: MAX_FEE_PER_GAS },
  });

  return {
    txHash: txHash(profile, tx),
    wire: toWire(tx) as FrameWire,
    rawCanonical: encodeTx(profile, tx),
    frames: [
      { mode: "VERIFY", scope: "EXECUTION_AND_PAYMENT", target: null, execution: execution.toString(), state: null, value: null },
      {
        mode: "SENDER",
        scope: null,
        target: input.recipient,
        execution: SENDER_EXECUTION.toString(),
        state: SENDER_STATE.toString(),
        value: input.amountWei.toString(),
      },
    ],
    signature: {
      scheme: "ARBITRARY",
      algorithm: PQ.name,
      bytes: input.signature.length,
      message: input.messageDigest,
    },
    intent: {
      digest: input.messageDigest,
      pqNonce: input.pqNonce.toString(),
      deadline: input.deadline.toString(),
      recipient: input.recipient,
      amountWei: input.amountWei.toString(),
      callData: "0x",
    },
  };
}

export const sigBytesToHex = (bytes: Uint8Array): string => hexlify(bytes);
