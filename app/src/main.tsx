import "@fontsource-variable/space-grotesk";
import "@fontsource/space-mono/400.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import evidenceJson from "./data/demoEvidence.json";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { useDemoStore, type Screen } from "./lib/demoStore";
import type { DemoEvidence } from "./lib/evidence";
import { S0Hero } from "./screens/S0Hero";
import { S1Console } from "./screens/S1Console";
import { S2Key } from "./screens/S2Key";
import { S3Registry } from "./screens/S3Registry";
import { S4Identity } from "./screens/S4Identity";
import { S5Architecture } from "./screens/S5Architecture";
import "./style.css";
import "./screen-overrides.css";
import "./brand-font.css";

const evidence = evidenceJson as DemoEvidence;
const nav: { id: Screen; label: string }[] = [{ id: "hero", label: "S0 / HERO" }, { id: "console", label: "S1 / DEMO" }, { id: "key", label: "S2 / KEY" }, { id: "registry", label: "S3 / REGISTRY" }, { id: "identity", label: "S4 / IDENTITY" }, { id: "architecture", label: "S5 / ARCH" }];

function ScreenView({ screen, navigate }: { screen: Screen; navigate: (screen: Screen) => void }) {
  if (screen === "hero") return <S0Hero evidence={evidence} navigate={navigate}/>;
  if (screen === "console") return <S1Console evidence={evidence}/>;
  if (screen === "key") return <S2Key evidence={evidence}/>;
  if (screen === "registry") return <S3Registry evidence={evidence}/>;
  if (screen === "identity") return <S4Identity evidence={evidence}/>;
  return <S5Architecture evidence={evidence}/>;
}

function App() {
  const { screen, dryRun, setScreen, setDryRun } = useDemoStore();
  return <div className="app-shell"><header className="topbar"><button className="brand" onClick={() => setScreen("hero")}><span className="brand-mark">◈</span> qday-wallet</button><div className="topbar-right"><span className={`mode-chip ${dryRun ? "mode-dry" : "mode-live"}`}><i/> {dryRun ? "DRY RUN" : "LIVE"}</span><button className="mode-toggle" onClick={() => setDryRun(!dryRun)}>toggle</button></div></header><nav className="tab-rail" aria-label="Demo screens">{nav.map((item) => <button key={item.id} className={screen === item.id ? "tab-active" : ""} onClick={() => setScreen(item.id)}>{item.label}</button>)}</nav><main className="content-grid"><ScreenView screen={screen} navigate={setScreen}/></main><footer className="limitation-strip"><span>{evidence.protocol.name} verifies in {evidence.gas.measuredVerify} gas - live on alt-mempool</span><span>contract layer unaudited demo</span><span>evidence generated {evidence.generatedAt.slice(0, 10)}</span></footer></div>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><ErrorBoundary><App/></ErrorBoundary></StrictMode>);
