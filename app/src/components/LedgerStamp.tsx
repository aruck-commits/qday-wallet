import { useId, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

export type StampTone = "mint" | "violet" | "amber" | "red" | "ember";

const TONE: Record<StampTone, string> = {
  mint: "#7fdcb4",
  violet: "#a78bfa",
  amber: "#e7b45c",
  red: "#f43f5e",
  ember: "#ff9d5c",
};

/**
 * LedgerStamp (UI spec §3.5): circular rubber stamp, SVG 176px viewBox —
 * outer ring 2.5px, inner ring 1px, Space Mono 10px uppercase on circular
 * text paths (top arc `EIP-8141 · ALT-MEMPOOL ·`, bottom arc
 * `ML-DSA-44 · ARBITRARY ·`), Instrument Serif italic 30px center word +
 * Space Mono 12px subline. Whole stamp rests at −7° (mini at −3°).
 * Entrance: scale 1.7→1 (mini 1.5→1), rotate −14°→−7°, spring 380/17;
 * reduced motion → a single 150ms opacity fade.
 */
export function LedgerStamp({
  word,
  subline,
  tone = "mint",
  width = 176,
  mini = false,
  delay = 0,
  className,
}: {
  word: string;
  /** rendered as the subline inside the SVG text — may embed CountNumber output */
  subline?: ReactNode;
  tone?: StampTone;
  /** rendered width in px (same viewBox scales down for the 96px mini stamps) */
  width?: number;
  mini?: boolean;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const topId = `v3stamp-top-${uid}`;
  const bottomId = `v3stamp-bottom-${uid}`;

  return (
    <motion.div
      className={className}
      style={{ width, color: TONE[tone] }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: mini ? 1.5 : 1.7, rotate: mini ? -9 : -14 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, rotate: mini ? -3 : -7 }}
      transition={reduce ? { duration: 0.15, delay } : { type: "spring", stiffness: 380, damping: 17, delay }}
    >
      <svg viewBox="0 0 176 176" width="100%" role="img" aria-label={`${word}${typeof subline === "string" ? ` — ${subline}` : ""}`}>
        <circle cx="88" cy="88" r="84" fill="none" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="88" cy="88" r="74" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
        <defs>
          <path id={topId} d="M 22 88 A 66 66 0 1 1 154 88" fill="none" />
          <path id={bottomId} d="M 22 88 A 66 66 0 1 0 154 88" fill="none" />
        </defs>
        <text
          fill="currentColor"
          fontSize="10"
          fontFamily='"Space Mono", monospace'
          letterSpacing="2.2"
        >
          <textPath href={`#${topId}`} startOffset="50%" textAnchor="middle">
            EIP-8141 · ALT-MEMPOOL ·
          </textPath>
        </text>
        <text
          fill="currentColor"
          fontSize="10"
          fontFamily='"Space Mono", monospace'
          letterSpacing="2.2"
        >
          <textPath href={`#${bottomId}`} startOffset="50%" textAnchor="middle">
            ML-DSA-44 · ARBITRARY ·
          </textPath>
        </text>
        <text
          x="88"
          y="87"
          textAnchor="middle"
          fill="currentColor"
          fontSize="30"
          fontFamily='"Instrument Serif", serif'
          fontStyle="italic"
        >
          {word}
        </text>
        <text
          x="88"
          y="110"
          textAnchor="middle"
          fill="currentColor"
          fontSize="12"
          fontFamily='"Space Mono", monospace'
          opacity="0.9"
        >
          {subline}
        </text>
      </svg>
    </motion.div>
  );
}
