import { useEffect, useRef, useState } from "react";

/** 300ms count-up on value change only; instant under reduced motion (UI spec §5). */
export function CountUp({ value, format, reduce }: { value: number; format: (n: number) => string; reduce: boolean }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (reduce || from === value) { setDisplay(value); return; }
    const start = performance.now();
    const duration = 300;
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, reduce]);

  return <>{format(display)}</>;
}
