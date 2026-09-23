import { describe, expect, it } from "vitest";
import { buildInsightsRequest } from "@/lib/google/aggregate";
import { boundingRect } from "@/lib/geo";
import { collectPlaceIds } from "@/lib/search/collectPlaceIds";
import { FakeAggregate, offset, type FakePlace } from "./fakes";

const center = { lat: 52.2297, lng: 21.0122 };
const base = {
  center,
  radiusM: 5000,
  includedTypes: ["restaurant", "cafe"],
  minRating: 4.9,
  maxRating: 5,
  maxCalls: 500,
};

/** Deterministic pseudo-random places spread inside the circle. */
function spread(n: number, rating = 4.95): FakePlace[] {
  let seed = 42;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: n }, (_, i) => {
    const r = 4900 * Math.sqrt(rnd());
    const a = 2 * Math.PI * rnd();
    return { id: `p${i}`, at: offset(center, r * Math.sin(a), r * Math.cos(a)), rating };
  });
}

describe("collectPlaceIds", () => {
  it("builds a circle request with the expected filters", () => {
    const req = buildInsightsRequest(
      { area: { kind: "circle", center, radiusM: 5000 }, includedTypes: ["restaurant", "cafe"], minRating: 4.9, maxRating: 5 },
      "INSIGHT_COUNT",
    );
    expect(req).toEqual({
      insights: ["INSIGHT_COUNT"],
      filter: {
        locationFilter: { circle: { latLng: { latitude: center.lat, longitude: center.lng }, radius: 5000 } },
        typeFilter: { includedTypes: ["restaurant", "cafe"] },
        operatingStatus: ["OPERATING_STATUS_OPERATIONAL"],
        ratingFilter: { minRating: 4.9, maxRating: 5 },
      },
    });
  });

  it("builds a closed polygon for sub-areas", () => {
    const req = buildInsightsRequest(
      { area: { kind: "rect", rect: boundingRect(center, 1000) }, includedTypes: ["cafe"], minRating: 4.8, maxRating: 5 },
      "INSIGHT_PLACES",
    );
    const coords = req.filter.locationFilter.customArea!.polygon.coordinates;
    expect(coords).toHaveLength(5);
    expect(coords[0]).toEqual(coords[4]);
  });

  it("uses one count + one places call when count ≤ 100", async () => {
    const agg = new FakeAggregate(spread(40));
    const { ids, stats } = await collectPlaceIds(agg, base);
    expect(ids).toHaveLength(40);
    expect(stats.aggregateCalls).toBe(2);
    expect(agg.calls.map((c) => c.kind)).toEqual(["count", "places"]);
  });

  it("returns nothing (and makes no places call) when count is 0", async () => {
    const agg = new FakeAggregate(spread(10, 4.5));
    const { ids, stats } = await collectPlaceIds(agg, base);
    expect(ids).toEqual([]);
    expect(stats.aggregateCalls).toBe(1);
  });

  it("splits recursively when count > 100 and finds every place exactly once", async () => {
    const places = spread(350);
    const agg = new FakeAggregate(places);
    const { ids, stats } = await collectPlaceIds(agg, base);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.sort()).toEqual(places.map((p) => p.id).sort());
    expect(stats.skippedAreas).toBe(0);
    // Every places call must have been made on an area with ≤ 100 matches.
    expect(agg.calls.some((c) => c.query.area.kind === "rect")).toBe(true);
  });

  it("stops splitting at the minimum area and reports skipped areas", async () => {
    // 150 places stacked on the same point can never be split below 100.
    const stacked = Array.from({ length: 150 }, (_, i) => ({ id: `s${i}`, at: offset(center, 10, 10), rating: 4.95 }));
    const agg = new FakeAggregate(stacked);
    const warnings: string[] = [];
    const { ids, stats } = await collectPlaceIds(agg, { ...base, onWarn: (m) => warnings.push(m) });
    expect(ids).toEqual([]);
    expect(stats.skippedAreas).toBeGreaterThan(0);
    expect(warnings.join()).toMatch(/minimum size/);
    // Must terminate after a bounded number of calls.
    expect(stats.aggregateCalls).toBeLessThan(100);
  });

  it("respects the aggregate call budget", async () => {
    const agg = new FakeAggregate(spread(350));
    const { stats } = await collectPlaceIds(agg, { ...base, maxCalls: 3 });
    expect(stats.skippedAreas).toBeGreaterThan(0);
    expect(stats.aggregateCalls).toBeLessThanOrEqual(3 + 4); // in-flight siblings may finish
  });
});
