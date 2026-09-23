"use client";

import { useEffect, useRef } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import type { PlaceResult } from "@/lib/types";
import { CoverImage } from "./CoverImage";
import { OpenBadge, TodayHours } from "./HoursStatus";
import { TierBadge } from "./PlaceList";
import { Rating } from "./Stars";

/** Bottom sheet on mobile, centred card on larger screens. */
export function PlaceDetail({ place, onClose }: { place: PlaceResult; onClose: () => void }) {
  const { t, formatNumber, formatDistance } = useI18n();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const instagramUrl = place.instagramHandle ? `https://www.instagram.com/${place.instagramHandle}/` : null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={place.name}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-md sm:rounded-2xl"
      >
        <div className="relative">
          <CoverImage place={place} className="h-56 w-full" showAttribution />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("place.close")}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-stone-700 shadow hover:bg-white"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor" aria-hidden="true">
              <path d="M5.3 4.3a1 1 0 0 1 1.4 0L10 7.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 9l3.3 3.3a1 1 0 0 1-1.4 1.4L10 10.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 9 5.3 5.7a1 1 0 0 1 0-1.4z" />
            </svg>
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-semibold text-stone-900">{place.name}</h2>
            {place.tier === 2 && <TierBadge />}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
            <Rating value={place.rating} label={`${place.rating}`} />
            <span>{t("place.reviews", { count: formatNumber(place.userRatingCount) })}</span>
            <span>{t("place.distance", { distance: formatDistance(place.distanceMeters) })}</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <OpenBadge place={place} />
            <TodayHours place={place} />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {place.googleMapsUri && (
              <a
                href={place.googleMapsUri}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
              >
                {t("place.directions")}
              </a>
            )}
            {instagramUrl && (
              <a
                href={place.cover?.source === "instagram" && place.cover.href ? place.cover.href : instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
              >
                {t("place.instagram")}
              </a>
            )}
          </div>

          <p className="border-t border-stone-100 pt-2 text-[11px] text-stone-500">
            <GoogleMapsAttribution />
          </p>
        </div>
      </div>
    </div>
  );
}

export function GoogleMapsAttribution() {
  const { t } = useI18n();
  return (
    <span translate="no">
      {t("attribution.google")} · <span className="font-medium">Google Maps</span>
    </span>
  );
}
