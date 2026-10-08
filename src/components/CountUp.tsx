import { useEffect, useState } from "react";

/** Counts from 0 up to `value` on mount (renders the final value on the server and with reduced motion). */
export function CountUp({ value, duration = 1100 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (value <= 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    setDisplay(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{display}</>;
}
