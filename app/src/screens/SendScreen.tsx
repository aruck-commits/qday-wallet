import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { burst } from "../components/AmbientCanvas";
import { CopyChip } from "../components/CopyChip";
import { FrameInspector } from "../components/FrameInspector";
import { fingerprintHex } from "../lib/pq";
import { GasPanel } from "../components/GasPanel";
import { LedgerStamp } from "../components/LedgerStamp";
import { SettlePlate, type Outcome } from "../components/SettlePlate";
import { StageRail, type RailStage } from "../components/StageRail";
import { StatusChip } from "../components/StatusChip";
import evidenceJson from "../data/demoEvidence.json";
import { DEVNET, probeDevnetGateway, probeDevnetReceipt } from "../lib/chain";
import { useDemoStore } from "../lib/demoStore";
import { parseEthToWei, truncateHash } from "../lib/format";
import { useWalletStore, type IntentRecord } from "../lib/walletStore";

type Step = "idle" | "intent_built" | "signed" | "frame_built" | "verified" | "submitting";

type Attempt = { at: number; method: string; result: "unreachable" | "rejected" | "mined"; note: string };

/**
 * Machine → stage mapping (spec §3.1). The lib's `signTransfer` performs
 * digest → sign → verify → frame in ONE call; the UI paints those REAL
 * completed operations in sequence (SIGN ink bar → VERIFY stamp → EXECUTE
 * frame rows) with the 420ms paintGap between each — the whole post-sign
 * sequence stays under 1.5s.
 */
const STAGE_OF: Record<Step, number> = { idle: 0, intent_built: 1, signed: 1, verified: 2, frame_built: 3, submitting: 3 };

const hexToBytes = (hex: string): Uint8Array =>
  Uint8Array.from(hex.replace(/^0x/, "").match(/.{2}/g)?.map((byte) => parseInt(byte, 16)) ?? []);

function fetchWithTimeout(url: string, body: unknown, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: controller.signal,
  }).finally(() => window.clearTimeout(timer));
}

const stageAccents: Record<string, string> = {
  compose: "var(--amber)",
  sign: "var(--violet)",
  verify: "var(--mint)",
  execute: "var(--violet)",
  settle: "var(--ember)",
};

export function SendScreen() {
  const keypair = useWalletStore((state) => state.keypair);
  const signTransfer = useWalletStore((state) => state.signTransfer);
  const setScreen = useDemoStore((state) => state.setScreen);
  const reduce = useReducedMotion() ?? false;

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
  const [gasOpen, setGasOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);

  const mounted = useRef(true);
  const stampRef = useRef<HTMLDivElement | null>(null);
  const plateRef = useRef<HTMLDivElement | null>(null);
  const burstFired = useRef(false);
  const cardRefs = useRef<Partial<Record<"compose" | "sign" | "verify" | "execute" | "settle", HTMLElement | null>>>({});
  const [signatureShaState, setSignatureShaState] = useState<string | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Fresh gateway probe on mount so the probe dot starts honest.
  useEffect(() => {
    let alive = true;
    void probeDevnetGateway().then((result) => { if (alive) setProbe(result.online ? "responding" : "unreachable"); });
    return () => { alive = false; };
  }, []);

  // Accordion defaults + auto-open on mobile (matchMedia state for prop passing).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener("change", onChange);
    if (mq.matches) { setInspectorOpen(false); setGasOpen(false); }
    return () => mq.removeEventListener("change", onChange);
  }, []);
  useEffect(() => { if (record) setInspectorOpen(true); }, [record]);

  // Signature sha256 for the SIGN card (same bytes FrameInspector reports).
  const wireSignature = (record?.wire as { signatures?: { signature?: string }[] } | undefined)?.signatures?.[0]?.signature ?? null;
  useEffect(() => {
    let alive = true;
    if (!wireSignature) { setSignatureShaState(null); return; }
    void fingerprintHex(hexToBytes(wireSignature)).then((sha) => { if (alive) setSignatureShaState(sha); });
    return () => { alive = false; };
  }, [wireSignature]);

  // Smooth-scroll to the plate when an outcome lands (spec §3.3 SETTLE).
  useEffect(() => {
    if (!outcome) return;
    const timer = window.setTimeout(() => {
      plateRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }, reduce ? 0 : 120);
    return () => window.clearTimeout(timer);
  }, [outcome, reduce]);

  const locked = step !== "idle" && step !== "submitting";
  const paintGap = () => new Promise<void>((resolve) => { if (reduce) resolve(); else window.setTimeout(resolve, 420); });

  const resetFlow = () => {
    burstFired.current = false;
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
        if (!mounted.current) return;
        setRecord(built);
        // The lib performed digest → sign → verify → frame in one call; paint
        // the three completed REAL operations in sequence (spec §3.3 order).
        setStep("signed"); await paintGap();
        setStep("verified"); await paintGap();
        setStep("frame_built");
      } catch (error) {
        if (mounted.current) setFlowError(error instanceof Error ? error.message : String(error));
      } finally {
        if (mounted.current) setBusy(false);
      }
      return;
    }
    if (step === "frame_built" || step === "verified") { void attemptSubmission(); return; }
    if (outcome) resetFlow();
  };

  const attemptSubmission = async () => {
    if (!record) return;
    setStep("submitting"); setOutcome(null);
    const finish = (next: Outcome, attempt: Attempt) => {
      if (!mounted.current) return;
      setOutcome(next); setAttempts((prev) => [attempt, ...prev]);
    };
    // Fresh probe, then the real submission POST (8s timeout, 1 retry).
    const probed = await probeDevnetGateway();
    if (mounted.current) setProbe(probed.online ? "responding" : "unreachable");
    const body = { jsonrpc: "2.0", id: 1, method: "eth_sendFrameTransaction", params: [record.wire] };
    try {
      let response: Response;
      try {
        response = await fetchWithTimeout(DEVNET.gateway, body, 8_000);
      } catch {
        response = await fetchWithTimeout(DEVNET.gateway, body, 8_000); // 1 retry
      }
      const parsed = (await response.json()) as {
        result?: unknown;
        error?: { code?: unknown; message?: string; rule?: string; hint?: string; data?: { rule?: string; hint?: string } };
      };
      if (typeof parsed.result === "string" && parsed.result) {
        const hash = parsed.result;
        // Tier A — the gateway's real response hash is the ONLY source of "Admitted."
        finish(
          { kind: "mined", hash, tier: "A", blockNumber: null },
          { at: Date.now(), method: "eth_sendFrameTransaction", result: "mined", note: `gateway returned ${truncateHash(hash)}` },
        );
        // ONE receipt probe — Tier B ("Settled." + block + burst) only on a real blockNumber.
        const receipt = await probeDevnetReceipt(hash);
        if (!mounted.current || receipt.blockNumber === null) return;
        setOutcome((prev) => (prev && prev.kind === "mined" && prev.hash === hash ? { ...prev, tier: "B", blockNumber: receipt.blockNumber } : prev));
        window.setTimeout(() => {
          if (burstFired.current) return;
          const el = stampRef.current;
          if (!el) return;
          burstFired.current = true;
          const rect = el.getBoundingClientRect();
          burst({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, count: 16, tone: "mint" });
        }, reduce ? 0 : 320);
      } else if (parsed.error) {
        const code = parsed.error.code === undefined || parsed.error.code === null ? "—" : String(parsed.error.code);
        const rule = parsed.error.rule ?? parsed.error.data?.rule ?? (typeof parsed.error.message === "string" ? parsed.error.message : "rejection");
        const hint = parsed.error.hint ?? parsed.error.data?.hint ?? null;
        finish(
          { kind: "rejected", raw: parsed, code, rule, hint },
          { at: Date.now(), method: "eth_sendFrameTransaction", result: "rejected", note: `gateway rejected — ${rule}` },
        );
      } else {
        finish(
          { kind: "offline", detail: "gateway returned an empty RPC body" },
          { at: Date.now(), method: "eth_sendFrameTransaction", result: "unreachable", note: "empty RPC body" },
        );
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      finish(
        { kind: "offline", detail },
        { at: Date.now(), method: "eth_sendFrameTransaction", result: "unreachable", note: detail.slice(0, 120) },
      );
    } finally {
      if (mounted.current) setStep("frame_built");
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

  const stageStatus = (index: number): RailStage["status"] => {
    if (outcome) return index === 4 ? "active" : "done";
    const current = STAGE_OF[step];
    if (index < current) return "done";
    if (index === current) return "active";
    return "future";
  };

  const railStages: RailStage[] = [
    { id: "compose", label: "Compose", status: stageStatus(0) },
    { id: "sign", label: "Sign", status: stageStatus(1) },
    { id: "verify", label: "Verify", status: stageStatus(2) },
    { id: "execute", label: "Execute", status: stageStatus(3) },
    { id: "settle", label: "Settle", status: stageStatus(4) },
  ];

  const jumpTo = (id: string) => {
    const el = cardRefs.current[id as keyof typeof cardRefs.current];
    el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const primaryLabel = !keypair
    ? "Generate a key first"
    : step === "idle" ? "Build intent"
      : step === "intent_built" ? "Sign & build frame"
        : step === "submitting" ? "Submitting…"
          : outcome ? "New intent"
            : "Attempt submission";
  const primaryBusy = busy || step === "submitting";
  const primaryClasses = !keypair ? "button-violet" : "button-primary";
  const showPrimaryIn: "compose" | "sign" | "execute" | null = !keypair
    ? "compose"
    : step === "idle" ? "compose"
      : step === "intent_built" ? "sign"
        : step === "frame_built" ? "execute"
          : null;

  const cardClass = (id: string) => {
    const status = stageStatus(railStages.findIndex((s) => s.id === id));
    return `v2-panel v3-stage v3-scrolltarget v3-stage-${status}`;
  };

  const cardStyle = (id: string): CSSProperties => ({ "--stage-accent": stageAccents[id] } as CSSProperties);

  const setCardRef = (id: keyof typeof cardRefs.current) => (el: HTMLElement | null) => { cardRefs.current[id] = el; };

  const sigShaShort = signatureShaState ? `${signatureShaState.slice(0, 6)}…${signatureShaState.slice(-6)}` : null;
  const stageReached = (index: number) => outcome !== null || STAGE_OF[step] >= index;

  return (
    <section className="screen">
      <div className="screen-heading">
        <div>
          <p className="eyebrow">SEND / PQ-AUTHORIZED SPEND</p>
          <h2>Send</h2>
          <p className="screen-lede">Signs a real spend intent with ML-DSA-44, builds the real EIP-8141 frame, verifies it locally, and reports exactly what the network said — admitted, settled, refused, or nothing broadcast. No simulated lanes.</p>
        </div>
        <button type="button" className="button-quiet" onClick={resetFlow} aria-label="Reset the send flow">Reset</button>
      </div>

      <StageRail stages={railStages} onJump={jumpTo} />

      <div className="v2-send-grid">
        <div className="v2-send-flow">
          {/* ---------- 1 COMPOSE ---------- */}
          <section
            ref={setCardRef("compose")}
            className={cardClass("compose")}
            style={cardStyle("compose")}
            aria-label="Compose stage"
          >
            <div className="v2-panel-head">
              <div>
                <p className="v2-kicker">STAGE 01 / COMPOSE</p>
                <h3>Spend authorization</h3>
              </div>
              {!keypair && <StatusChip tone="amber">KEY REQUIRED</StatusChip>}
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
              <div className="v2-irow"><b>execution limit</b><span>3,200,000</span></div>
              <p className="v2-note-amber">devnet contract wallets start at nonce 8 — HegotaSupport creates 7 helper contracts. Session keys sign with pqNonce 0 until registered via rotatePqKey.</p>
            </details>
            <p className="v2-caption" style={{ marginTop: 10 }}>Intent authorizes a spend on QDayWallet {truncateHash(evidenceJson.deployments.wallet)} (devnet 1337).</p>
            {record && (
              <motion.div
                className="v2-irow"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }}
              >
                <b>intent</b>
                <span>32 B · keccak256(wallet, recipient, amount, nonce, chainId) · <CopyChip value={record.digest} label="Copy intent digest" /></span>
              </motion.div>
            )}
            {showPrimaryIn === "compose" && (
              <div className="v2-send-primary-desktop" style={{ marginTop: 14 }}>
                <button type="button" className={primaryClasses} onClick={() => void advance()} disabled={primaryBusy} aria-label={primaryLabel}>
                  {primaryLabel}
                </button>
              </div>
            )}
          </section>

          {/* ---------- 2 SIGN ---------- */}
          <section
            ref={setCardRef("sign")}
            className={cardClass("sign")}
            style={cardStyle("sign")}
            aria-label="Sign stage"
          >
            <div className="v2-panel-head">
              <div>
                <p className="v2-kicker">STAGE 02 / SIGN</p>
                <h3>ML-DSA-44 signature</h3>
              </div>
              {record && <StatusChip tone="violet">signed · session key</StatusChip>}
            </div>
            {record ? (
              <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.06 } } }}>
                <motion.div className="v2-irow" variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
                  <b>signature</b>
                  <span>2,420 B · ML-DSA-44</span>
                </motion.div>
                <motion.div className="v2-irow" variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}>
                  <b>sha256</b>
                  <span><CopyChip value={signatureShaState} display={sigShaShort ?? undefined} label="Copy the signature sha256" /></span>
                </motion.div>
                <motion.div className="v3-inkbar" variants={{ hidden: { opacity: 1 }, show: { opacity: 1 } }} aria-hidden="true">
                  <motion.i
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.5, ease: "easeOut" }}
                  />
                </motion.div>
                <p className="v2-caption" style={{ marginTop: 10 }}>signed by the session key in this tab — the secret never left the browser.</p>
              </motion.div>
            ) : (
              <p className="v2-caption">the session key signs the intent digest here — 2,420 bytes, computed locally.</p>
            )}
            {showPrimaryIn === "sign" && (
              <div className="v2-send-primary-desktop" style={{ marginTop: 14 }}>
                <button type="button" className={primaryClasses} onClick={() => void advance()} disabled={primaryBusy} aria-label={primaryLabel}>
                  {primaryLabel}
                </button>
              </div>
            )}
          </section>

          {/* ---------- 3 VERIFY ---------- */}
          <section
            ref={setCardRef("verify")}
            className={cardClass("verify")}
            style={cardStyle("verify")}
            aria-label="Verify stage"
          >
            <div className="v2-panel-head">
              <div>
                <p className="v2-kicker">STAGE 03 / VERIFY</p>
                <h3>Local verification</h3>
              </div>
            </div>
            {stageReached(2) && record ? (
              <>
                <div className="v3-ministamp">
                  <LedgerStamp word="Verified." subline="LOCAL · ML-DSA-44" tone="mint" width={96} mini />
                </div>
                <p className="v2-caption" style={{ textAlign: "center", marginTop: 6 }}>
                  local ml_dsa44.verify = true — the same ML-DSA-44 check MLDSAVerifier runs on-chain.
                </p>
                <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
                  <span className="v3-quietchip">signed + locally verified — nothing broadcast yet</span>
                </div>
              </>
            ) : (
              <p className="v2-caption">the signature is checked against the digest here — the same math the on-chain verifier runs.</p>
            )}
          </section>

          {/* ---------- 4 EXECUTE ---------- */}
          <section
            ref={setCardRef("execute")}
            className={cardClass("execute")}
            style={cardStyle("execute")}
            aria-label="Execute stage"
          >
            <div className="v2-panel-head">
              <div>
                <p className="v2-kicker">STAGE 04 / EXECUTE</p>
                <h3>Frame submission</h3>
              </div>
              <StatusChip tone={probe === "responding" ? "mint" : probe === "unreachable" ? "red" : "neutral"}>
                <i className={`v2-dot ${probe === "responding" ? "v2-dot-mint" : probe === "unreachable" ? "v2-dot-red" : "v2-dot-amber v2-dot-hollow"}`} aria-hidden="true" />
                {probe === "responding" ? "responding" : probe === "unreachable" ? "unreachable" : "unknown"}
              </StatusChip>
            </div>
            {record && (
              <motion.div
                className="v2-irow"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduce ? { duration: 0 } : { duration: 0.25 }}
              >
                <b>frame</b>
                <span><span className="v2-chip v2-chip-violet">txType 0x06 · VERIFY (1) + SENDER (2) · ARBITRARY (0x0)</span></span>
              </motion.div>
            )}
            <div className="v2-irow"><b>endpoint</b><span>eth_sendFrameTransaction</span></div>
            <div className="v2-irow"><b>gateway</b><span className="v2-gw">{DEVNET.gateway.replace("https://", "")}</span></div>
            {attempts.length === 0 ? (
              <p className="v2-caption" style={{ marginTop: 10 }}>no attempts this session — attempts appear here with their real result.</p>
            ) : (
              <div style={{ marginTop: 10 }}>
                {attempts.map((attempt) => (
                  <motion.div className="v2-attempt" key={attempt.at} initial={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={reduce ? { duration: 0 } : { duration: 0.16 }}>
                    <time dateTime={new Date(attempt.at).toISOString()}>{new Date(attempt.at).toLocaleTimeString()}</time>
                    <span>
                      {attempt.method} ·{" "}
                      <StatusChip tone={attempt.result === "mined" ? "mint" : attempt.result === "unreachable" ? "amber" : "red"}>{attempt.result}</StatusChip>{" "}
                      {attempt.note}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
            {showPrimaryIn === "execute" && (
              <div className="v2-send-primary-desktop" style={{ marginTop: 14 }}>
                <button type="button" className={primaryClasses} onClick={() => void advance()} disabled={primaryBusy} aria-label={primaryLabel}>
                  {primaryLabel}
                </button>
              </div>
            )}
          </section>

          {/* ---------- 5 SETTLE (card stays a placeholder; the plate lands full-width below) ---------- */}
          <section
            ref={setCardRef("settle")}
            className={cardClass("settle")}
            style={cardStyle("settle")}
            aria-label="Settle stage"
          >
            <div className="v2-panel-head">
              <div>
                <p className="v2-kicker">STAGE 05 / SETTLE</p>
                <h3>Network verdict</h3>
              </div>
              {outcome && <StatusChip tone={outcome.kind === "mined" ? "mint" : outcome.kind === "offline" ? "amber" : "red"}>{outcome.kind}</StatusChip>}
            </div>
            <p className="v2-caption">the network verdict lands here — and across the full page below: Admitted, Settled, refused, or Nothing was broadcast.</p>
          </section>

          {flowError && (
            <motion.div
              className="v2-outcome v2-outcome-rejected"
              role="alert"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }}
            >
              <h3 className="v3-lead-serif" style={{ color: "var(--red)", fontSize: 24 }}>local verification failed — flow halted</h3>
              <p>{flowError}</p>
              <p className="v2-caption">Nothing left the browser. Fix the input or regenerate the session key, then run the flow again.</p>
              <a href="https://github.com/aruck-commits/qday-wallet/blob/main/docs/VULNERABILITIES.md" target="_blank" rel="noreferrer">diagnostics: docs/VULNERABILITIES.md ↗</a>
            </motion.div>
          )}
        </div>

        <div className="v2-send-inspect">
          <FrameInspector
            record={record}
            {...(isMobile ? { open: inspectorOpen, onToggle: () => setInspectorOpen((open) => !open) } : {})}
          />
          <GasPanel
            {...(isMobile ? { open: gasOpen, onToggle: () => setGasOpen((open) => !open) } : {})}
          />
        </div>
      </div>

      {/* ---------- SETTLE plate — full width below the grid ---------- */}
      <div ref={plateRef} />
      <AnimatePresence>
        {outcome && (
          <div style={{ marginTop: 16 }} key="settle-plate">
            <SettlePlate
              outcome={outcome}
              record={record}
              reduce={reduce}
              onNewIntent={resetFlow}
              onExport={exportFrame}
              onEvidence={() => setScreen("evidence")}
              onRetry={() => { setOutcome(null); void attemptSubmission(); }}
              stampRef={stampRef}
            />
          </div>
        )}
      </AnimatePresence>

      {/* mobile sticky action bar */}
      <div className="v2-send-actionbar">
        {step === "submitting" && <span className="v2-caption" style={{ marginRight: 10 }} role="status">broadcasting…</span>}
        <button type="button" className={primaryClasses} onClick={() => void advance()} disabled={primaryBusy} aria-label={primaryLabel} style={{ flex: 1 }}>
          {primaryLabel}
        </button>
      </div>
    </section>
  );
}
