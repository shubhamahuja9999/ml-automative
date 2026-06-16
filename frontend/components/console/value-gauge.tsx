"use client";

import { motion } from "framer-motion";
import { AnimatedNumber } from "./animated-number";
import { gbp } from "@/lib/utils";

interface ValueGaugeProps {
  price: number;
  index: number; // 0-100
  confidence: number; // 0-1
}

const ARC = 376.99; // 270° of an r=80 circle

/** Animated Vehicle Value Index gauge — amber arc sweeps to the value index. */
export function ValueGauge({ price, index, confidence }: ValueGaugeProps) {
  const target = ARC * Math.max(0, Math.min(1, index / 100));

  return (
    <div className="relative mx-auto w-[260px] max-w-full">
      <svg viewBox="0 0 200 200" className="block w-full">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff8a00" />
            <stop offset="1" stopColor="#ffd27a" />
          </linearGradient>
        </defs>
        <g transform="rotate(135 100 100)">
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            strokeWidth="15"
            strokeLinecap="round"
            stroke="rgba(255,255,255,0.07)"
            strokeDasharray={`${ARC} 999`}
          />
          <motion.circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            strokeWidth="15"
            strokeLinecap="round"
            stroke="url(#gaugeGrad)"
            style={{ filter: "drop-shadow(0 0 8px rgba(255,158,44,0.55))" }}
            strokeDasharray={`0 999`}
            animate={{ strokeDasharray: `${target} 999` }}
            transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </g>
      </svg>
      <div className="absolute left-1/2 top-[54%] w-4/5 -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="font-display text-3xl font-extrabold text-white">
          <AnimatedNumber value={price} format={(n) => gbp(n)} />
        </div>
        <div className="mt-1 font-mono text-[0.7rem] tracking-[0.14em] text-steel">
          VALUE INDEX <span className="text-amber">{Math.round(index)}</span>
          <span className="text-white/30">/100</span>
        </div>
        <div className="mt-0.5 font-mono text-[0.62rem] tracking-[0.1em] text-muted-foreground">
          CONFIDENCE {Math.round(confidence * 100)}%
        </div>
      </div>
    </div>
  );
}
