import "@fontsource-variable/space-grotesk";
import "@fontsource/space-mono/400.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChainStatusChips } from "./components/ChainStatusChips";
import { CopyChip } from "./components/CopyChip";
import { AmbientCanvas } from "./components/AmbientCanvas";
import { NavIcon } from "./components/NavIcons";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useDemoStore, type Screen } from "./lib/demoStore";
import { useWalletStore } from "./lib/walletStore";
import type { DemoEvidence } from "./lib/evidence";
import { NAV_ITEMS, SCREENS, LEGACY_ALIASES } from "./screens/screens";
import demoEvidenceJson from "./data/demoEvidence.json";
import "./style.css";
import "./screen-overrides.css";
import "./brand-font.css";
import "./chi.css";
import "./craft.css";
import "./v2.css";
import "./v3.css";

const evidence = demoEvidenceJson as DemoEvidence;

const TAB_ITEMS = NAV_ITEMS.slice(0, 4);
const SHEET_ITEMS = NAV_ITEMS.slice(4);
const SHEET_SCREENS = new Set<Screen>(SHEET_ITEMS.map((item) => item.id));
const SCREEN_IDS = new Set<string>(NAV_ITEMS.map((item) => item.id));

/** Navigation: pushState keeps browser back/forward working (lib setScreen only replaceState). */
function navigateWithHistory(setScreen: (screen: Screen) => void, screen: Screen) {
  const url = new URL(window.location.href);
  url.searchParams.set("screen", screen);
  window.history.pushState({ screen }, "", url.toString());
  setScreen(screen);
}

function App() {
  const screen = useDemoStore((state) => state.screen);
  const setScreen = useDemoStore((state) => state.setScreen);
  const hasSessionKey = useWalletStore((state) => state.keypair) !== null;
  const reduce = useReducedMotion() ?? false;
  const [sheetOpen, setSheetOpen] = useState(false);

  const navigate = (next: Screen) => {
    setSheetOpen(false);
    navigateWithHistory(setScreen, next);
  };

  useEffect(() => {
    const onPopState = () => {
      const raw = new URLSearchParams(window.location.search).get("screen");
      if (!raw) return;
      const target: Screen | null = SCREEN_IDS.has(raw)
        ? (raw as Screen)
        : LEGACY_ALIASES[raw] ?? null;
      if (target) setScreen(target);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [setScreen]);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  const ActiveScreen = SCREENS[screen];

  return (
    <>
      <AmbientCanvas />
      <div className="v2-shell">
        <header className="v2-header">
          <button className="v2-brand" onClick={() => navigate("home")} aria-label="Q-Day Wallet — go to Home">
            <span className="brand-mark" aria-hidden="true">◈</span>
            <span className="v3-brand-serif">Q-Day</span>
            <span className="v3-brand-grot">Wallet</span>
          </button>
          <div className="v2-header-chips">
            <ChainStatusChips />
            {/* Session-key chip — the header's only PQ signal (spec §2.2). Click → Keys. */}
            <button
              type="button"
              className={`v2-chip ${hasSessionKey ? "v2-chip-violet" : "v2-chip-amber"} v3-sessionchip`}
              onClick={() => navigate("keys")}
              aria-label={hasSessionKey ? "Session key loaded in this tab — open Keys" : "No session key — open Keys to generate one"}
              title={hasSessionKey ? "Session key lives in this tab only — open Keys" : "Generate a session key in Keys"}
            >
              <i className={`v2-dot ${hasSessionKey ? "v2-dot-violet v2-dot-pulse" : "v2-dot-amber v2-dot-hollow"}`} aria-hidden="true" />
              {hasSessionKey ? "ML-DSA-44 · session" : "NO SESSION KEY"}
            </button>
          </div>
          <div className="v2-account">
            <span className="v2-account-name">qdaywallet.eth</span>
            <CopyChip value={evidence.account.address} head={6} tail={4} label="Copy account address" />
          </div>
        </header>

      <div className="v2-body">
        <nav className="v2-sidebar" aria-label="Primary">
          <div className="v2-sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`v2-navitem ${screen === item.id ? "v2-active" : ""}`}
                onClick={() => navigate(item.id)}
                aria-current={screen === item.id ? "page" : undefined}
              >
                <NavIcon name={item.icon} />
                <span className="v2-navlabel">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <main className="v2-main">
          <div className="v2-content">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={screen}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduce ? 0 : -6, transition: { duration: reduce ? 0 : 0.15 } }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }}
              >
                <ActiveScreen />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <footer className="v2-footer">
        <span>
          TEST TOKENS ONLY · CONTRACT LAYER UNAUDITED · EVIDENCE LINKS TO EXPLORERS · ML-DSA-44 VERIFY = {evidence.gas.measuredVerify} GAS ·{" "}
          <a href="https://github.com/aruck-commits/qday-wallet/blob/main/docs/VULNERABILITIES.md" target="_blank" rel="noreferrer">docs/VULNERABILITIES.md ↗</a>
        </span>
      </footer>

      <nav className="v2-tabbar" aria-label="Primary (mobile)">
        {TAB_ITEMS.map((item) => (
          <button
            key={item.id}
            className={screen === item.id ? "v2-active" : ""}
            onClick={() => navigate(item.id)}
            aria-current={screen === item.id ? "page" : undefined}
          >
            <NavIcon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
        <button
          className={SHEET_SCREENS.has(screen) ? "v2-active" : ""}
          onClick={() => setSheetOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
        >
          <NavIcon name="more" />
          <span>More</span>
        </button>
      </nav>

      <AnimatePresence>
        {sheetOpen && (
          <motion.div
            key="more-backdrop"
            className="v2-sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.15 } }}
            onClick={() => setSheetOpen(false)}
          />
        )}
        {sheetOpen && (
          <motion.div
            key="more-sheet"
            className="v2-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="More screens"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : 24, transition: { duration: reduce ? 0 : 0.18 } }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 26 }}
          >
            <p className="v2-kicker">MORE SCREENS</p>
            {SHEET_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`v2-navitem ${screen === item.id ? "v2-active" : ""}`}
                onClick={() => navigate(item.id)}
                aria-current={screen === item.id ? "page" : undefined}
              >
                <NavIcon name={item.icon} />
                <span className="v2-navlabel">{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
