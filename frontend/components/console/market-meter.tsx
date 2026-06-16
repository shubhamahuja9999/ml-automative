"use client";

import { motion } from "framer-motion";
import type { MarketPosition } from "@/lib/types";

/** Animated Below Market / Fair Value / Premium meter. */
export function MarketMeter({ position }: { position: MarketPosition }) {
  return (
    <div className="mt-1">
      <div
        className="relative h-3.5 rounded-full"
        style={{
          background:
            "linear-gradient(90deg,#566173 0%,#8a9bb5 22%,#ff9e2c 55%,#ffd27a 100%)",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)",
        }}
      >
        <motion.div
          className="absolute -top-1.5 h-[26px] w-1 -translate-x-1/2 rounded-sm bg-white"
          style={{ boxShadow: "0 0 12px rgba(255,255,255,0.9)" }}
          initial={{ left: "0%" }}
          animate={{ left: `${position.positionPct}%` }}
          transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground/70">
        <span>Below Market</span>
        <span>Fair Value</span>
        <span>Premium</span>
      </div>
      <motion.div
        key={position.label}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 font-display text-xl font-extrabold"
        style={{ color: position.color }}
      >
        {position.label}
      </motion.div>
    </div>
  );
}
