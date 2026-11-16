import { useEffect, useRef, useState } from "react";

/**
 * Count-up for int+decimal numerals (v3 motion spec §8): animates from `from`
 * on activation and from the previous value on change only — never idle-spinning.
 * `reduce` renders the final value instantly. Default format: en-US grouping
 * with `decimals` fraction digits; pass `format` for full control.
 */
export function CountNumber({
  value,
  from,
  decimals = 0,
  active = true,
  duration = 320,
  reduce = false,
  format,
}: {
  value: number;
  /** value the count starts from when `active` flips true (defaults to current value) */
  from?: number;
  decimals?: number;
  active?: boolean;
  duration?: number;
  reduce?: boolean;
  format?: (n: number) => string;
}) {
  const fmt = format ?? ((n: number) => n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }));
  const prev = useRef(from ?? value);
  const [display, setDisplay] = useState(active ? (from ?? value) : value);

  useEffect(() => {
    if (!active) { setDisplay(value); return; }
    const start = prev.current;
    if (reduce || start === value) { prev.current = value; setDisplay(value); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(start + (value - start) * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prev.current = value;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, value, from, duration, reduce]);

  return <>{fmt(display)}</>;
}
