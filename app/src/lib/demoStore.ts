import { create } from "zustand";

export type Screen = "hero" | "console" | "key" | "registry" | "identity" | "architecture";

type DemoState = {
  screen: Screen;
  dryRun: boolean;
  runnerStep: number;
  running: boolean;
  setScreen: (screen: Screen) => void;
  setDryRun: (dryRun: boolean) => void;
  setRunnerStep: (runnerStep: number) => void;
  setRunning: (running: boolean) => void;
  reset: () => void;
};

export const useDemoStore = create<DemoState>((set) => ({
  screen: "hero",
  dryRun: true,
  runnerStep: 0,
  running: false,
  setScreen: (screen) => set({ screen }),
  setDryRun: (dryRun) => set({ dryRun }),
  setRunnerStep: (runnerStep) => set({ runnerStep }),
  setRunning: (running) => set({ running }),
  reset: () => set({ screen: "hero", runnerStep: 0, running: false }),
}));
