import type { ComponentType } from "react";
import type { Screen } from "../lib/demoStore";
import { HomeScreen } from "./HomeScreen";
import { SendScreen } from "./SendScreen";
import { KeysScreen } from "./KeysScreen";
import { IdentityScreen } from "./IdentityScreen";
import { RegistryScreen } from "./RegistryScreen";
import { EvidenceScreen } from "./EvidenceScreen";
import { ArchitectureScreen } from "./ArchitectureScreen";
import type { NavIconName } from "../components/NavIcons";

export type NavItem = { id: Screen; label: string; icon: NavIconName };

/** Final v2 nav order (UI spec §1): money path first, machinery, records, map. */
export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "send", label: "Send", icon: "send" },
  { id: "keys", label: "Keys", icon: "key" },
  { id: "identity", label: "Identity", icon: "tag" },
  { id: "registry", label: "Registry", icon: "box" },
  { id: "evidence", label: "Evidence", icon: "certificate" },
  { id: "architecture", label: "Architecture", icon: "map" },
];

/** Legacy ?screen= ids kept navigable (demoStore owns the alias map on init). */
export const LEGACY_ALIASES: Record<string, Screen> = {
  hero: "home",
  console: "send",
  key: "keys",
  wallet: "home",
  compose: "send",
};

export const SCREENS: Record<Screen, ComponentType> = {
  home: HomeScreen,
  send: SendScreen,
  keys: KeysScreen,
  identity: IdentityScreen,
  registry: RegistryScreen,
  evidence: EvidenceScreen,
  architecture: ArchitectureScreen,
};
