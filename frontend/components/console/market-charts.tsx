"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  ReferenceDot,
} from "recharts";
import type { MetaResponse, PredictionResponse } from "@/lib/types";

const AMBER = "#ff9e2c";
const STEEL = "#8a9bb5";

const axisStyle = { fill: "#7e8696", fontSize: 11, fontFamily: "monospace" };

/** Depreciation curve (median price by age) with the vehicle marked. */
export function DepreciationChart({
  meta,
  result,
}: {
  meta: MetaResponse;
  result: PredictionResponse;
}) {
  const age = meta.referenceYear - result.vehicle.year;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={meta.depreciation} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <defs>
          <linearGradient id="depFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={AMBER} stopOpacity={0.35} />
            <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="age" tick={axisStyle} stroke="rgba(255,255,255,0.12)"
          label={{ value: "Vehicle age (yrs)", position: "insideBottom", offset: -2, fill: "#7e8696", fontSize: 11 }} />
        <YAxis tick={axisStyle} stroke="rgba(255,255,255,0.12)"
          tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          contentStyle={{ background: "#11151c", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#e8edf6" }}
          formatter={(v: number) => [`£${v.toLocaleString("en-GB")}`, "Median"]}
        />
        <Area type="monotone" dataKey="price" stroke={AMBER} strokeWidth={3} fill="url(#depFill)" />
        <ReferenceDot x={age} y={result.price} r={6} fill="#fff" stroke={AMBER} strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Price vs odometer scatter with the vehicle highlighted. */
export function MileageScatter({
  meta,
  result,
}: {
  meta: MetaResponse;
  result: PredictionResponse;
}) {
  const vw = meta.scatter.filter((p) => p.brand === "VW");
  const audi = meta.scatter.filter((p) => p.brand === "Audi");
  const you = [{ mileage: result.vehicle.mileage, price: result.price }];

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ScatterChart margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.05)" />
        <XAxis type="number" dataKey="mileage" name="Odometer" tick={axisStyle}
          stroke="rgba(255,255,255,0.12)" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <YAxis type="number" dataKey="price" name="Price" tick={axisStyle}
          stroke="rgba(255,255,255,0.12)" tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
        <ZAxis range={[24, 24]} />
        <Tooltip
          cursor={{ stroke: "rgba(255,255,255,0.2)" }}
          contentStyle={{ background: "#11151c", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "#e8edf6" }}
          formatter={(v: number) => `£${v.toLocaleString("en-GB")}`}
        />
        <Scatter name="VW" data={vw} fill={STEEL} fillOpacity={0.5} />
        <Scatter name="Audi" data={audi} fill={AMBER} fillOpacity={0.45} />
        <Scatter name="This vehicle" data={you} fill="#ffffff" shape="diamond" />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
