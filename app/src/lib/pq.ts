import { ml_dsa44 } from "@noble/post-quantum/ml-dsa.js";
import { keccak256, toBytes, toHex } from "viem";

/**
 * Real ML-DSA-44 (FIPS 204) cryptography for the browser session.
 * Keys are generated here, sign here, and verify here. Secret bytes never
 * leave the session unless the user explicitly downloads an encrypted keyfile.
 */

export const PQ = {
  name: "ML-DSA-44",
  fips: "FIPS 204",
  algoId: "0x0101",
  pkBytes: 1312,
  skBytes: 2560,
  sigBytes: 2420,
  seedBytes: 32,
} as const;

export type PqKeyPair = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
  seed: Uint8Array;
  createdAt: number;
};

export const hexlify = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

/** SHA-256 fingerprint — same format the ENS `pq-key` record stores. */
export async function fingerprintHex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return hexlify(new Uint8Array(digest));
}

export function generatePqKey(): PqKeyPair {
  const seed = crypto.getRandomValues(new Uint8Array(PQ.seedBytes));
  const pair = ml_dsa44.keygen(seed);
  if (pair.publicKey.length !== PQ.pkBytes || pair.secretKey.length !== PQ.skBytes) {
    throw new Error("ML-DSA-44 keygen produced unexpected key sizes");
  }
  return { publicKey: pair.publicKey, secretKey: pair.secretKey, seed, createdAt: Date.now() };
}

/**
 * Sign a 32-byte intent digest. The on-chain verifier (contracts/src/QDayWallet.sol
 * line 57) verifies over abi.encodePacked(intent) — the raw 32 bytes — so the browser
 * signs exactly the message the contract checks.
 */
export function signDigest(digest32: Uint8Array, secretKey: Uint8Array): Uint8Array {
  if (digest32.length !== 32) throw new Error(`intent digest must be 32 bytes, got ${digest32.length}`);
  const signature = ml_dsa44.sign(digest32, secretKey);
  if (signature.length !== PQ.sigBytes) throw new Error(`unexpected signature length ${signature.length}`);
  return signature;
}

/** Verify a 32-byte digest signature — the same call the contract's verifier makes. */
export function verifyDigest(digest32: Uint8Array, signature: Uint8Array, publicKey: Uint8Array): boolean {
  if (digest32.length !== 32) return false;
  try {
    return ml_dsa44.verify(signature, digest32, publicKey);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Keyfile export (demo-grade, clearly labeled): keccak-stretched keystream XOR.
// Not Argon2; fine for a public demo, never for real funds.
// ---------------------------------------------------------------------------

const KDF_ROUNDS = 4096;

function stretch(passphrase: string, salt: Uint8Array): Uint8Array {
  let state = toBytes(keccak256(new Uint8Array([...new TextEncoder().encode(passphrase), ...salt]) as never));
  for (let round = 1; round < KDF_ROUNDS; round += 1) {
    const mixed = new Uint8Array(state.length + 4);
    mixed.set(state, 0);
    new DataView(mixed.buffer).setUint32(state.length, round);
    state = toBytes(keccak256(mixed as never));
  }
  return state;
}

function keystream(base: Uint8Array, length: number): Uint8Array {
  const out = new Uint8Array(length);
  let counter = 0;
  for (let offset = 0; offset < length; offset += base.length) {
    const mixed = new Uint8Array(base.length + 4);
    mixed.set(base, 0);
    new DataView(mixed.buffer).setUint32(base.length, counter++);
    const block = toBytes(keccak256(mixed as never));
    out.set(block.subarray(0, Math.min(block.length, length - offset)), offset);
  }
  return out;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

export type Keyfile = {
  format: "qday-keyfile-v1";
  algorithm: string;
  kdf: string;
  salt: string;
  publicKeyFingerprint: string;
  payload: string; // base64 XOR-encrypted JSON of hex fields
  warning: string;
};

export async function encryptKeyfile(pair: PqKeyPair, passphrase: string): Promise<Keyfile> {
  if (!passphrase) throw new Error("passphrase required");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = stretch(passphrase, salt);
  const plain = new TextEncoder().encode(
    JSON.stringify({
      pk: hexlify(pair.publicKey),
      sk: hexlify(pair.secretKey),
      seed: hexlify(pair.seed),
      createdAt: pair.createdAt,
    }),
  );
  const stream = keystream(key, plain.length);
  const cipher = new Uint8Array(plain.length);
  for (let index = 0; index < plain.length; index += 1) cipher[index] = plain[index] ^ stream[index];
  return {
    format: "qday-keyfile-v1",
    algorithm: PQ.name,
    kdf: `keccak-stretch x${KDF_ROUNDS} (demo-grade)`,
    salt: hexlify(salt),
    publicKeyFingerprint: await fingerprintHex(pair.publicKey),
    payload: bytesToBase64(cipher),
    warning: "Demo-grade encryption. Generated for the Q-Day Wallet showcase; do not store real funds behind this keyfile.",
  };
}

export async function decryptKeyfile(file: Keyfile, passphrase: string): Promise<PqKeyPair> {
  if (file.format !== "qday-keyfile-v1") throw new Error("unknown keyfile format");
  const cipher = base64ToBytes(file.payload);
  const key = stretch(passphrase, Uint8Array.from(file.salt.match(/.{2}/g)!.map((byte) => parseInt(byte, 16))));
  const stream = keystream(key, cipher.length);
  const plain = new Uint8Array(cipher.length);
  for (let index = 0; index < cipher.length; index += 1) plain[index] = cipher[index] ^ stream[index];
  const decoded = JSON.parse(new TextDecoder().decode(plain)) as { pk: string; sk: string; seed: string; createdAt: number };
  const publicKey = Uint8Array.from(decoded.pk.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));
  const secretKey = Uint8Array.from(decoded.sk.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));
  const seed = Uint8Array.from(decoded.seed.match(/.{2}/g)!.map((byte) => parseInt(byte, 16)));
  if (publicKey.length !== PQ.pkBytes || secretKey.length !== PQ.skBytes) throw new Error("decrypted keyfile has wrong key sizes");
  return { publicKey, secretKey, seed, createdAt: decoded.createdAt };
}

export const digestToHex = (digest: Uint8Array): string => toHex(digest as never) as `0x${string}`;
