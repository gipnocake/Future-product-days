import type { NextRequest } from "next/server";
import { serverConfig } from "@/lib/config";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { getStore } from "@/lib/store";

export const runtime = "nodejs";

const PHOTO_NAME = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;

/**
 * Proxies Place Photos (New) so the API key never reaches the browser.
 * Images are only cached briefly by the browser/CDN, never stored by us.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ name: string[] }> }) {
  const { name: parts } = await ctx.params;
  const name = parts.join("/");
  if (!PHOTO_NAME.test(name) || !serverConfig.googleApiKey) {
    return new Response("Not found", { status: 404 });
  }

  // Each photo fetch is billed, so the proxy is rate-limited too.
  const limit = await rateLimit(getStore(), `photo:${clientIp(req.headers)}`, serverConfig.photoRateLimitPerMinute).catch(() => null);
  if (limit && !limit.allowed) return new Response("Too many requests", { status: 429 });

  const width = Math.min(1600, Math.max(100, Number(req.nextUrl.searchParams.get("w")) || 800));
  const url = new URL(`https://places.googleapis.com/v1/${name}/media`);
  url.searchParams.set("maxWidthPx", String(width));

  const upstream = await fetch(url, {
    headers: { "X-Goog-Api-Key": serverConfig.googleApiKey },
    redirect: "follow",
    cache: "no-store",
  });
  if (!upstream.ok || !upstream.body) {
    return new Response("Photo unavailable", { status: upstream.status === 404 ? 404 : 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
