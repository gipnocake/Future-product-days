import { AGGREGATE_MIN_AREA_M2, AGGREGATE_PLACES_LIMIT } from "../config";
import { mapLimit } from "../concurrency";
import { boundingRect, rectAreaM2, rectIntersectsCircle, splitRect, type Rect } from "../geo";
import type { AggregateArea, AggregateClient, AggregateQuery } from "../google/aggregate";
import type { LatLng } from "../types";

export interface CollectStats {
  aggregateCalls: number;
  /** Sub-areas we had to give up on (still > limit at minimum size, or call budget exhausted). */
  skippedAreas: number;
}

export interface CollectOptions {
  center: LatLng;
  radiusM: number;
  includedTypes: readonly string[];
  minRating: number;
  maxRating: number;
  maxCalls: number;
  minAreaM2?: number;
  placesLimit?: number;
  concurrency?: number;
  onWarn?: (msg: string, data?: Record<string, unknown>) => void;
}

/**
 * Collect all place IDs matching the filters inside a circle. Uses
 * INSIGHT_COUNT first; when an area holds more than the INSIGHT_PLACES limit
 * it is split into quadrants (as polygons) recursively until each piece fits.
 * Quadrants that don't touch the circle are skipped. IDs are deduplicated;
 * the caller must still drop places that fall outside the circle.
 */
export async function collectPlaceIds(
  client: AggregateClient,
  opts: CollectOptions,
  stats: CollectStats = { aggregateCalls: 0, skippedAreas: 0 },
): Promise<{ ids: string[]; stats: CollectStats }> {
  const limit = opts.placesLimit ?? AGGREGATE_PLACES_LIMIT;
  const minArea = opts.minAreaM2 ?? AGGREGATE_MIN_AREA_M2;
  const concurrency = opts.concurrency ?? 4;
  const warn = opts.onWarn ?? (() => {});

  const query = (area: AggregateArea): AggregateQuery => ({
    area,
    includedTypes: opts.includedTypes,
    minRating: opts.minRating,
    maxRating: opts.maxRating,
  });

  const budgetLeft = () => stats.aggregateCalls < opts.maxCalls;

  const count = (area: AggregateArea) => {
    stats.aggregateCalls++;
    return client.count(query(area));
  };
  const places = (area: AggregateArea) => {
    stats.aggregateCalls++;
    return client.placeIds(query(area));
  };

  const visitRect = async (rect: Rect, depth: number): Promise<string[]> => {
    if (!budgetLeft()) {
      stats.skippedAreas++;
      warn("aggregate call budget exhausted", { depth });
      return [];
    }
    const n = await count({ kind: "rect", rect });
    if (n === 0) return [];
    if (n <= limit) return budgetLeft() ? places({ kind: "rect", rect }) : [];
    return splitAndVisit(rect, depth + 1);
  };

  const splitAndVisit = async (rect: Rect, depth: number): Promise<string[]> => {
    const children = splitRect(rect).filter((r) => rectIntersectsCircle(r, opts.center, opts.radiusM));
    if (children.length > 0 && rectAreaM2(children[0]) < minArea) {
      stats.skippedAreas++;
      warn("area still over the places limit at minimum size; skipping", { depth });
      return [];
    }
    const lists = await mapLimit(children, concurrency, (r) => visitRect(r, depth));
    return lists.flat();
  };

  const circle: AggregateArea = { kind: "circle", center: opts.center, radiusM: opts.radiusM };
  const total = await count(circle);
  let ids: string[];
  if (total === 0) ids = [];
  else if (total <= limit) ids = await places(circle);
  else ids = await splitAndVisit(boundingRect(opts.center, opts.radiusM), 1);

  return { ids: [...new Set(ids)], stats };
}
