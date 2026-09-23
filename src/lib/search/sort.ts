import type { PlaceResult } from "../types";

export function sortByRating(a: PlaceResult, b: PlaceResult): number {
  return b.rating - a.rating || b.userRatingCount - a.userRatingCount || a.distanceMeters - b.distanceMeters;
}

export function sortByDistance(a: PlaceResult, b: PlaceResult): number {
  return a.distanceMeters - b.distanceMeters || sortByRating(a, b);
}
