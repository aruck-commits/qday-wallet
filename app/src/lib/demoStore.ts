import { create } from "zustand";

export type Screen = "home" | "send" | "keys" | "identity" | "registry" | "evidence" | "architecture";

const screenIds: Screen[] = ["home", "send", "keys", "identity", "registry", "evidence", "architecture"];

/** Legacy ?screen= ids from the v1 demo map onto their v2 equivalents. */
const legacyAliases: Record<string, Screen> = {
  hero: "home",
  console: "send",
  key: "keys",
  wallet: "home",
  compose: "send",
};

const initialScreen = (): Screen => {
  if (typeof window === "undefined") return "home";
  const requested = new URLSearchParams(window.location.search).get("screen");
  if (requested && screenIds.includes(requested as Screen)) return requested as Screen;
  if (requested && legacyAliases[requested]) return legacyAliases[requested];
  return "home";
};

type DemoState = {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  reset: () => void;
};

export const useDemoStore = create<DemoState>((set) => ({
  screen: initialScreen(),
  setScreen: (screen) => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("screen", screen);
      window.history.replaceState(null, "", url.toString());
    }
    set({ screen });
  },
  reset: () => set({ screen: "home" }),
}));
