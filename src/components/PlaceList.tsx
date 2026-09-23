"use client";

import { useI18n } from "@/i18n/I18nProvider";
import type { PlaceResult } from "@/lib/types";
import { CoverImage } from "./CoverImage";
import { OpenBadge } from "./HoursStatus";
import { Rating } from "./Stars";

export function PlaceList({ places, onSelect }: { places: PlaceResult[]; onSelect: (id: string) => void }) {
  const { t, formatNumber, formatDistance } = useI18n();
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {places.map((p) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={() => onSelect(p.id)}
            className={`w-full overflow-hidden rounded-xl border bg-white text-left shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              p.tier === 2 ? "border-dashed border-stone-300" : "border-stone-200"
            }`}
          >
            <CoverImage place={p} className="h-40 w-full" width={600} />
            <div className="space-y-1 p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-tight text-stone-900">{p.name}</h3>
                {p.tier === 2 && <TierBadge />}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-600">
                <Rating value={p.rating} label={`${p.rating}`} />
                <span>{t("place.reviews", { count: formatNumber(p.userRatingCount) })}</span>
                <span>{formatDistance(p.distanceMeters)}</span>
              </div>
              <OpenBadge place={p} />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

export function TierBadge() {
  const { t } = useI18n();
  return (
    <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600">
      {t("results.tier2Badge")}
    </span>
  );
}

export function PlaceListSkeleton() {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="animate-pulse overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div className="h-40 bg-stone-200" />
          <div className="space-y-2 p-3">
            <div className="h-4 w-2/3 rounded bg-stone-200" />
            <div className="h-3 w-1/2 rounded bg-stone-200" />
            <div className="h-3 w-1/3 rounded bg-stone-200" />
          </div>
        </li>
      ))}
    </ul>
  );
}
