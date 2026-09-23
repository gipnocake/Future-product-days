import "server-only";

// Instagram cover images via the Graph API Business Discovery endpoint.
// Only works for public Business/Creator accounts; every failure returns null
// so the caller falls back to the Google photo.

const RESERVED_PATHS = new Set(["p", "reel", "reels", "explore", "stories", "tv", "accounts", "about", "developer", "legal"]);

/** Extract an Instagram username from a website URL, or null if it isn't an instagram.com profile. */
export function extractInstagramHandle(websiteUri: string | undefined | null): string | null {
  if (!websiteUri) return null;
  let url: URL;
  try {
    url = new URL(websiteUri.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  if (host !== "instagram.com" && !host.endsWith(".instagram.com")) return null;
  const first = url.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (!first || RESERVED_PATHS.has(first)) return null;
  return /^[a-z0-9._]{1,30}$/.test(first) ? first : null;
}

export interface IgMedia {
  id: string;
  media_type?: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  like_count?: number;
  permalink?: string;
  timestamp?: string;
}

export interface IgCover {
  imageUrl: string;
  permalink?: string;
  likeCount?: number;
}

/**
 * Pick the most-liked post with a usable still image (videos use their thumbnail).
 * If no like counts are visible (hidden likes), use the newest usable post.
 */
export function pickTopMedia(media: IgMedia[]): IgCover | null {
  const usable = media
    .map((m) => ({ m, img: m.media_type === "VIDEO" ? m.thumbnail_url : m.media_url }))
    .filter((x): x is { m: IgMedia; img: string } => Boolean(x.img));
  if (usable.length === 0) return null;
  const anyLikes = usable.some((x) => (x.m.like_count ?? 0) > 0);
  const best = anyLikes
    ? usable.reduce((a, b) => ((b.m.like_count ?? 0) > (a.m.like_count ?? 0) ? b : a))
    : usable.reduce((a, b) => ((b.m.timestamp ?? "") > (a.m.timestamp ?? "") ? b : a));
  return { imageUrl: best.img, permalink: best.m.permalink, likeCount: best.m.like_count };
}

export interface InstagramConfig {
  igUserId: string;
  accessToken: string;
  graphVersion: string;
  mediaLimit?: number;
}

export async function fetchInstagramCover(
  handle: string,
  cfg: InstagramConfig,
  fetchImpl: typeof fetch = fetch,
): Promise<IgCover | null> {
  try {
    const fields = `business_discovery.username(${handle}){media.limit(${cfg.mediaLimit ?? 25}){id,media_type,media_url,thumbnail_url,like_count,permalink,timestamp}}`;
    const url = new URL(`https://graph.facebook.com/${cfg.graphVersion}/${cfg.igUserId}`);
    url.searchParams.set("fields", fields);
    url.searchParams.set("access_token", cfg.accessToken);
    const res = await fetchImpl(url, { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { business_discovery?: { media?: { data?: IgMedia[] } } };
    return pickTopMedia(json.business_discovery?.media?.data ?? []);
  } catch {
    return null;
  }
}
