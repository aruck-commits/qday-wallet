import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CopyChip } from "../components/CopyChip";
import { FrameInspector } from "../components/FrameInspector";
import { GasPanel } from "../components/GasPanel";
import { RawWindow } from "../components/RawWindow";
import { Stamp } from "../components/Stamp";
import { StatusChip } from "../components/StatusChip";
import evidenceJson from "../data/demoEvidence.json";
import { DEVNET, probeDevnetGateway } from "../lib/chain";
import { useDemoStore } from "../lib/demoStore";
import { formatGas, parseEthToWei, truncateHash } from "../lib/format";
import { useWalletStore, type IntentRecord } from "../lib/walletStore";

type Step = "idle" | "intent_built" | "signed" | "frame_built" | "verified" | "submitting";

type Outcome =
  | { kind: "offline"; detail: string | null }
  | { kind: "rejected"; raw: unknown; code: string; rule: string; hint: string | null }
  | { kind: "mined"; hash: string };

type Attempt = { at: number; method: string; result: "unreachable" | "rejected" | "mined"; note: string };

const STEPS = [
  "Intent built",
  "Signed — ML-DSA-44",
  "Frame built — 0x06",
  "Verified locally",
  "Submission attempted",
  "Network verdict",
];

const DEVNET_OFFLINE_SINCE = "07 Nov 2026";

function fetchWithTimeout(url: string, body: unknown, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timer));
}

export function SendScreen() {
  const keypair = useWalletStore((state) => state.keypair);
  const signTransfer = useWalletStore((state) => state.signTransfer);
  const setScreen = useDemoStore((state) => state.setScreen);
  const reduce = useReducedMotion();

  const [step, setStep] = useState<Step>("idle");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [record, setRecord] = useState<IntentRecord | null>(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState<"unknown" | "responding" | "unreachable">("unknown");
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  // Fresh gateway probe on mount so the probe dot starts honest.
  useEffect(() => {
    let alive = true;
    void probeDevnetGateway().then((result) => { if (alive) setProbe(result.online ? "responding" : "unreachable"); });
    return () => { alive = false; };
  }, []);

  // Collapsed inspector by default on <768 (opens automatically once a frame exists).
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setInspectorOpen(false);
  }, []);
  useEffect(() => { if (record) setInspectorOpen(true); }, [record]);

  const locked = step !== "idle" && step !== "submitting";
  const paintGap = () => new Promise<void>((resolve) => { if (reduce) resolve(); else window.setTimeout(resolve, 280); });

  const resetFlow = () => {
    setStep("idle"); setOutcome(null); setRecord(null); setRecipient(""); setAmount("");
    setRecipientError(null); setAmountError(null); setFlowError(null);
  };

  const validate = (): { recipient: string; amountEth: string } | null => {
    const cleanRecipient = recipient.trim();
    const cleanAmount = amount.trim();
    const rErr = /^0x[0-9a-fA-F]{40}$/.test(cleanRecipient) ? null : "recipient must be a 0x address (40 hex characters)";
    const wei = parseEthToWei(cleanAmount);
    const aErr = cleanAmount.length === 0 ? "amount is required" : wei === null || wei <= 0n ? "amount must be a positive ETH value with at most 8 decimals" : null;
    setRecipientError(rErr); setAmountError(aErr);
    if (rErr || aErr || !wei) return null;
    return { recipient: cleanRecipient, amountEth: cleanAmount };
  };

  const advance = async () => {
    if (!keypair) { setScreen("keys"); return; }
    if (step === "idle") {
      if (validate()) setStep("intent_built");
      return;
    }
    if (step === "intent_built") {
      const input = validate();
      if (!input) return;
      setBusy(true); setFlowError(null);
      try {
        const built = await signTransfer(input);
        setRecord(built);
        // The lib performs digest → sign → verify → frame in one call; paint the
        // three completed REAL operations in sequence for the step tracker.
        setStep("signed"); await paintGap();
        setStep("frame_built"); await paintGap();
        setStep("verified");
      } catch (error) {
        setFlowError(error instanceof Error ? error.message : String(error));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (step === "verified") { void attemptSubmission(); return; }
    if (outcome) resetFlow();
  };

  const attemptSubmission = async () => {
    if (!record) return;
    setStep("submitting"); setOutcome(null);
    const finish = (next: Outcome, attempt: Attempt, nextStep: Step) => {
      setOutcome(next); setAttempts((prev) => [attempt, ...prev]); setStep(nextStep);
    };
    // Fresh probe, then the real submission POST (8s timeout, 1 retry).
    const probed = await probeDevnetGateway();
    setProbe(probed.online ? "responding" : "unreachable");
    const body = { jsonrpc: "2.0", id: 1, method: "eth_sendFrameTransaction", params: [record.wire] };
    try {
      let response: Response;
      try {
        response = await fetchWithTimeout(DEVNET.gateway, body, 8_000) as Response;
      } catch {
        response = await fetchWithTimeout(DEVNET.gateway, body, 8_000) as Response; // 1 retry
      }
      const parsed = (await response.json()) as {
        result?: unknown;
        error?: { code?: unknown; message?: string; rule?: string; hint?: string; data?: { rule?: string; hint?: string } };
      };
      if (typeof parsed.result === "string" && parsed.result) {
        finish({ kind: "mined", hash: parsed.result }, { at: Date.now(), method: "eth_sendFrameTransaction", result: "mined", note: `gateway returned ${truncateHash(parsed.result)}` }, "verified");
      } else if (parsed.error) {
        const code = parsed.error.code === undefined || parsed.error.code === null ? "—" : String(parsed.error.code);
        const rule = parsed.error.rule ?? parsed.error.data?.rule ?? (typeof parsed.error.message === "string" ? parsed.error.message : "rejection");
        const hint = parsed.error.hint ?? parsed.error.data?.hint ?? null;
        finish({ kind: "rejected", raw: parsed, code, rule, hint }, { at: Date.now(), method: "eth_sendFrameTransaction", result: "rejected", note: `gateway rejected — ${rule}` }, "verified");
      } else {
        finish({ kind: "offline", detail: "gateway returned an empty RPC body" }, { at: Date.now(), method: "eth_sendFrameTransaction", result: "unreachable", note: "empty RPC body" }, "verified");
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      finish(
        { kind: "offline", detail },
        { at: Date.now(), method: "eth_sendFrameTransaction", result: "unreachable", note: detail.slice(0, 120) },
        "verified",
      );
    }
  };

  const exportFrame = () => {
    if (!record) return;
    const payload = {
      ...record,
      gateway: DEVNET.gateway,
      exportedAt: new Date().toISOString(),
      note: "Signed ML-DSA-44 frame for eth_sendFrameTransaction. The devnet gateway was unreachable at export time — nothing was broadcast.",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `qday-frame-${record.txHash}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const primaryLabel = !keypair
    ? "Generate a key first"
    : step === "idle" ? "Build intent"
      : step === "intent_built" ? "Sign & build frame"
        : step === "submitting" ? "Submitting…"
          : outcome ? "New intent"
            : step === "verified" ? "Attempt submission"
              : "Sign & build frame";
  const primaryBusy = busy || step === "submitting";
  const primaryClasses = !keypair ? "button-violet" : "button-primary";

  const stepState = (index: number): "done" | "now" | "todo" => {
    const order: Step[] = ["idle", "intent_built", "signed", "frame_built", "verified", "submitting"];
    const current = order.indexOf(step);
    if (step === "submitting" && index === 4) return "now";
    if (outcome && index === 5) return "done";
    if (index < current) return "done";
    if (index === current && step !== "idle") return "now";
    return "todo";
  };

  return (
    <section className="screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">SEND / PQ-AUTHORIZED SPEND</p>
          <h2>Send</h2>
          <p className="screen-lede">Signs a real spend intent with ML-DSA-44, builds the real EIP-8141 frame, verifies it locally, and reports exactly what the network said. No simulated lanes.</p>
        </div>
      </div>

      <div className="v2-send-grid">
        <div className="v2-send-flow">
          <div className="v2-panel">
            <div className="v2-panel-head">
              <div>
                <p className="v2-kicker">INTENT</p>
                <h3>Spend authorization</h3>
              </div>
              {record && <StatusChip tone="violet">signed · session key</StatusChip>}
            </div>
            <div className="v2-field">
              <label htmlFor="send-recipient">Recipient</label>
              <input
                id="send-recipient" className="v2-input" spellCheck={false} autoComplete="off"
                placeholder="0x…" value={recipient} disabled={locked}
                onChange={(event) => { setRecipient(event.target.value); if (recipientError) setRecipientError(null); }}
                aria-invalid={recipientError ? true : undefined}
              />
              {recipientError && <p className="v2-error" role="alert">{recipientError}</p>}
            </div>
            <div className="v2-field">
              <label htmlFor="send-amount">Amount (ETH)</label>
              <input
                id="send-amount" className="v2-input v2-input-num" inputMode="decimal" autoComplete="off"
                placeholder="0.012" value={amount} disabled={locked}
                onChange={(event) => { setAmount(event.target.value); if (amountError) setAmountError(null); }}
                aria-invalid={amountError ? true : undefined}
              />
              {amountError && <p className="v2-error" role="alert">{amountError}</p>}
            </div>
            <details className="v2-advanced">
              <summary>advanced</summary>
              <div className="v2-irow"><b>chainId</b><span>1337</span></div>
              <div className="v2-irow"><b>pqNonce (session)</b><span>0</span></div>
              <div className="v2-irow"><b>execution limit</b><span>{formatGas(3_200_000)}</span></div>
              <p className="v2-note-amber">devnet contract wallets start at nonce 8 — HegotaSupport creates 7 helper contracts. Session keys sign with pqNonce 0 until registered via rotatePqKey.</p>
            </details>
            <p className="v2-caption" style={{ marginTop: 10 }}>Intent authorizes a spend on QDayWallet {truncateHash(evidenceJson.deployments.wallet)} (devnet 1337).</p>
            <div className="v2-send-primary-desktop" style={{ marginTop: 14 }}>
              <button type="button" className={primaryClasses} onClick={() => void advance()} disabled={primaryBusy} aria-label={primaryLabel}>
                {primaryLabel}
              </button>
            </div>
          </div>

          <div className="v2-panel">
            <div className="v2-panel-head">
              <div>
                <p className="v2-kicker">FLOW</p>
                <h3>Step tracker</h3>
              </div>
              <button type="button" className="button-quiet" onClick={resetFlow} aria-label="Reset the send flow">Reset</button>
            </div>
            <div className="v2-step-list" aria-label="Send flow progress">
              {STEPS.map((label, index) => {
                const state = stepState(index);
                const isKeyRequired = index === 0 && !keypair;
                return (
                  <div className={`v2-step ${state === "done" ? "v2-step-done" : state === "now" ? "v2-step-now" : ""}`} key={label}>
                    <span className="v2-step-dot" aria-hidden="true" />
                    <span className="v2-step-label">
                      {index + 1}. {isKeyRequired ? "KEY REQUIRED" : label}
                      {isKeyRequired && <span className="v2-step-tag"><StatusChip tone="amber">generate a session key in Keys</StatusChip></span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {flowError && (
            <div className="v2-outcome v2-outcome-rejected" role="alert">
              <h3>Flow halted</h3>
              <p>{flowError}</p>
              <p className="v2-caption">Nothing left the browser. Fix the input or regenerate the session key, then run the flow again.</p>
            </div>
          )}

          {outcome?.kind === "offline" && (
            <motion.div className="v2-outcome v2-outcome-offline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }} role="status">
              <h3>NETWORK OFFLINE — nothing was broadcast</h3>
              <p>altmempoolgateway.forshtat.com did not respond to the live probe. Your signature, frame, and local verification are real; the devnet that would admit this frame has been offline since {DEVNET_OFFLINE_SINCE}.</p>
              {outcome.detail && <p className="v2-caption">fetch: {outcome.detail}</p>}
              <div className="v2-outcome-actions">
                <button type="button" className="button-quiet" onClick={exportFrame} aria-label="Export the signed frame as JSON">Export signed frame (JSON)</button>
                <button type="button" className="button-quiet" onClick={() => setScreen("evidence")} aria-label="Open the Evidence screen">View Evidence →</button>
              </div>
            </motion.div>
          )}

          {outcome?.kind === "rejected" && (
            <motion.div className="v2-outcome v2-outcome-rejected" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }} role="status">
              <Stamp label={`REJECTED · code ${outcome.code}`} detail={outcome.rule} tone="red" />
              {outcome.hint && <p>{outcome.hint}</p>}
              <RawWindow title="gateway response · verbatim" value={outcome.raw} />
            </motion.div>
          )}

          {outcome?.kind === "mined" && (
            <motion.div className="v2-outcome v2-outcome-mined" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }} role="status">
              <h3><StatusChip tone="mint">SUBMITTED</StatusChip></h3>
              <p>frame <span className="v2-mono">{truncateHash(outcome.hash)}</span> — the gateway accepted the transaction.</p>
              <p><a href={DEVNET.explorerTx(outcome.hash)} target="_blank" rel="noreferrer">explorer ↗</a></p>
            </motion.div>
          )}

          {/* mobile sticky action bar */}
          <div className="v2-send-actionbar">
            <button type="button" className={primaryClasses} onClick={() => void advance()} disabled={primaryBusy} aria-label={primaryLabel}>
              {primaryLabel}
            </button>
          </div>
        </div>

        <div className="v2-send-inspect">
          <FrameInspector record={record} open={inspectorOpen} onToggle={() => setInspectorOpen((open) => !open)} />
          <GasPanel />
          <section className="v2-panel" aria-label="Submission panel">
            <div className="v2-panel-head">
              <div>
                <p className="v2-kicker">SUBMISSION</p>
                <h3>Gateway attempts</h3>
              </div>
              <StatusChip tone={probe === "responding" ? "mint" : probe === "unreachable" ? "red" : "neutral"}>
                <i className={`v2-dot ${probe === "responding" ? "v2-dot-mint" : probe === "unreachable" ? "v2-dot-red" : "v2-dot-amber v2-dot-hollow"}`} aria-hidden="true" />
                {probe === "responding" ? "responding" : probe === "unreachable" ? "unreachable" : "unknown"}
              </StatusChip>
            </div>
            <div className="v2-irow"><b>endpoint</b><span>eth_sendFrameTransaction</span></div>
            <div className="v2-irow"><b>gateway</b><span className="v2-gw">{DEVNET.gateway.replace("https://", "")}</span></div>
            {attempts.length === 0 ? (
              <p className="v2-caption" style={{ marginTop: 10 }}>no attempts this session — attempts appear here with their real result.</p>
            ) : (
              <div style={{ marginTop: 10 }}>
                {attempts.map((attempt) => (
                  <div className="v2-attempt" key={attempt.at}>
                    <time dateTime={new Date(attempt.at).toISOString()}>{new Date(attempt.at).toLocaleTimeString()}</time>
                    <span>
                      {attempt.method} ·{" "}
                      <StatusChip tone={attempt.result === "mined" ? "mint" : "red"}>{attempt.result}</StatusChip>{" "}
                      {attempt.note}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
