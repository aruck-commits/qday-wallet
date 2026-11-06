import { Stamp } from "./Stamp";

export function EmptyProof({ label = "UNAVAILABLE", reason }: { label?: string; reason: string }) {
  return <div className="empty-proof"><Stamp label={label} tone="amber"/><p>{reason}</p></div>;
}
