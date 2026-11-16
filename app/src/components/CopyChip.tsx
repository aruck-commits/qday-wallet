import { useState } from "react";
import { truncateHash } from "../lib/format";

/**
 * Truncated value (lib/format truncateHash, default 6+4) + full value on hover
 * (title) + a quiet copy button that copies the FULL value.
 */
export function CopyChip({
  value, head = 6, tail = 4, prefix, display, label, className,
}: {
  value: string | null | undefined;
  head?: number;
  tail?: number;
  /** small label rendered before the truncated value (e.g. "sha256:") */
  prefix?: string;
  /** explicit display override when lib truncation does not fit (e.g. fingerprints) */
  display?: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const text = value ?? "";
  const shown = display ?? truncateHash(text, head, tail);
  const copy = async () => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); } catch { /* clipboard unavailable — title still holds the full value */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  return (
    <span className={`v2-copychip ${className ?? ""}`} title={text || undefined}>
      {prefix && <span className="v2-copychip-prefix">{prefix}</span>}
      <span className="v2-copychip-value">{text ? shown : "—"}</span>
      <button type="button" className="v2-copychip-btn" onClick={copy} aria-label={label ?? `Copy ${shown}`} disabled={!text}>
        {copied ? "copied" : "copy"}
      </button>
    </span>
  );
}
