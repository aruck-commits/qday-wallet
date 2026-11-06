import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

type EnvironmentValue = { name: string; value: string; file: string };

function readEnvironmentFile(file: string): Map<string, string> {
  const absolutePath = path.join(repositoryRoot, file);
  if (!fs.existsSync(absolutePath)) return new Map();
  return new Map(
    fs
      .readFileSync(absolutePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=");
        return separator === -1 ? [line, ""] : [line.slice(0, separator), line.slice(separator + 1)];
      }),
  );
}

function requireValue(name: string, file: string): EnvironmentValue {
  const value = readEnvironmentFile(file).get(name);
  if (!value || /^<paste-.*>$/.test(value)) {
    throw new Error(`Add ${name} to ${file} — see AGENTS.md §3`);
  }
  return { name, value, file };
}

export function getSepoliaRelayerPrivateKey(): string {
  return normalizePrivateKey(requireValue("SEPOLIA_RELAYER_PRIVATE_KEY", ".env.sepolia.local").value);
}

export function getArkivAccessKey(): string {
  return requireValue("ARKIV_ACCESS_KEY", ".env.arkiv.local").value;
}

export function getArkivRelayerPrivateKey(): string {
  return normalizePrivateKey(requireValue("ARKIV_RELAYER_PRIVATE_KEY", ".env.arkiv.local").value);
}

function normalizePrivateKey(value: string): string {
  return /^[0-9a-fA-F]{64}$/.test(value) ? `0x${value}` : value;
}

export function maskedEnvironmentStatus(value: EnvironmentValue): string {
  return `${value.name}: loaded (len ${value.value.length})`;
}

export function sepoliaRelayerStatus(): string {
  return maskedEnvironmentStatus(requireValue("SEPOLIA_RELAYER_PRIVATE_KEY", ".env.sepolia.local"));
}

export function arkivAccessKeyStatus(): string {
  return maskedEnvironmentStatus(requireValue("ARKIV_ACCESS_KEY", ".env.arkiv.local"));
}

export function arkivRelayerStatus(): string {
  return maskedEnvironmentStatus(requireValue("ARKIV_RELAYER_PRIVATE_KEY", ".env.arkiv.local"));
}
