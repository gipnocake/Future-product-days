// Product rules and tunables. Server-only values are read lazily from env.

export const SEARCH_RADIUS_M = 5000;

/**
 * Extra radius used for the Aggregate query. Queries are centred on a rounded
 * point (so place-ID caches can be shared); the slack guarantees the rounded
 * circle still covers the user's real 5 km circle. Results are filtered back
 * to the exact circle afterwards.
 */
export const COORD_ROUND_DECIMALS = 3; // ~110 m
export const QUERY_RADIUS_SLACK_M = 120;

export const INCLUDED_TYPES = ["restaurant", "cafe", "coffee_shop"] as const;

export interface TierRule {
  tier: 1 | 2;
  minRating: number;
  maxRating: number;
  minReviews: number;
}

export const TIER_RULES: readonly TierRule[] = [
  { tier: 1, minRating: 4.9, maxRating: 5.0, minReviews: 5 },
  { tier: 2, minRating: 4.8, maxRating: 5.0, minReviews: 2 },
];

/** Places Aggregate API returns place IDs only when the count is ≤ this. */
export const AGGREGATE_PLACES_LIMIT = 100;
/** Minimum area for any Places Aggregate location filter, in m². */
export const AGGREGATE_MIN_AREA_M2 = 1556.86;

export const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "location",
  "rating",
  "userRatingCount",
  "regularOpeningHours",
  "currentOpeningHours",
  "utcOffsetMinutes",
  "websiteUri",
  "photos",
  "googleMapsUri",
].join(",");

function intEnv(name: string, fallback: number): number {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

export const serverConfig = {
  get googleApiKey() {
    return process.env.GOOGLE_PLACES_API_KEY ?? "";
  },
  get detailsConcurrency() {
    return intEnv("DETAILS_CONCURRENCY", 8);
  },
  get maxDetailsPerSearch() {
    return intEnv("MAX_DETAILS_PER_SEARCH", 60);
  },
  get maxAggregateCallsPerSearch() {
    return intEnv("MAX_AGGREGATE_CALLS_PER_SEARCH", 60);
  },
  get rateLimitPerMinute() {
    return intEnv("RATE_LIMIT_PER_MINUTE", 10);
  },
  get photoRateLimitPerMinute() {
    return intEnv("PHOTO_RATE_LIMIT_PER_MINUTE", 120);
  },
  get placeIdCacheTtlSeconds() {
    return intEnv("PLACE_ID_CACHE_TTL_SECONDS", 7 * 24 * 3600);
  },
  get instagramEnabled() {
    return process.env.INSTAGRAM_ENABLED === "true";
  },
  get instagramUserId() {
    return process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID ?? "";
  },
  get instagramToken() {
    return process.env.INSTAGRAM_ACCESS_TOKEN ?? "";
  },
  get metaGraphVersion() {
    return process.env.META_GRAPH_API_VERSION ?? "v23.0";
  },
};
