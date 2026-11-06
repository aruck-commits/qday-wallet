export type RawEvidence = {
  error?: { code?: number; message?: string; rule?: string; hint?: string };
  id?: number;
  jsonrpc?: string;
};

export type DemoEvidence = {
  generatedAt: string;
  exportMode: string;
  account: { address: string; ensName: string };
  deployments: { factory: string; verifier: string; wallet: string };
  keyRegistry: { registerA: string | null; registerT: string | null };
  live: { devnet: { chainId: number; participant: string; lastBlock: number | null; balanceWei: string | null; balanceEth: string | null; stakeSubject: string; stakeWei: string | null; stakeEth: string | null; stakeReadback: boolean; registry: string; error: string | null }; sepolia: { chainId: number; latestBlock: number | null; error: string | null } };
  protocol: { name: string; publicKeyBytes: string; secretKeyBytes: string; signatureBytes: string; frameMode: string; sigScheme: string; executionLimit: string; intentBytes: string };
  hero: { headline: string; subtitle: string; quote: string };
  demo: {
    canonical: { verdict: string; rule: string | null; rawAvailable: boolean; raw: RawEvidence };
    unstaked: { verdict: string; rule: string | null; detail: string | null; rawAvailable: boolean; raw: RawEvidence };
    staked: { verdict: string; txHash: string | null; explorerUrl: string | null; stakeWei: string; stakeEth: string; stakeRegistry: string; stakeReadback: boolean; reason: string };
    pq: { verdict: string; txHash: string | null; explorerUrl: string | null; reason: string };
  };
  ens: {
    wallet: string;
    registerTx: string | null;
    explorerUrl: string | null;
    name: string;
    pqWrite: { verdict: string; reason: string };
    rotation: { verdict: string; reason: string };
  };
  arkiv: { entity: string | null; schema: string; swarmRef: string | null; swarmGateway: string | null; swarmByteEqual: boolean; patchTx: string | null };
  txHistory: { label: string; chain: string; kind: string; hash: string; explorerUrl: string; status: string }[];
  gas: { measuredVerify: string; pinnedRegistered: string; canonicalBudget: string };
};
