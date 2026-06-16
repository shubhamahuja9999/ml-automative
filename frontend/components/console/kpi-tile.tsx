"use client";

import { motion } from "framer-motion";

interface KpiTileProps {
  label: string;
  value: React.ReactNode;
  sub?: string;
  amber?: boolean;
}

/** Glass readout tile with entrance + hover micro-interactions. */
export function KpiTile({ label, value, sub, amber }: KpiTileProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      whileHover={{ y: -3 }}
      className="glass relative flex-1 overflow-hidden p-5"
    >
      <div className="pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full bg-amber/20 blur-2xl" />
      <div className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div
        className={`mt-1.5 font-display text-3xl font-extrabold leading-none ${
          amber ? "text-amber-gradient" : "text-white"
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-1.5 text-sm text-muted-foreground">{sub}</div>}
    </motion.div>
  );
}
