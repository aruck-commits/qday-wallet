import { create } from "zustand";
import { useDemoStore } from "./demoStore";
import { PQ, decryptKeyfile, encryptKeyfile, fingerprintHex, generatePqKey, signDigest, verifyDigest, type Keyfile, type PqKeyPair } from "./pq";
import { INTENT_TTL_SECONDS, buildPqFrameTx, transferIntent, type BuiltFrameTx } from "./frame";
import { probeDevnetGateway, queryArkivMigration, readArkivEntity, readEnsPqRecord, readSepoliaLive, type ArkivEntity, type DevnetStatus, type EnsPqRecord, type SepoliaLive } from "./chain";

/**
 * Session wallet state. The ML-DSA-44 secret lives ONLY in this store's memory:
 * never localStorage, never a network call. A page reload forgets it by design.
 */

export type IntentRecord = {
  id: string;
  createdAt: number;
  recipient: string;
  amountEth: string;
  digest: string;
  pqNonce: string;
  deadline: string;
  txHash: string;
  wire: Record<string, unknown>;
  frames: BuiltFrameTx["frames"];
  signature: BuiltFrameTx["signature"];
  verified: boolean;
  status: "signed" | "submitted-offline";
  submitNote: string | null;
};

export type LiveState = {
  sepolia: SepoliaLive | null;
  devnet: DevnetStatus | null;
  ens: EnsPqRecord | null;
  arkiv: ArkivEntity | null;
  arkivQuery: { online: boolean; keys: string[]; block: string | null; error: string | null } | null;
  refreshing: boolean;
  refreshedAt: number | null;
};

type WalletState = {
  keypair: PqKeyPair | null;
  fingerprint: string | null;
  intents: IntentRecord[];
  live: LiveState;
  generateKey: () => Promise<void>;
  forgetKey: () => void;
  importKeyfile: (file: Keyfile, passphrase: string) => Promise<void>;
  exportKeyfile: (passphrase: string) => Promise<Keyfile>;
  signTransfer: (input: { recipient: string; amountEth: string }) => Promise<IntentRecord>;
  refreshLive: () => Promise<void>;
};

const emptyLive: LiveState = { sepolia: null, devnet: null, ens: null, arkiv: null, arkivQuery: null, refreshing: false, refreshedAt: null };

export const useWalletStore = create<WalletState>((set, get) => ({
  keypair: null,
  fingerprint: null,
  intents: [],
  live: emptyLive,

  generateKey: async () => {
    const pair = generatePqKey();
    const fingerprint = await fingerprintHex(pair.publicKey);
    set({ keypair: pair, fingerprint });
  },

  forgetKey: () => set({ keypair: null, fingerprint: null, intents: [] }),

  importKeyfile: async (file, passphrase) => {
    const pair = await decryptKeyfile(file, passphrase);
    const fingerprint = await fingerprintHex(pair.publicKey);
    set({ keypair: pair, fingerprint });
  },

  exportKeyfile: async (passphrase) => {
    const pair = get().keypair;
    if (!pair) throw new Error("no session key");
    return encryptKeyfile(pair, passphrase);
  },

  signTransfer: async ({ recipient, amountEth }) => {
    const { keypair, intents } = get();
    if (!keypair) throw new Error("generate a session key first");
    if (!/^0x[0-9a-fA-F]{40}$/.test(recipient)) throw new Error("recipient must be a 0x address");
    const amount = Number(amountEth);
    if (!(amount > 0)) throw new Error("amount must be positive");
    const amountWei = BigInt(Math.round(amount * 1e9)) * 1_000_000_000n; // gwei-precision ETH

    // Session keys sign with pqNonce 0 — the on-chain wallet counts its own
    // pqNonce; a session key would first be registered via rotatePqKey.
    const chainId = 1337n; // the EIP-8141 workshop devnet chain the contract targets
    const wallet = "0xf2bae312209239cb623c23d2f131269fc5f46006" as `0x${string}`;
    const deadline = BigInt(Math.floor(Date.now() / 1000)) + INTENT_TTL_SECONDS;
    const pqNonce = 0n;

    const digest = transferIntent({ chainId, wallet, recipient: recipient as `0x${string}`, amountWei, pqNonce, deadline });
    const signature = signDigest(
      new Uint8Array(digest.slice(2).match(/.{2}/g)!.map((byte) => parseInt(byte, 16))),
      keypair.secretKey,
    );
    // Real local verification — the same check the on-chain verifier runs.
    const verified = verifyDigest(
      new Uint8Array(digest.slice(2).match(/.{2}/g)!.map((byte) => parseInt(byte, 16))),
      signature,
      keypair.publicKey,
    );
    if (!verified) throw new Error("local verification failed — refusing to emit a frame");

    const built = buildPqFrameTx({
      chainId,
      sender: wallet,
      recipient: recipient as `0x${string}`,
      amountWei,
      pqNonce,
      deadline,
      messageDigest: digest,
      signature,
    });

    const record: IntentRecord = {
      id: `${Date.now().toString(36)}`,
      createdAt: Date.now(),
      recipient,
      amountEth: amountWei.toString(),
      digest: built.intent.digest,
      pqNonce: built.intent.pqNonce,
      deadline: built.intent.deadline,
      txHash: built.txHash,
      wire: built.wire,
      frames: built.frames,
      signature: built.signature,
      verified,
      status: "signed",
      submitNote: null,
    };
    set({ intents: [record, ...intents].slice(0, 20) });
    return record;
  },

  refreshLive: async () => {
    if (get().live.refreshing) return;
    set((state) => ({ live: { ...state.live, refreshing: true } }));
    const [sepolia, devnet, ens, arkiv, arkivQuery] = await Promise.all([
      readSepoliaLive(),
      probeDevnetGateway(),
      readEnsPqRecord(),
      readArkivEntity(),
      queryArkivMigration(),
    ]);
    set((state) => ({
      live: { sepolia, devnet, ens, arkiv, arkivQuery, refreshing: false, refreshedAt: Date.now() },
    }));
  },
}));

export const pqSpecs = PQ;

/** Navigation sync: refresh live data whenever the app shows a live-data screen. */
export async function ensureLiveRefresh(): Promise<void> {
  const { live, refreshLive } = useWalletStore.getState();
  const stale = !live.refreshedAt || Date.now() - live.refreshedAt > 120_000;
  if (stale && !live.refreshing) void refreshLive();
}

export { useDemoStore };
