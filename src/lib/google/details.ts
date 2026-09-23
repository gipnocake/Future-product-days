import "server-only";
import { DETAILS_FIELD_MASK } from "../config";

// Subset of the Places API (New) Place resource that we request.

export interface PlacePoint {
  day: number;
  hour: number;
  minute: number;
}

export interface PlacePeriod {
  open: PlacePoint;
  close?: PlacePoint;
}

export interface PlaceOpeningHours {
  openNow?: boolean;
  periods?: PlacePeriod[];
}

export interface PlacePhoto {
  name: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: { displayName: string; uri?: string; photoUri?: string }[];
}

export interface PlaceDetails {
  id: string;
  displayName?: { text: string; languageCode?: string };
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  regularOpeningHours?: PlaceOpeningHours;
  currentOpeningHours?: PlaceOpeningHours;
  utcOffsetMinutes?: number;
  websiteUri?: string;
  photos?: PlacePhoto[];
  googleMapsUri?: string;
}

export interface DetailsClient {
  get(placeId: string, languageCode: string): Promise<PlaceDetails | null>;
}

export class HttpDetailsClient implements DetailsClient {
  constructor(private readonly apiKey: string) {}

  async get(placeId: string, languageCode: string): Promise<PlaceDetails | null> {
    const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
    url.searchParams.set("languageCode", languageCode);
    const res = await fetch(url, {
      headers: { "X-Goog-Api-Key": this.apiKey, "X-Goog-FieldMask": DETAILS_FIELD_MASK },
      cache: "no-store",
    });
    // A stale / removed place ID is not fatal for the search.
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Place Details ${res.status}: ${text.slice(0, 300)}`);
    }
    return res.json();
  }
}
