"use client";

import { Tag, Calendar, Gauge, Cog, Fuel, Repeat } from "lucide-react";
import type { PredictionResponse } from "@/lib/types";
import { gbp } from "@/lib/utils";

const REF_YEAR = 2020;

/** Vehicle-specification-sheet styled summary panel. */
export function SpecSheet({ result }: { result: PredictionResponse }) {
  const v = result.vehicle;
  const age = REF_YEAR - v.year;
  const annual = age > 0 ? v.mileage / age : v.mileage;

  const rows: { icon: React.ReactNode; k: string; val: string; hi?: boolean }[] = [
    { icon: <Tag />, k: "Marque", val: v.brand },
    { icon: <Calendar />, k: "Model year", val: String(v.year) },
    { icon: <Gauge />, k: "Odometer", val: `${v.mileage.toLocaleString("en-GB")} mi` },
    { icon: <Cog />, k: "Engine displacement", val: `${v.engineSize.toFixed(1)} L` },
    { icon: <Fuel />, k: "Fuel system", val: v.fuelType },
    { icon: <Repeat />, k: "Transmission", val: v.transmission },
    { icon: <Calendar />, k: "Vehicle age", val: `${age} yrs` },
    { icon: <Gauge />, k: "Annual mileage", val: `${Math.round(annual).toLocaleString("en-GB")} mi/yr` },
    { icon: <Tag />, k: "Estimated value", val: gbp(result.price), hi: true },
  ];

  return (
    <div className="space-y-0.5">
      {rows.map((r) => (
        <div
          key={r.k}
          className="flex items-baseline justify-between gap-2 border-b border-dotted border-white/10 py-2 transition-colors hover:bg-amber/[0.06]"
        >
          <span className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <span className="flex h-4 w-4 items-center justify-center text-amber [&_svg]:h-3.5 [&_svg]:w-3.5">
              {r.icon}
            </span>
            {r.k}
          </span>
          <span
            className={
              r.hi
                ? "font-mono text-base font-bold text-amber"
                : "font-mono text-sm font-semibold text-foreground"
            }
          >
            {r.val}
          </span>
        </div>
      ))}
    </div>
  );
}
