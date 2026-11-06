import type { ReactNode } from "react";

export function Timeline({ items }: { items: { label: string; status: "done" | "pending"; detail: ReactNode }[] }) {
  return <div className="timeline-new">{items.map((item) => <div className={`timeline-item timeline-${item.status}`} key={item.label}><span className="timeline-dot"/><div><p>{item.label}</p><div>{item.detail}</div></div></div>)}</div>;
}
