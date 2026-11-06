import type { RawEvidence } from "../lib/evidence";

export function RawWindow({ title, value }: { title: string; value: RawEvidence }) {
  return <details className="raw-window"><summary><span className="window-dots"><i/><i/><i/></span><span>{title}</span><span className="window-toggle">open raw JSON</span></summary><pre>{JSON.stringify(value, null, 2)}</pre></details>;
}
