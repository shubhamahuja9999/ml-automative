"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { Driver } from "@/lib/types";
import { gbp } from "@/lib/utils";

interface DriverCardProps {
  driver: Driver;
  scale: number; // max |value| across drivers, for bar width
  index: number;
}

/** Animated value-driver card with a growing contribution bar. */
export function DriverCard({ driver, scale, index }: DriverCardProps) {
  const up = driver.direction === "up";
  const width = scale ? Math.min(100, (Math.abs(driver.value) / scale) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className="glass p-4 transition-transform hover:translate-x-1 hover:border-amber/40"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-foreground">{driver.label}</span>
        <span
          className={`flex items-center gap-1 font-display font-extrabold ${
            up ? "text-amber" : "text-steel"
          }`}
        >
          {up ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          {up ? "+" : "−"}
          {gbp(Math.abs(driver.value))}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{driver.sentence}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: up
              ? "linear-gradient(90deg,#ff8a00,#ffd27a)"
              : "linear-gradient(90deg,#56617a,#8a9bb5)",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ delay: index * 0.07 + 0.1, duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
    </motion.div>
  );
}
