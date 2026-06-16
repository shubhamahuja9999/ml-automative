/** TypeScript mirrors of the FastAPI response schemas. */

export interface VehicleInput {
  brand: string;
  year: number;
  mileage: number;
  engineSize: number;
  fuelType: string;
  transmission: string;
}

export interface Driver {
  feature: string;
  label: string;
  value: number;
  direction: "up" | "down";
  sentence: string;
}

export interface MarketPosition {
  label: "Below Market" | "Fair Value" | "Premium";
  color: string;
  positionPct: number;
  ratio: number;
  comparableMedian: number;
}

export interface PredictionResponse {
  price: number;
  priceLabel: string;
  lower: number;
  upper: number;
  confidence: number;
  valueIndex: number;
  marketPosition: MarketPosition;
  vehicle: VehicleInput;
}

export interface ExplainResponse extends PredictionResponse {
  drivers: Driver[];
  method: "shap" | "ablation";
}

export interface CompareResponse {
  a: ExplainResponse;
  b: ExplainResponse;
  gap: number;
  gapPct: number;
  winner: "A" | "B";
}

export interface DepreciationPoint {
  age: number;
  price: number;
}

export interface ScatterPoint {
  mileage: number;
  price: number;
  brand: string;
}

export interface MetaResponse {
  categories: Record<string, string[]>;
  numericRanges: Record<string, number[]>;
  metrics: Record<string, Record<string, number>>;
  referenceYear: number;
  trainingRows: number;
  shapEnabled: boolean;
  depreciation: DepreciationPoint[];
  scatter: ScatterPoint[];
}
