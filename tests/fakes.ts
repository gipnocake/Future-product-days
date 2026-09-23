import { distanceMeters, type Rect } from "@/lib/geo";
import type { AggregateArea, AggregateClient, AggregateQuery } from "@/lib/google/aggregate";
import type { DetailsClient, PlaceDetails } from "@/lib/google/details";
import type { LatLng } from "@/lib/types";

export interface FakePlace {
  id: string;
  at: LatLng;
  rating: number;
}

const inRect = (p: LatLng, r: Rect) => p.lat >= r.south && p.lat < r.north && p.lng >= r.west && p.lng < r.east;

function inArea(p: LatLng, area: AggregateArea): boolean {
  return area.kind === "circle" ? distanceMeters(area.center, p) <= area.radiusM : inRect(p, area.rect);
}

/** In-memory Places Aggregate API that mimics the ≤100 INSIGHT_PLACES rule. */
export class FakeAggregate implements AggregateClient {
  calls: { kind: "count" | "places"; query: AggregateQuery }[] = [];

  constructor(
    private readonly places: FakePlace[],
    private readonly limit = 100,
  ) {}

  private match(q: AggregateQuery) {
    return this.places.filter((p) => p.rating >= q.minRating && p.rating <= q.maxRating && inArea(p.at, q.area));
  }

  async count(q: AggregateQuery) {
    this.calls.push({ kind: "count", query: q });
    return this.match(q).length;
  }

  async placeIds(q: AggregateQuery) {
    this.calls.push({ kind: "places", query: q });
    const m = this.match(q);
    return m.length <= this.limit ? m.map((p) => p.id) : [];
  }
}

export class FakeDetails implements DetailsClient {
  calls: string[] = [];
  constructor(private readonly byId: Record<string, PlaceDetails>) {}
  async get(id: string) {
    this.calls.push(id);
    return this.byId[id] ?? null;
  }
}

/** Offset a point by metres north/east (small distances). */
export function offset(p: LatLng, northM: number, eastM: number): LatLng {
  const dLat = northM / 111_320;
  const dLng = eastM / (111_320 * Math.cos((p.lat * Math.PI) / 180));
  return { lat: p.lat + dLat, lng: p.lng + dLng };
}

export const silentLogger = { info: () => {}, warn: () => {} };
