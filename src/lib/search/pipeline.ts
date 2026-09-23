import {
  COORD_ROUND_DECIMALS,
  INCLUDED_TYPES,
  QUERY_RADIUS_SLACK_M,
  SEARCH_RADIUS_M,
  TIER_RULES,
  type TierRule,
} from "../config";
import { mapLimit } from "../concurrency";
import { distanceMeters, roundLatLng } from "../geo";
import type { AggregateClient } from "../google/aggregate";
import type { DetailsClient, PlaceDetails } from "../google/details";
import { computeOpenNow, isAlwaysOpen, localMomentFromOffset, matchHoursFilter, rangesForDay } from "../hours";
import { extractInstagramHandle } from "../instagram";
import type { KVStore } from "../store";
import type { CoverImage, HoursFilter, LatLng, PlaceResult, SearchResponse } from "../types";
import { collectPlaceIds } from "./collectPlaceIds";
import { sortByRating } from "./sort";

export { sortByDistance, sortByRating } from "./sort";

export interface SearchLogger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
}

export interface SearchDeps {
  aggregate: AggregateClient;
  details: DetailsClient;
  /** Long-lived store: place IDs only. */
  idStore: KVStore;
  /** Short-lived, in-memory store for Place Details responses. */
  detailsCache?: KVStore;
  logger: SearchLogger;
  now?: () => Date;
  /** Optional cover resolver (e.g. Instagram). Return null to use the Google photo. */
  resolveCover?: (place: PlaceDetails, instagramHandle: string | null) => Promise<CoverImage | null>;
  limits: {
    maxDetailsPerSearch: number;
    detailsConcurrency: number;
    maxAggregateCallsPerSearch: number;
    placeIdCacheTtlSeconds: number;
    detailsCacheTtlSeconds?: number;
  };
  tierRules?: readonly TierRule[];
}

export interface SearchParams {
  center: LatLng;
  hours: HoursFilter;
  languageCode: string;
}

export interface SearchStats {
  aggregateCalls: number;
  detailsCalls: number;
  idCacheHits: number;
  detailsCacheHits: number;
  skippedAreas: number;
}

export function googleCover(place: PlaceDetails): CoverImage | null {
  const photo = place.photos?.[0];
  if (!photo?.name) return null;
  return {
    source: "google",
    src: `/api/photo/${photo.name}`,
    attributions: (photo.authorAttributions ?? []).map((a) => ({ displayName: a.displayName, uri: a.uri })),
  };
}

export async function runSearch(
  deps: SearchDeps,
  params: SearchParams,
): Promise<SearchResponse & { stats: SearchStats }> {
  const started = Date.now();
  const now = deps.now?.() ?? new Date();
  const rules = deps.tierRules ?? TIER_RULES;
  const stats: SearchStats = { aggregateCalls: 0, detailsCalls: 0, idCacheHits: 0, detailsCacheHits: 0, skippedAreas: 0 };
  const queryCenter = roundLatLng(params.center, COORD_ROUND_DECIMALS);
  const detailsMemo = new Map<string, Promise<PlaceDetails | null>>();
  let truncated = false;
  let hiddenNoHours = 0;

  const getIds = async (rule: TierRule): Promise<string[]> => {
    const key = `ids:v1:t${rule.tier}:${queryCenter.lat.toFixed(COORD_ROUND_DECIMALS)},${queryCenter.lng.toFixed(COORD_ROUND_DECIMALS)}`;
    const cached = await deps.idStore.get<string[]>(key).catch(() => null);
    if (cached) {
      stats.idCacheHits++;
      return cached;
    }
    const { ids, stats: s } = await collectPlaceIds(deps.aggregate, {
      center: queryCenter,
      radiusM: SEARCH_RADIUS_M + QUERY_RADIUS_SLACK_M,
      includedTypes: INCLUDED_TYPES,
      minRating: rule.minRating,
      maxRating: rule.maxRating,
      maxCalls: deps.limits.maxAggregateCallsPerSearch - stats.aggregateCalls,
      onWarn: deps.logger.warn,
    });
    stats.aggregateCalls += s.aggregateCalls;
    stats.skippedAreas += s.skippedAreas;
    // Only cache complete results so a budget-limited search doesn't stick around.
    if (s.skippedAreas === 0) {
      await deps.idStore.set(key, ids, deps.limits.placeIdCacheTtlSeconds).catch(() => {});
    }
    return ids;
  };

  const getDetails = (id: string): Promise<PlaceDetails | null> => {
    let p = detailsMemo.get(id);
    if (!p) {
      p = (async () => {
        const cacheKey = `det:${params.languageCode}:${id}`;
        const hit = await deps.detailsCache?.get<PlaceDetails>(cacheKey);
        if (hit) {
          stats.detailsCacheHits++;
          return hit;
        }
        stats.detailsCalls++;
        try {
          const d = await deps.details.get(id, params.languageCode);
          if (d) await deps.detailsCache?.set(cacheKey, d, deps.limits.detailsCacheTtlSeconds ?? 600);
          return d;
        } catch (err) {
          deps.logger.warn("place details failed", { id, error: String(err) });
          return null;
        }
      })();
      detailsMemo.set(id, p);
    }
    return p;
  };

  let result: SearchResponse | null = null;

  for (const rule of rules) {
    let ids = await getIds(rule);
    if (ids.length > deps.limits.maxDetailsPerSearch) {
      truncated = true;
      ids = ids.slice(0, deps.limits.maxDetailsPerSearch);
    }
    const details = await mapLimit(ids, deps.limits.detailsConcurrency, getDetails);

    let hidden = 0;
    const kept: { d: PlaceDetails; location: LatLng; distance: number }[] = [];
    for (const d of details) {
      if (!d?.location || d.rating === undefined) continue;
      const location = { lat: d.location.latitude, lng: d.location.longitude };
      const distance = distanceMeters(params.center, location);
      if (distance > SEARCH_RADIUS_M) continue;
      if (d.rating < rule.minRating || d.rating > rule.maxRating) continue;
      if ((d.userRatingCount ?? 0) < rule.minReviews) continue;
      const match = matchHoursFilter(params.hours, d, now);
      if (match === "no-data") hidden++;
      if (match !== "match") continue;
      kept.push({ d, location, distance });
    }
    hiddenNoHours = hidden;

    if (kept.length > 0) {
      const places = await mapLimit(kept, 6, async ({ d, location, distance }) => {
        const handle = extractInstagramHandle(d.websiteUri);
        const cover = (await deps.resolveCover?.(d, handle).catch(() => null)) ?? googleCover(d);
        return toPlaceResult(d, location, distance, rule.tier, handle, cover, now);
      });
      places.sort(sortByRating);
      result = { tier: rule.tier, places, hiddenNoHours, truncated };
      break;
    }
  }

  result ??= { tier: null, places: [], hiddenNoHours, truncated };

  deps.logger.info("search completed", {
    tier: result.tier,
    results: result.places.length,
    ...stats,
    truncated,
    ms: Date.now() - started,
  });

  return { ...result, stats };
}

function toPlaceResult(
  d: PlaceDetails,
  location: LatLng,
  distance: number,
  tier: 1 | 2,
  instagramHandle: string | null,
  cover: CoverImage | null,
  now: Date,
): PlaceResult {
  const periods = d.regularOpeningHours?.periods;
  const today =
    d.utcOffsetMinutes !== undefined ? localMomentFromOffset(now, d.utcOffsetMinutes).day : null;
  return {
    id: d.id,
    name: d.displayName?.text ?? "",
    location,
    rating: d.rating ?? 0,
    userRatingCount: d.userRatingCount ?? 0,
    distanceMeters: Math.round(distance),
    tier,
    openNow: computeOpenNow(d.regularOpeningHours, d.currentOpeningHours, d.utcOffsetMinutes, now),
    todayHours: periods?.length && today !== null ? rangesForDay(periods, today) : null,
    open24h: isAlwaysOpen(periods),
    googleMapsUri: d.googleMapsUri ?? null,
    websiteUri: d.websiteUri ?? null,
    instagramHandle,
    cover,
  };
}
