import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { serverConfig } from "@/lib/config";
import { withTimeout } from "@/lib/concurrency";
import { HttpAggregateClient } from "@/lib/google/aggregate";
import { HttpDetailsClient } from "@/lib/google/details";
import { fetchInstagramCover } from "@/lib/instagram";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { runSearch, type SearchLogger } from "@/lib/search/pipeline";
import { getStore, shortLivedCache } from "@/lib/store";
import type { CoverImage, HoursFilter, SearchResponse } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  lang: z.enum(["en", "pl"]).default("en"),
  hours: z
    .discriminatedUnion("mode", [
      z.object({ mode: z.literal("any") }),
      z.object({ mode: z.literal("now") }),
      z.object({
        mode: z.literal("at"),
        day: z.number().int().min(0).max(6),
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
      }),
    ])
    .default({ mode: "any" }),
});

// Structured logs; user coordinates are deliberately never logged.
const logger: SearchLogger = {
  info: (msg, data) => console.info(JSON.stringify({ level: "info", msg, ...data })),
  warn: (msg, data) => console.warn(JSON.stringify({ level: "warn", msg, ...data })),
};

async function instagramCover(handle: string | null): Promise<CoverImage | null> {
  if (!handle || !serverConfig.instagramEnabled) return null;
  const key = `ig:${handle}`;
  const cached = await shortLivedCache.get<CoverImage | "none">(key);
  if (cached) return cached === "none" ? null : cached;
  const cover = await withTimeout(
    fetchInstagramCover(handle, {
      igUserId: serverConfig.instagramUserId,
      accessToken: serverConfig.instagramToken,
      graphVersion: serverConfig.metaGraphVersion,
    }),
    4000,
  ).catch(() => null);
  const result: CoverImage | null = cover
    ? { source: "instagram", src: cover.imageUrl, href: cover.permalink }
    : null;
  // Media URLs expire, so only keep them briefly in memory.
  await shortLivedCache.set(key, result ?? "none", 30 * 60);
  return result;
}

export async function POST(req: NextRequest) {
  if (!serverConfig.googleApiKey) {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  const limit = await rateLimit(getStore(), clientIp(req.headers), serverConfig.rateLimitPerMinute).catch(() => null);
  if (limit && !limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const result = await runSearch(
      {
        aggregate: new HttpAggregateClient(serverConfig.googleApiKey),
        details: new HttpDetailsClient(serverConfig.googleApiKey),
        idStore: getStore(),
        detailsCache: shortLivedCache,
        logger,
        resolveCover: (_place, handle) => instagramCover(handle),
        limits: {
          maxDetailsPerSearch: serverConfig.maxDetailsPerSearch,
          detailsConcurrency: serverConfig.detailsConcurrency,
          maxAggregateCallsPerSearch: serverConfig.maxAggregateCallsPerSearch,
          placeIdCacheTtlSeconds: serverConfig.placeIdCacheTtlSeconds,
        },
      },
      { center: { lat: body.lat, lng: body.lng }, hours: body.hours as HoursFilter, languageCode: body.lang },
    );
    const response: SearchResponse = {
      tier: result.tier,
      places: result.places,
      hiddenNoHours: result.hiddenNoHours,
      truncated: result.truncated,
    };
    return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    logger.warn("search failed", { error: String(err) });
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
