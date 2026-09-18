import { useEffect, useRef, useState } from 'react';

/**
 * Animates a number from its previous value to `target` over `duration` ms.
 * Returns the current in-flight value. Skips animation entirely for
 * prefers-reduced-motion users.
 */
export default function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0);
  const frame = useRef(null);
  const from = useRef(0);

  useEffect(() => {
    const numeric = Number(target) || 0;
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion) {
      setValue(numeric);
      return;
    }

    const start = performance.now();
    const startVal = from.current;
    const delta = numeric - startVal;

    if (frame.current) cancelAnimationFrame(frame.current);

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      const current = startVal + delta * eased;
      setValue(current);
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        from.current = numeric;
      }
    };

    frame.current = requestAnimationFrame(tick);
    return () => frame.current && cancelAnimationFrame(frame.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}
