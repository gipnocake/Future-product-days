import type { LatLng } from "./types";

const EARTH_RADIUS_M = 6_371_008.8;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Axis-aligned lat/lng rectangle. */
export interface Rect {
  south: number;
  west: number;
  north: number;
  east: number;
}

export function boundingRect(center: LatLng, radiusM: number): Rect {
  const dLat = toDeg(radiusM / EARTH_RADIUS_M);
  const dLng = toDeg(radiusM / (EARTH_RADIUS_M * Math.cos(toRad(center.lat))));
  return {
    south: center.lat - dLat,
    north: center.lat + dLat,
    west: center.lng - dLng,
    east: center.lng + dLng,
  };
}

/** Approximate area of a small rectangle in m² (good enough for size checks). */
export function rectAreaM2(r: Rect): number {
  const midLat = toRad((r.north + r.south) / 2);
  const h = toRad(r.north - r.south) * EARTH_RADIUS_M;
  const w = toRad(r.east - r.west) * EARTH_RADIUS_M * Math.cos(midLat);
  return Math.abs(h * w);
}

export function splitRect(r: Rect): [Rect, Rect, Rect, Rect] {
  const midLat = (r.north + r.south) / 2;
  const midLng = (r.east + r.west) / 2;
  return [
    { south: r.south, west: r.west, north: midLat, east: midLng }, // SW
    { south: r.south, west: midLng, north: midLat, east: r.east }, // SE
    { south: midLat, west: r.west, north: r.north, east: midLng }, // NW
    { south: midLat, west: midLng, north: r.north, east: r.east }, // NE
  ];
}

/** True if any part of the rectangle lies within the circle. */
export function rectIntersectsCircle(r: Rect, center: LatLng, radiusM: number): boolean {
  const nearest: LatLng = {
    lat: Math.min(Math.max(center.lat, r.south), r.north),
    lng: Math.min(Math.max(center.lng, r.west), r.east),
  };
  return distanceMeters(center, nearest) <= radiusM;
}

/**
 * Closed, counter-clockwise ring as required by the Places Aggregate
 * `customArea.polygon` filter (first and last coordinate identical).
 */
export function rectToPolygon(r: Rect): LatLng[] {
  return [
    { lat: r.south, lng: r.west },
    { lat: r.south, lng: r.east },
    { lat: r.north, lng: r.east },
    { lat: r.north, lng: r.west },
    { lat: r.south, lng: r.west },
  ];
}

export function roundCoord(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export function roundLatLng(p: LatLng, decimals: number): LatLng {
  return { lat: roundCoord(p.lat, decimals), lng: roundCoord(p.lng, decimals) };
}
