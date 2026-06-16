"use client";

import type { MetaResponse, VehicleInput } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VehicleFormProps {
  meta: MetaResponse;
  value: VehicleInput;
  onChange: (v: VehicleInput) => void;
}

/** Live vehicle-configuration control group (re-values on every change). */
export function VehicleForm({ meta, value, onChange }: VehicleFormProps) {
  const set = (patch: Partial<VehicleInput>) => onChange({ ...value, ...patch });

  const years = meta.numericRanges.year ?? [1997, 2020];
  const mileage = meta.numericRanges.mileage ?? [0, 200000];
  const engine = meta.numericRanges.engineSize ?? [1, 6];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Marque">
          <Select value={value.brand} onValueChange={(v) => set({ brand: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(meta.categories.brand ?? ["VW", "Audi"]).map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Transmission">
          <Select
            value={value.transmission}
            onValueChange={(v) => set({ transmission: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(meta.categories.transmission ?? ["Manual", "Automatic"]).map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label={`Model year · ${value.year}`}>
        <Slider
          min={years[0]}
          max={years[1]}
          step={1}
          value={[value.year]}
          onValueChange={([y]) => set({ year: y })}
        />
      </Field>

      <Field label={`Odometer · ${value.mileage.toLocaleString("en-GB")} mi`}>
        <Slider
          min={0}
          max={mileage[1]}
          step={1000}
          value={[value.mileage]}
          onValueChange={([m]) => set({ mileage: m })}
        />
      </Field>

      <Field label={`Engine · ${value.engineSize.toFixed(1)} L`}>
        <Slider
          min={engine[0]}
          max={engine[1]}
          step={0.1}
          value={[value.engineSize]}
          onValueChange={([e]) => set({ engineSize: Number(e.toFixed(1)) })}
        />
      </Field>

      <Field label="Fuel system">
        <Select value={value.fuelType} onValueChange={(v) => set({ fuelType: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(meta.categories.fuelType ?? ["Petrol", "Diesel"]).map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
