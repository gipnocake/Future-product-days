import "server-only";
import { rectToPolygon, type Rect } from "../geo";
import type { LatLng } from "../types";

const ENDPOINT = "https://areainsights.googleapis.com/v1:computeInsights";

export type AggregateArea =
  | { kind: "circle"; center: LatLng; radiusM: number }
  | { kind: "rect"; rect: Rect };

export interface AggregateQuery {
  area: AggregateArea;
  includedTypes: readonly string[];
  minRating: number;
  maxRating: number;
}

/** Minimal surface of the Places Aggregate API used by the pipeline (mockable in tests). */
export interface AggregateClient {
  count(q: AggregateQuery): Promise<number>;
  /** Place IDs (without the "places/" prefix). Only valid when count ≤ 100. */
  placeIds(q: AggregateQuery): Promise<string[]>;
}

const toLatLngJson = (p: LatLng) => ({ latitude: p.lat, longitude: p.lng });

export function buildInsightsRequest(q: AggregateQuery, insight: "INSIGHT_COUNT" | "INSIGHT_PLACES") {
  const locationFilter =
    q.area.kind === "circle"
      ? { circle: { latLng: toLatLngJson(q.area.center), radius: q.area.radiusM } }
      : { customArea: { polygon: { coordinates: rectToPolygon(q.area.rect).map(toLatLngJson) } } };
  return {
    insights: [insight],
    filter: {
      locationFilter,
      typeFilter: { includedTypes: [...q.includedTypes] },
      operatingStatus: ["OPERATING_STATUS_OPERATIONAL"],
      ratingFilter: { minRating: q.minRating, maxRating: q.maxRating },
    },
  };
}

export class HttpAggregateClient implements AggregateClient {
  constructor(private readonly apiKey: string) {}

  private async call(body: unknown): Promise<Record<string, unknown>> {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": this.apiKey },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Places Aggregate API ${res.status}: ${text.slice(0, 300)}`);
    }
    return res.json();
  }

  async count(q: AggregateQuery): Promise<number> {
    const json = await this.call(buildInsightsRequest(q, "INSIGHT_COUNT"));
    // int64 is serialised as a string; an absent field means 0.
    return Number(json.count ?? 0);
  }

  async placeIds(q: AggregateQuery): Promise<string[]> {
    const json = await this.call(buildInsightsRequest(q, "INSIGHT_PLACES"));
    const insights = (json.placeInsights ?? []) as { place?: string }[];
    return insights
      .map((p) => p.place?.replace(/^places\//, ""))
      .filter((id): id is string => Boolean(id));
  }
}
