import { describe, expect, it } from "vitest";
import {
  boundingRect,
  distanceMeters,
  rectAreaM2,
  rectIntersectsCircle,
  rectToPolygon,
  roundLatLng,
  splitRect,
} from "@/lib/geo";

const warsaw = { lat: 52.2297, lng: 21.0122 };

describe("geo", () => {
  it("computes distances", () => {
    const krakow = { lat: 50.0647, lng: 19.945 };
    expect(distanceMeters(warsaw, krakow) / 1000).toBeCloseTo(252, 0);
    expect(distanceMeters(warsaw, warsaw)).toBe(0);
  });

  it("bounding rect of a 5 km circle is ~10 km square", () => {
    const r = boundingRect(warsaw, 5000);
    expect(distanceMeters({ lat: r.south, lng: warsaw.lng }, { lat: r.north, lng: warsaw.lng })).toBeCloseTo(10_000, -1);
    expect(distanceMeters({ lat: warsaw.lat, lng: r.west }, { lat: warsaw.lat, lng: r.east })).toBeCloseTo(10_000, -1);
    expect(rectAreaM2(r) / 1e6).toBeCloseTo(100, 0);
  });

  it("splits into four equal quadrants covering the parent", () => {
    const r = boundingRect(warsaw, 5000);
    const parts = splitRect(r);
    expect(parts).toHaveLength(4);
    const total = parts.reduce((s, p) => s + rectAreaM2(p), 0);
    expect(total).toBeCloseTo(rectAreaM2(r), -3);
    // Quadrants differ slightly by latitude; allow 0.5 %.
    for (const p of parts) expect(Math.abs(rectAreaM2(p) / (rectAreaM2(r) / 4) - 1)).toBeLessThan(0.005);
  });

  it("detects rect/circle intersection", () => {
    const r = boundingRect(warsaw, 5000);
    expect(rectIntersectsCircle(r, warsaw, 5000)).toBe(true);
    const far = boundingRect({ lat: 53, lng: 21 }, 1000);
    expect(rectIntersectsCircle(far, warsaw, 5000)).toBe(false);
  });

  it("produces a closed counter-clockwise polygon", () => {
    const ring = rectToPolygon(boundingRect(warsaw, 1000));
    expect(ring).toHaveLength(5);
    expect(ring[0]).toEqual(ring[4]);
    // Shoelace formula: positive signed area ⇒ counter-clockwise (x = lng, y = lat).
    let area = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      area += ring[i].lng * ring[i + 1].lat - ring[i + 1].lng * ring[i].lat;
    }
    expect(area).toBeGreaterThan(0);
  });

  it("rounds coordinates", () => {
    expect(roundLatLng({ lat: 52.22974, lng: 21.01226 }, 3)).toEqual({ lat: 52.23, lng: 21.012 });
  });
});
