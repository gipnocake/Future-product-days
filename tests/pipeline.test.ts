import { describe, expect, it } from "vitest";
import type { PlaceDetails } from "@/lib/google/details";
import { runSearch, sortByDistance, type SearchDeps } from "@/lib/search/pipeline";
import { MemoryStore } from "@/lib/store";
import type { HoursFilter, LatLng } from "@/lib/types";
import { FakeAggregate, FakeDetails, offset, silentLogger, type FakePlace } from "./fakes";

const center: LatLng = { lat: 52.2297, lng: 21.0122 };
const monday = new Date("2026-09-21T10:00:00Z"); // 12:00 in Warsaw
const weekdays9to17 = { periods: [1, 2, 3, 4, 5].map((d) => ({ open: { day: d, hour: 9, minute: 0 }, close: { day: d, hour: 17, minute: 0 } })) };

interface Spec {
  id: string;
  rating: number;
  reviews: number;
  northM?: number;
  hours?: boolean;
  website?: string;
  photo?: boolean;
}

function setup(specs: Spec[]) {
  const places: FakePlace[] = [];
  const details: Record<string, PlaceDetails> = {};
  for (const s of specs) {
    const at = offset(center, s.northM ?? 1000, 0);
    places.push({ id: s.id, at, rating: s.rating });
    details[s.id] = {
      id: s.id,
      displayName: { text: `Place ${s.id}` },
      location: { latitude: at.lat, longitude: at.lng },
      rating: s.rating,
      userRatingCount: s.reviews,
      regularOpeningHours: s.hours === false ? undefined : weekdays9to17,
      utcOffsetMinutes: 120,
      websiteUri: s.website,
      googleMapsUri: `https://maps.google.com/?cid=${s.id}`,
      photos:
        s.photo === false
          ? undefined
          : [{ name: `places/${s.id}/photos/ph1`, authorAttributions: [{ displayName: "Ann", uri: "https://maps.google.com/ann" }] }],
    };
  }
  const aggregate = new FakeAggregate(places);
  const detailsClient = new FakeDetails(details);
  const idStore = new MemoryStore();
  const deps: SearchDeps = {
    aggregate,
    details: detailsClient,
    idStore,
    detailsCache: new MemoryStore(),
    logger: silentLogger,
    now: () => monday,
    limits: { maxDetailsPerSearch: 60, detailsConcurrency: 4, maxAggregateCallsPerSearch: 60, placeIdCacheTtlSeconds: 3600 },
  };
  return { deps, aggregate, detailsClient, idStore };
}

const search = (deps: SearchDeps, hours: HoursFilter = { mode: "any" }) =>
  runSearch(deps, { center, hours, languageCode: "en" });

describe("runSearch", () => {
  it("returns tier 1 places sorted by rating, then review count", async () => {
    const { deps } = setup([
      { id: "a", rating: 4.9, reviews: 50 },
      { id: "b", rating: 5.0, reviews: 8 },
      { id: "c", rating: 4.9, reviews: 200 },
      { id: "t2", rating: 4.8, reviews: 100 },
    ]);
    const res = await search(deps);
    expect(res.tier).toBe(1);
    expect(res.places.map((p) => p.id)).toEqual(["b", "c", "a"]);
    expect(res.places.every((p) => p.tier === 1)).toBe(true);
  });

  it("drops tier 1 places with fewer than 5 reviews", async () => {
    const { deps } = setup([
      { id: "few", rating: 5.0, reviews: 4 },
      { id: "ok", rating: 4.9, reviews: 5 },
    ]);
    const res = await search(deps);
    expect(res.places.map((p) => p.id)).toEqual(["ok"]);
  });

  it("falls back to tier 2 (4.8+, ≥2 reviews) when tier 1 is empty", async () => {
    const { deps } = setup([
      { id: "tooFew", rating: 5.0, reviews: 3 }, // fails tier 1, passes tier 2
      { id: "t2", rating: 4.8, reviews: 2 },
      { id: "one", rating: 4.85, reviews: 1 }, // fails both
      { id: "low", rating: 4.7, reviews: 500 },
    ]);
    const res = await search(deps);
    expect(res.tier).toBe(2);
    expect(res.places.map((p) => p.id)).toEqual(["tooFew", "t2"]);
    expect(res.places.every((p) => p.tier === 2)).toBe(true);
  });

  it("returns an empty result with tier null when both tiers are empty", async () => {
    const { deps } = setup([{ id: "low", rating: 4.5, reviews: 100 }]);
    const res = await search(deps);
    expect(res).toMatchObject({ tier: null, places: [], hiddenNoHours: 0 });
  });

  it("drops places outside the exact 5 km circle", async () => {
    const { deps } = setup([
      { id: "in", rating: 4.9, reviews: 10, northM: 4900 },
      { id: "out", rating: 4.9, reviews: 10, northM: 5080 }, // inside the query slack only
    ]);
    const res = await search(deps);
    expect(res.places.map((p) => p.id)).toEqual(["in"]);
  });

  it("applies the open-now filter and counts places hidden for missing hours", async () => {
    const { deps } = setup([
      { id: "open", rating: 4.9, reviews: 10 },
      { id: "noHours", rating: 4.9, reviews: 10, hours: false },
    ]);
    const res = await search(deps, { mode: "now" });
    expect(res.places.map((p) => p.id)).toEqual(["open"]);
    expect(res.hiddenNoHours).toBe(1);
    expect(res.places[0].openNow).toBe(true);
    expect(res.places[0].todayHours).toEqual([{ open: "09:00", close: "17:00" }]);
  });

  it("falls to tier 2 when the hours filter empties tier 1", async () => {
    const { deps } = setup([
      { id: "t1", rating: 4.95, reviews: 10 },
      { id: "t2", rating: 4.8, reviews: 10 },
    ]);
    // Sunday: nobody is open.
    const res = await search(deps, { mode: "at", day: 0, time: "12:00" });
    expect(res.tier).toBeNull();
    const mon = await search(deps, { mode: "at", day: 1, time: "12:00" });
    expect(mon.tier).toBe(1);
  });

  it("uses the Google photo through our proxy with author attribution", async () => {
    const { deps } = setup([{ id: "a", rating: 4.9, reviews: 10 }]);
    const res = await search(deps);
    expect(res.places[0].cover).toEqual({
      source: "google",
      src: "/api/photo/places/a/photos/ph1",
      attributions: [{ displayName: "Ann", uri: "https://maps.google.com/ann" }],
    });
  });

  it("uses the Instagram cover when the resolver finds one, else falls back", async () => {
    const { deps } = setup([
      { id: "ig", rating: 4.9, reviews: 10, website: "https://instagram.com/cafe.ig" },
      { id: "igFail", rating: 4.9, reviews: 10, website: "https://instagram.com/broken" },
    ]);
    deps.resolveCover = async (_p, handle) => {
      if (handle === "broken") throw new Error("IG error");
      return handle ? { source: "instagram", src: `ig:${handle}` } : null;
    };
    const res = await search(deps);
    const byId = Object.fromEntries(res.places.map((p) => [p.id, p]));
    expect(byId.ig.cover?.source).toBe("instagram");
    expect(byId.ig.instagramHandle).toBe("cafe.ig");
    expect(byId.igFail.cover?.source).toBe("google");
  });

  it("caches place IDs and skips the Aggregate API on repeat searches", async () => {
    const { deps, aggregate, idStore } = setup([{ id: "a", rating: 4.9, reviews: 10 }]);
    const first = await search(deps);
    expect(first.stats.aggregateCalls).toBe(2);
    const callsAfterFirst = aggregate.calls.length;
    const second = await search(deps);
    expect(aggregate.calls.length).toBe(callsAfterFirst);
    expect(second.stats.idCacheHits).toBe(1);
    // Only IDs are persisted in the long-lived store.
    const stored = await idStore.get<unknown>("ids:v1:t1:52.230,21.012");
    expect(stored).toEqual(["a"]);
  });

  it("caps the number of Place Details calls", async () => {
    const specs = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, rating: 4.9, reviews: 10, northM: 100 * i }));
    const { deps, detailsClient } = setup(specs);
    deps.limits.maxDetailsPerSearch = 4;
    const res = await search(deps);
    expect(detailsClient.calls).toHaveLength(4);
    expect(res.truncated).toBe(true);
  });

  it("does not re-fetch details already loaded for tier 1 when running tier 2", async () => {
    const { deps, detailsClient } = setup([
      { id: "few", rating: 5.0, reviews: 3 },
      { id: "t2", rating: 4.8, reviews: 3 },
    ]);
    await search(deps);
    expect(detailsClient.calls.sort()).toEqual(["few", "t2"]);
  });

  it("supports sorting by distance", async () => {
    const { deps } = setup([
      { id: "far", rating: 5.0, reviews: 10, northM: 3000 },
      { id: "near", rating: 4.9, reviews: 10, northM: 200 },
    ]);
    const res = await search(deps);
    expect([...res.places].sort(sortByDistance).map((p) => p.id)).toEqual(["near", "far"]);
  });
});
