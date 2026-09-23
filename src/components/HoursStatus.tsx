"use client";

import { useI18n } from "@/i18n/I18nProvider";
import type { PlaceResult } from "@/lib/types";

export function OpenBadge({ place }: { place: PlaceResult }) {
  const { t } = useI18n();
  if (place.openNow === null) return null;
  return (
    <span className={`text-sm font-medium ${place.openNow ? "text-emerald-700" : "text-rose-700"}`}>
      {t(place.openNow ? "place.openNow" : "place.closedNow")}
    </span>
  );
}

export function TodayHours({ place }: { place: PlaceResult }) {
  const { t } = useI18n();
  let text: string;
  if (place.open24h) text = t("place.open24h");
  else if (place.todayHours === null) text = t("place.hoursUnknown");
  else if (place.todayHours.length === 0) text = t("place.closedToday");
  else text = place.todayHours.map((r) => `${r.open}–${r.close ?? ""}`).join(", ");
  return (
    <span className="text-sm text-stone-600">
      {t("place.today")}: {text}
    </span>
  );
}
