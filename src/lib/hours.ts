import type { PlaceOpeningHours, PlacePeriod, PlacePoint } from "./google/details";
import type { HoursFilter, TimeRange, Weekday } from "./types";

const MIN_PER_DAY = 1440;
const MIN_PER_WEEK = 7 * MIN_PER_DAY;

/** Minutes since Sunday 00:00 in the place's local time. */
export interface LocalMoment {
  day: Weekday;
  minutes: number;
}

const weekMinute = (p: PlacePoint) => p.day * MIN_PER_DAY + p.hour * 60 + p.minute;

/** A place is open 24/7 when it has a single period with an open time and no close. */
export function isAlwaysOpen(periods: PlacePeriod[] | undefined): boolean {
  return !!periods && periods.length === 1 && !periods[0].close;
}

export function hasHoursData(hours: PlaceOpeningHours | undefined): boolean {
  return !!hours?.periods && hours.periods.length > 0;
}

/** Whether the weekly `periods` include the given local moment. Handles overnight / week wrap. */
export function isOpenAt(periods: PlacePeriod[], at: LocalMoment): boolean {
  if (isAlwaysOpen(periods)) return true;
  const t = at.day * MIN_PER_DAY + at.minutes;
  return periods.some((p) => {
    if (!p.close) return false;
    const start = weekMinute(p.open);
    let end = weekMinute(p.close);
    if (end <= start) end += MIN_PER_WEEK; // wraps past Saturday → Sunday
    return (t >= start && t < end) || (t + MIN_PER_WEEK >= start && t + MIN_PER_WEEK < end);
  });
}

/** Current local time at a place, from its UTC offset. */
export function localMomentFromOffset(now: Date, utcOffsetMinutes: number): LocalMoment {
  const local = new Date(now.getTime() + utcOffsetMinutes * 60_000);
  return {
    day: local.getUTCDay() as Weekday,
    minutes: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

export function parseTime(hhmm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

const fmt = (p: PlacePoint) => `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;

/** Opening ranges that start on the given local weekday. */
export function rangesForDay(periods: PlacePeriod[], day: Weekday): TimeRange[] {
  return periods
    .filter((p) => p.open.day === day)
    .sort((a, b) => weekMinute(a.open) - weekMinute(b.open))
    .map((p) => ({ open: fmt(p.open), close: p.close ? fmt(p.close) : null }));
}

/**
 * Open-now status. Prefers Google's `currentOpeningHours.openNow` (accounts for
 * holidays / special hours); falls back to the regular weekly schedule.
 * Returns null when there is no hours data at all.
 */
export function computeOpenNow(
  regular: PlaceOpeningHours | undefined,
  current: PlaceOpeningHours | undefined,
  utcOffsetMinutes: number | undefined,
  now: Date,
): boolean | null {
  if (typeof current?.openNow === "boolean") return current.openNow;
  if (typeof regular?.openNow === "boolean") return regular.openNow;
  if (!hasHoursData(regular) || utcOffsetMinutes === undefined) return null;
  return isOpenAt(regular!.periods!, localMomentFromOffset(now, utcOffsetMinutes));
}

export type HoursMatch = "match" | "no-match" | "no-data";

export function matchHoursFilter(
  filter: HoursFilter,
  place: {
    regularOpeningHours?: PlaceOpeningHours;
    currentOpeningHours?: PlaceOpeningHours;
    utcOffsetMinutes?: number;
  },
  now: Date,
): HoursMatch {
  if (filter.mode === "any") return "match";
  if (filter.mode === "now") {
    const open = computeOpenNow(place.regularOpeningHours, place.currentOpeningHours, place.utcOffsetMinutes, now);
    if (open === null) return "no-data";
    return open ? "match" : "no-match";
  }
  if (!hasHoursData(place.regularOpeningHours)) return "no-data";
  const minutes = parseTime(filter.time);
  if (minutes === null) return "match";
  return isOpenAt(place.regularOpeningHours!.periods!, { day: filter.day, minutes }) ? "match" : "no-match";
}
