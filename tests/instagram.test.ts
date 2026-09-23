import { describe, expect, it } from "vitest";
import { extractInstagramHandle, fetchInstagramCover, pickTopMedia } from "@/lib/instagram";

describe("extractInstagramHandle", () => {
  it.each([
    ["https://www.instagram.com/cafe.lorem/", "cafe.lorem"],
    ["https://instagram.com/Cafe_Lorem?igsh=abc", "cafe_lorem"],
    ["http://m.instagram.com/bistro", "bistro"],
  ])("%s → %s", (url, handle) => {
    expect(extractInstagramHandle(url)).toBe(handle);
  });

  it.each([
    "https://cafe-lorem.pl",
    "https://www.instagram.com/p/Cxyz123/",
    "https://www.instagram.com/",
    "https://notinstagram.com/foo",
    "not a url",
    undefined,
  ])("ignores %s", (url) => {
    expect(extractInstagramHandle(url)).toBeNull();
  });
});

describe("pickTopMedia", () => {
  it("picks the most-liked image and uses thumbnails for videos", () => {
    const cover = pickTopMedia([
      { id: "1", media_type: "IMAGE", media_url: "img1", like_count: 10 },
      { id: "2", media_type: "VIDEO", media_url: "vid.mp4", thumbnail_url: "thumb2", like_count: 50 },
      { id: "3", media_type: "CAROUSEL_ALBUM", media_url: "img3", like_count: 20 },
    ]);
    expect(cover).toEqual({ imageUrl: "thumb2", permalink: undefined, likeCount: 50 });
  });

  it("skips videos without a thumbnail", () => {
    const cover = pickTopMedia([
      { id: "1", media_type: "VIDEO", media_url: "vid.mp4", like_count: 99 },
      { id: "2", media_type: "IMAGE", media_url: "img2", like_count: 1 },
    ]);
    expect(cover?.imageUrl).toBe("img2");
  });

  it("falls back to the newest post when likes are hidden", () => {
    const cover = pickTopMedia([
      { id: "1", media_type: "IMAGE", media_url: "old", timestamp: "2026-01-01T00:00:00+0000" },
      { id: "2", media_type: "IMAGE", media_url: "new", timestamp: "2026-09-01T00:00:00+0000" },
    ]);
    expect(cover?.imageUrl).toBe("new");
  });

  it("returns null with no usable media", () => {
    expect(pickTopMedia([])).toBeNull();
  });
});

describe("fetchInstagramCover", () => {
  const cfg = { igUserId: "123", accessToken: "t", graphVersion: "v23.0" };

  it("parses a Business Discovery response", async () => {
    const fake = (async (url: URL) => {
      expect(decodeURIComponent(String(url))).toContain("business_discovery.username(cafe)");
      return Response.json({
        business_discovery: { media: { data: [{ id: "1", media_type: "IMAGE", media_url: "x", like_count: 3, permalink: "p" }] } },
      });
    }) as unknown as typeof fetch;
    expect(await fetchInstagramCover("cafe", cfg, fake)).toEqual({ imageUrl: "x", permalink: "p", likeCount: 3 });
  });

  it("fails silently on API errors (e.g. personal accounts)", async () => {
    const fake = (async () => Response.json({ error: { message: "nope" } }, { status: 400 })) as unknown as typeof fetch;
    expect(await fetchInstagramCover("cafe", cfg, fake)).toBeNull();
    const throws = (async () => {
      throw new Error("network");
    }) as unknown as typeof fetch;
    expect(await fetchInstagramCover("cafe", cfg, throws)).toBeNull();
  });
});
