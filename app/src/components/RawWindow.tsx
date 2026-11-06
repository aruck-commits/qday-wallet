import type { ReactNode } from "react";
import type { RawEvidence } from "../lib/evidence";

const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?)|\b(true|false)\b|\bnull\b/g;

export function highlight(json: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of json.matchAll(TOKEN)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(json.slice(last, start));
    if (match[1] !== undefined) {
      if (match[2] !== undefined) {
        nodes.push(<i className="json-key" key={key++}>{match[1]}</i>);
        nodes.push(match[2]);
      } else nodes.push(<i className="json-string" key={key++}>{match[1]}</i>);
    } else if (match[3] !== undefined) nodes.push(<i className="json-number" key={key++}>{match[3]}</i>);
    else if (match[4] !== undefined) nodes.push(<i className="json-bool" key={key++}>{match[4]}</i>);
    else nodes.push(<i className="json-null" key={key++}>null</i>);
    last = start + match[0].length;
  }
  if (last < json.length) nodes.push(json.slice(last));
  return nodes;
}

export function RawWindow({ title, value }: { title: string; value: RawEvidence }) {
  return <details className="raw-window" open><summary><span className="window-dots"><i/><i/><i/></span><span>{title}</span><span className="window-toggle">toggle raw JSON</span></summary><pre>{highlight(JSON.stringify(value, null, 2))}</pre></details>;
}
