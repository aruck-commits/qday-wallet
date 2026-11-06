import { create } from "zustand";

export type Screen = "home" | "hero" | "console" | "key" | "registry" | "identity" | "architecture";

const screenIds: Screen[] = ["hero", "home", "console", "key", "registry", "identity", "architecture"];
const initialScreen = (): Screen => { if (typeof window === "undefined") return "hero"; const requested = new URLSearchParams(window.location.search).get("screen"); return screenIds.includes(requested as Screen) ? (requested as Screen) : "hero"; };

type DemoState = {
  screen: Screen;
  activeChain: "devnet" | "sepolia";
  runnerStep: number;
  running: boolean;
  setScreen: (screen: Screen) => void;
  setActiveChain: (activeChain: "devnet" | "sepolia") => void;
  setRunnerStep: (runnerStep: number) => void;
  setRunning: (running: boolean) => void;
  reset: () => void;
};

export const useDemoStore = create<DemoState>((set) => ({
  screen: initialScreen(),
  activeChain: "devnet",
  runnerStep: 0,
  running: false,
  setScreen: (screen) => set({ screen }),
  setActiveChain: (activeChain) => set({ activeChain }),
  setRunnerStep: (runnerStep) => set({ runnerStep }),
  setRunning: (running) => set({ running }),
  reset: () => set({ screen: "home", runnerStep: 0, running: false }),
}));
