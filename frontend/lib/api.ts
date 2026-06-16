/** Typed client for the Vehicle Intelligence API. */

import type {
  CompareResponse,
  ExplainResponse,
  MetaResponse,
  PredictionResponse,
  VehicleInput,
} from "./types";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`API ${path} failed (${res.status}): ${detail}`);
  }
  return res.json() as Promise<T>;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`API ${path} failed (${res.status})`);
  return res.json() as Promise<T>;
}

export const api = {
  baseUrl: BASE_URL,
  meta: () => get<MetaResponse>("/api/meta"),
  predict: (vehicle: VehicleInput) =>
    post<PredictionResponse>("/api/predict", vehicle),
  explain: (vehicle: VehicleInput) =>
    post<ExplainResponse>("/api/explain", vehicle),
  compare: (vehicleA: VehicleInput, vehicleB: VehicleInput) =>
    post<CompareResponse>("/api/compare", { vehicleA, vehicleB }),
};
