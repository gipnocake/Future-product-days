// Types shared between the server pipeline and the client UI.

export interface LatLng {
  lat: number;
  lng: number;
}

/** 0 = Sunday … 6 = Saturday (same convention as Places API). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type HoursFilter =
  | { mode: "any" }
  | { mode: "now" }
  /** `time` is "HH:MM", interpreted in the place's local time. */
  | { mode: "at"; day: Weekday; time: string };

export type Tier = 1 | 2;

export interface TimeRange {
  /** "HH:MM" in the place's local time. */
  open: string;
  /** "HH:MM" in the place's local time; "24:00" style values are normalised to "00:00". */
  close: string | null;
}

export interface CoverImage {
  source: "instagram" | "google";
  src: string;
  /** Link to the original (Instagram post permalink or photo author page). */
  href?: string;
  /** Google photo author attributions; must be displayed with the image. */
  attributions?: { displayName: string; uri?: string }[];
}

export interface PlaceResult {
  id: string;
  name: string;
  location: LatLng;
  rating: number;
  userRatingCount: number;
  distanceMeters: number;
  tier: Tier;
  /** null when the place has no hours data. */
  openNow: boolean | null;
  /** Today's opening ranges in local time; null when unknown, [] when closed all day. */
  todayHours: TimeRange[] | null;
  open24h: boolean;
  googleMapsUri: string | null;
  websiteUri: string | null;
  instagramHandle: string | null;
  cover: CoverImage | null;
}

export interface SearchResponse {
  tier: Tier | null;
  places: PlaceResult[];
  /** Places dropped because a hours filter was active and they had no hours data. */
  hiddenNoHours: number;
  /** True if more candidates existed than we looked up (cost cap). */
  truncated: boolean;
}

export type SortMode = "rating" | "distance";
