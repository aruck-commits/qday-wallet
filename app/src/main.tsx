import "@fontsource-variable/space-grotesk";
import "@fontsource/space-mono/400.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import evidenceJson from "./data/demoEvidence.json";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useDemoStore, type Screen } from "./lib/demoStore";
import type { DemoEvidence } from "./lib/evidence";
import { S0Hero } from "./screens/S0Hero";
import { S1WalletHome } from "./screens/S1WalletHome";
import { S1Console } from "./screens/S1Console";
import { S2Key } from "./screens/S2Key";
import { S3Registry } from "./screens/S3Registry";
import { S4Identity } from "./screens/S4Identity";
import { S5Architecture } from "./screens/S5Architecture";
import "./style.css";
import "./screen-overrides.css";
import "./brand-font.css";
import "./chi.css";
import "./craft.css";

const evidence = evidenceJson as DemoEvidence;
const nav: { id: Screen; label: string }[] = [
  { id: "hero", label: "Overview" }, { id: "home", label: "Wallet" }, { id: "console", label: "Compose" }, { id: "key", label: "Key" },
  { id: "registry", label: "Registry" }, { id: "identity", label: "Identity" }, { id: "architecture", label: "Architecture" },
];

function ScreenView({ screen, navigate }: { screen: Screen; navigate: (screen: Screen) => void }) {
  if (screen === "home") return <S1WalletHome evidence={evidence} navigate={navigate}/>;
  if (screen === "hero") return <S0Hero evidence={evidence} navigate={navigate}/>;
  if (screen === "console") return <S1Console evidence={evidence}/>;
  if (screen === "key") return <S2Key evidence={evidence}/>;
  if (screen === "registry") return <S3Registry evidence={evidence}/>;
  if (screen === "identity") return <S4Identity evidence={evidence}/>;
  return <S5Architecture evidence={evidence}/>;
}

function App() {
  const { screen, activeChain, setScreen, setActiveChain } = useDemoStore();
  const block = activeChain === "devnet" ? evidence.live.devnet.lastBlock : evidence.live.sepolia.latestBlock;
  const chainBalance = activeChain === "devnet" ? evidence.live.devnet.balanceEth : null;
  const asOf = new Date(evidence.generatedAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
  return <div className="app-shell"><header className="account-header"><button className="brand" onClick={() => setScreen("home")}><span className="brand-mark">◈</span> qday-wallet</button><div className="chain-switcher" aria-label="Evidence chain"><button className={activeChain === "devnet" ? "chain-active" : ""} onClick={() => setActiveChain("devnet")}>DEVNET <b>1337</b></button><button className={activeChain === "sepolia" ? "chain-active" : ""} onClick={() => setActiveChain("sepolia")}>SEPOLIA <b>11155111</b></button></div><div className="account-meta">{chainBalance && <span className="balance-chip">{chainBalance} ETH</span>}<span className="account-chip">{evidence.account.address.slice(0, 6)}…{evidence.account.address.slice(-4)} <b>ML-DSA-44</b></span><span className="block-ticker"><i/> block {block?.toLocaleString("en-IN") ?? "—"}</span></div></header><div className="evidence-caption">read-only evidence export · as of {asOf} IST</div><nav className="tab-rail" aria-label="Demo screens">{nav.map((item) => <button key={item.id} className={screen === item.id ? "tab-active" : ""} onClick={() => setScreen(item.id)}>{item.label}</button>)}</nav><main className="content-grid"><ScreenView screen={screen} navigate={setScreen}/></main><footer className="limitation-strip"><span>{evidence.protocol.name} verifies in {evidence.gas.measuredVerify} gas · alt-mempool evidence</span><span>contract layer unaudited demo</span><span>read-only build export</span></footer></div>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><ErrorBoundary><App/></ErrorBoundary></StrictMode>);
