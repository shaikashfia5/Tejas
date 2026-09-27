import React, { useEffect, useRef, useState } from 'react';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

interface CountUpProps {
  value: number;
  decimals?: number;
  duration?: number;
  locale?: string;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Animates a number from 0 to `value` (~600ms, ease-out) when mounted.
 * Makes computed metrics feel live rather than static. Honors
 * prefers-reduced-motion by rendering the final value immediately.
 */
export const CountUp: React.FC<CountUpProps> = ({
  value,
  decimals = 0,
  duration = 600,
  locale = 'en-IN',
  prefix,
  suffix,
  className,
}) => {
  const fmt = (n: number) =>
    n.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  const [display, setDisplay] = useState(() => fmt(0));
  const frame = useRef(0);

  useEffect(() => {
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) {
      setDisplay(fmt(value));
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setDisplay(fmt(value * easeOutCubic(p)));
      if (p < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration, decimals, locale]);

  return (
    <span className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};
