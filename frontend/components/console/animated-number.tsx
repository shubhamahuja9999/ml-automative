"use client";

import { useEffect } from "react";
import { animate, useMotionValue, useTransform, motion } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}

/** Smoothly counts from the previous value to the new one on change. */
export function AnimatedNumber({
  value,
  format = (n) => Math.round(n).toLocaleString("en-GB"),
  duration = 0.9,
  className,
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(value);
  const rounded = useTransform(motionValue, (v) => format(v));

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: [0.2, 0.8, 0.2, 1],
    });
    return controls.stop;
  }, [value, duration, motionValue]);

  return <motion.span className={className}>{rounded}</motion.span>;
}
