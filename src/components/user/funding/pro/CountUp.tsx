'use client';

import { useCountUp } from '../dashboard/motion';

/** A number that counts up to `value` once (still under reduced motion). */
export default function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useCountUp<HTMLSpanElement>(value, format);
  return <span ref={ref}>{format(value)}</span>;
}
