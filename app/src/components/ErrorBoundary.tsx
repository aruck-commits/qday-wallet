import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error): State { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Q-Day UI error", error, info); }
  render() { if (!this.state.error) return this.props.children; return <main className="error-screen"><div className="error-card"><p className="eyebrow">UI DIAGNOSTICS</p><h1>Evidence view unavailable.</h1><p>{this.state.error.message}</p><button className="button-primary" onClick={() => this.setState({ error: null })}>Retry view</button></div></main>; }
}
