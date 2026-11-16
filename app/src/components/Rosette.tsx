import type { CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Rosette (UI spec §3.5): deterministic guilloche — 18 ellipses (rx 240, ry 92)
 * rotated i·10° around the origin plus one dashed circle r 150, all 1px
 * currentColor strokes, fill none. Color comes from the wrapper's `color`
 * (CSS) so callers set tone + opacity from the outside. 90s linear spin,
 * paused under reduced motion (`spin={false}` for static placements like Keys).
 */
export function Rosette({ spin = true, className, style }: {
  spin?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion() ?? false;
  const shouldSpin = spin && !reduce;
  return (
    <motion.svg
      viewBox="-270 -270 540 540"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
      animate={shouldSpin ? { rotate: 360 } : undefined}
      transition={shouldSpin ? { duration: 90, ease: "linear", repeat: Infinity } : undefined}
    >
      {Array.from({ length: 18 }, (_, i) => (
        <ellipse
          key={i}
          rx={240}
          ry={92}
          transform={`rotate(${i * 10})`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
        />
      ))}
      <circle r={150} fill="none" stroke="currentColor" strokeWidth={1} strokeDasharray="4 7" />
    </motion.svg>
  );
}
