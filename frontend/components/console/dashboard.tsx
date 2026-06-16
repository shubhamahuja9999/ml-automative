"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { GitCompareArrows, RotateCcw, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import type {
  CompareResponse,
  ExplainResponse,
  MetaResponse,
  VehicleInput,
} from "@/lib/types";
import { gbp } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { VehicleForm } from "./vehicle-form";
import { ValueGauge } from "./value-gauge";
import { MarketMeter } from "./market-meter";
import { SpecSheet } from "./spec-sheet";
import { DriverCard } from "./driver-card";
import { KpiTile } from "./kpi-tile";
import { AnimatedNumber } from "./animated-number";
import { DepreciationChart, MileageScatter } from "./market-charts";

const DEFAULT_A: VehicleInput = {
  brand: "Audi", year: 2018, mileage: 30000, engineSize: 2.0,
  fuelType: "Petrol", transmission: "Automatic",
};
const DEFAULT_B: VehicleInput = {
  brand: "VW", year: 2015, mileage: 65000, engineSize: 1.4,
  fuelType: "Petrol", transmission: "Manual",
};

function useExplain(vehicle: VehicleInput, enabled: boolean) {
  const [data, setData] = useState<ExplainResponse | null>(null);
  const key = JSON.stringify(vehicle);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api.explain(vehicle).then((r) => !cancelled && setData(r)).catch(console.error);
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  return data;
}

function useCompare(a: VehicleInput, b: VehicleInput, enabled: boolean) {
  const [data, setData] = useState<CompareResponse | null>(null);
  const key = JSON.stringify([a, b]);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const t = setTimeout(() => {
      api.compare(a, b).then((r) => !cancelled && setData(r)).catch(console.error);
    }, 220);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  return data;
}

export function Dashboard({ meta }: { meta: MetaResponse }) {
  const [mode, setMode] = useState<"single" | "compare">("single");
  const [vehicleA, setVehicleA] = useState<VehicleInput>(DEFAULT_A);
  const [vehicleB, setVehicleB] = useState<VehicleInput>(DEFAULT_B);

  const resultA = useExplain(vehicleA, mode === "single");
  const compare = useCompare(vehicleA, vehicleB, mode === "compare");

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      {/* Control panel */}
      <aside className="glass h-fit space-y-5 p-5 lg:sticky lg:top-6">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-amber/40 bg-graphite-700 text-amber shadow-[0_0_18px_rgba(255,158,44,0.25)]">
            ◈
          </span>
          <div>
            <div className="font-display text-sm font-extrabold tracking-wide">
              CONTROL PANEL
            </div>
            <div className="font-mono text-[0.62rem] tracking-[0.16em] text-muted-foreground">
              LIVE CONFIGURATION
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={mode === "single" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("single")}
          >
            <Sparkles className="h-4 w-4" /> Single
          </Button>
          <Button
            variant={mode === "compare" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("compare")}
          >
            <GitCompareArrows className="h-4 w-4" /> Compare
          </Button>
        </div>

        <div>
          <div className="eyebrow mb-3">{mode === "compare" ? "Vehicle A" : "Vehicle profile"}</div>
          <VehicleForm meta={meta} value={vehicleA} onChange={setVehicleA} />
        </div>

        {mode === "compare" && (
          <div className="border-t border-white/10 pt-5">
            <div className="eyebrow mb-3">Vehicle B</div>
            <VehicleForm meta={meta} value={vehicleB} onChange={setVehicleB} />
          </div>
        )}

        <div className="border-t border-white/10 pt-4 font-mono text-[0.62rem] tracking-[0.12em] text-muted-foreground">
          ACCURACY R² {(meta.metrics["Random Forest"]?.r2 ?? 0).toFixed(3)} · MAE{" "}
          {gbp(meta.metrics["Random Forest"]?.mae ?? 0)} ·{" "}
          {meta.shapEnabled ? "SHAP ENABLED" : "ABLATION"}
        </div>
      </aside>

      {/* Main */}
      <section>
        {mode === "single" ? (
          <SingleView meta={meta} vehicle={vehicleA} result={resultA} />
        ) : (
          <CompareView meta={meta} compare={compare} />
        )}
      </section>
    </div>
  );
}

/* ----------------------------- Single mode ----------------------------- */
function SingleView({
  meta,
  vehicle,
  result,
}: {
  meta: MetaResponse;
  vehicle: VehicleInput;
  result: ExplainResponse | null;
}) {
  if (!result) return <LoadingPanel />;
  const scale = Math.max(...result.drivers.map((d) => Math.abs(d.value)), 1);

  return (
    <Tabs defaultValue="valuation">
      <TabsList className="flex-wrap">
        <TabsTrigger value="valuation">Valuation</TabsTrigger>
        <TabsTrigger value="drivers">Value Drivers</TabsTrigger>
        <TabsTrigger value="whatif">What-If</TabsTrigger>
        <TabsTrigger value="market">Market</TabsTrigger>
      </TabsList>

      <TabsContent value="valuation">
        <div className="mb-5 flex flex-wrap gap-4">
          <KpiTile label="Estimated value" amber
            value={<AnimatedNumber value={result.price} format={gbp} />} sub="Point estimate" />
          <KpiTile label="Confidence band"
            value={`${gbp(result.lower)} – ${gbp(result.upper)}`} sub="95% interval" />
          <KpiTile label="Comparable median"
            value={gbp(result.marketPosition.comparableMedian)}
            sub={`${vehicle.brand} · similar age`} />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="glass p-5">
            <div className="eyebrow mb-4">Vehicle Value Index</div>
            <ValueGauge price={result.price} index={result.valueIndex} confidence={result.confidence} />
            <div className="eyebrow mb-3 mt-6">Market Position</div>
            <MarketMeter position={result.marketPosition} />
          </div>
          <div className="glass p-5">
            <div className="eyebrow mb-4">Vehicle Specification</div>
            <SpecSheet result={result} />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="drivers">
        <div className="glass p-5">
          <div className="eyebrow mb-4">
            Value Drivers · why {result.priceLabel} · {result.method.toUpperCase()}
          </div>
          <div className="space-y-1">
            {result.drivers.map((d, i) => (
              <DriverCard key={d.feature} driver={d} scale={scale} index={i} />
            ))}
          </div>
        </div>
      </TabsContent>

      <TabsContent value="whatif">
        <WhatIfView meta={meta} baseVehicle={vehicle} baseResult={result} />
      </TabsContent>

      <TabsContent value="market">
        <MarketView meta={meta} result={result} />
      </TabsContent>
    </Tabs>
  );
}

/* ------------------------------ What-If ------------------------------ */
function WhatIfView({
  meta,
  baseVehicle,
  baseResult,
}: {
  meta: MetaResponse;
  baseVehicle: VehicleInput;
  baseResult: ExplainResponse;
}) {
  const refYear = meta.referenceYear;
  const mileageMax = meta.numericRanges.mileage?.[1] ?? 200000;
  const engine = meta.numericRanges.engineSize ?? [1, 6];
  const maxAge = refYear - (meta.numericRanges.year?.[0] ?? 1997);

  const [mileage, setMileage] = useState(baseVehicle.mileage);
  const [age, setAge] = useState(refYear - baseVehicle.year);
  const [engineSize, setEngineSize] = useState(baseVehicle.engineSize);

  const simVehicle: VehicleInput = useMemo(
    () => ({ ...baseVehicle, mileage, engineSize, year: refYear - age }),
    [baseVehicle, mileage, age, engineSize, refYear]
  );
  const sim = useExplain(simVehicle, true);

  const reset = () => {
    setMileage(baseVehicle.mileage);
    setAge(refYear - baseVehicle.year);
    setEngineSize(baseVehicle.engineSize);
  };

  const diff = (sim?.price ?? baseResult.price) - baseResult.price;

  return (
    <div className="space-y-5">
      <div className="glass p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="eyebrow">What-If Simulator · live re-valuation</div>
          <Button variant="ghost" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          <div className="space-y-2">
            <Label>Odometer · {mileage.toLocaleString("en-GB")} mi</Label>
            <Slider min={0} max={mileageMax} step={1000} value={[mileage]}
              onValueChange={([m]) => setMileage(m)} />
          </div>
          <div className="space-y-2">
            <Label>Vehicle age · {age} yrs</Label>
            <Slider min={0} max={maxAge} step={1} value={[age]}
              onValueChange={([a]) => setAge(a)} />
          </div>
          <div className="space-y-2">
            <Label>Engine · {engineSize.toFixed(1)} L</Label>
            <Slider min={engine[0]} max={engine[1]} step={0.1} value={[engineSize]}
              onValueChange={([e]) => setEngineSize(Number(e.toFixed(1)))} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <KpiTile label="Configured baseline" value={baseResult.priceLabel} sub="From the control panel" />
        <KpiTile label="Simulated value" amber
          value={<AnimatedNumber value={sim?.price ?? baseResult.price} format={gbp} />}
          sub="With your adjustments" />
        <KpiTile label="Change"
          value={
            <span className={diff >= 0 ? "text-amber" : "text-steel"}>
              {diff >= 0 ? "▲ " : "▼ "}{gbp(Math.abs(diff))}
            </span>
          }
          sub={`${((diff / baseResult.price) * 100).toFixed(1)}% vs baseline`} />
      </div>

      {sim && (
        <div className="glass max-w-md p-5">
          <div className="eyebrow mb-4">Simulated Value Index</div>
          <ValueGauge price={sim.price} index={sim.valueIndex} confidence={sim.confidence} />
        </div>
      )}
    </div>
  );
}

/* ------------------------------- Market ------------------------------- */
function MarketView({ meta, result }: { meta: MetaResponse; result: ExplainResponse }) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <div className="glass p-5">
        <div className="eyebrow mb-4">Depreciation Curve · median by age</div>
        <DepreciationChart meta={meta} result={result} />
      </div>
      <div className="glass p-5">
        <div className="eyebrow mb-4">Price vs Odometer · market scatter</div>
        <MileageScatter meta={meta} result={result} />
      </div>
    </div>
  );
}

/* ------------------------------ Compare ------------------------------ */
function CompareView({
  meta,
  compare,
}: {
  meta: MetaResponse;
  compare: CompareResponse | null;
}) {
  if (!compare) return <LoadingPanel />;
  const { a, b, gap, gapPct, winner } = compare;

  return (
    <Tabs defaultValue="overview">
      <TabsList className="flex-wrap">
        <TabsTrigger value="overview">Comparison</TabsTrigger>
        <TabsTrigger value="drivers">Value Drivers</TabsTrigger>
        <TabsTrigger value="market">Market</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="mb-5 flex flex-wrap gap-4">
          <KpiTile label="Vehicle A" amber value={a.priceLabel}
            sub={`${a.vehicle.brand} · ${a.vehicle.year} · ${a.vehicle.mileage.toLocaleString("en-GB")} mi`} />
          <KpiTile label="Vehicle B" amber value={b.priceLabel}
            sub={`${b.vehicle.brand} · ${b.vehicle.year} · ${b.vehicle.mileage.toLocaleString("en-GB")} mi`} />
          <KpiTile label="Valuation gap" value={gbp(gap)} sub={`Vehicle ${winner} leads by ${gapPct}%`} />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {[a, b].map((r, i) => (
            <div key={i} className="glass p-5">
              <div className="eyebrow mb-4">Vehicle {i === 0 ? "A" : "B"}</div>
              <ValueGauge price={r.price} index={r.valueIndex} confidence={r.confidence} />
              <div className="eyebrow mb-3 mt-6">Market Position</div>
              <MarketMeter position={r.marketPosition} />
              <div className="eyebrow mb-3 mt-6">Specification</div>
              <SpecSheet result={r} />
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="drivers">
        <div className="grid gap-5 md:grid-cols-2">
          {[a, b].map((r, i) => {
            const scale = Math.max(...r.drivers.map((d) => Math.abs(d.value)), 1);
            return (
              <div key={i} className="glass p-5">
                <div className="eyebrow mb-4">Vehicle {i === 0 ? "A" : "B"} · {r.priceLabel}</div>
                <div className="space-y-1">
                  {r.drivers.map((d, j) => (
                    <DriverCard key={d.feature} driver={d} scale={scale} index={j} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="market">
        <MarketView meta={meta} result={a} />
      </TabsContent>
    </Tabs>
  );
}

function LoadingPanel() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass grid h-72 place-items-center p-5 text-muted-foreground"
    >
      <div className="flex items-center gap-3 font-mono text-sm">
        <span className="h-2.5 w-2.5 animate-ping rounded-full bg-amber" />
        Computing valuation…
      </div>
    </motion.div>
  );
}
