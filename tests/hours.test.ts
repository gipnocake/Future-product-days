import { describe, expect, it } from "vitest";
import type { PlacePeriod } from "@/lib/google/details";
import { computeOpenNow, isOpenAt, localMomentFromOffset, matchHoursFilter, rangesForDay } from "@/lib/hours";

const p = (od: number, oh: number, cd: number, ch: number, om = 0, cm = 0): PlacePeriod => ({
  open: { day: od, hour: oh, minute: om },
  close: { day: cd, hour: ch, minute: cm },
});

// Mon–Fri 09:00–17:00
const weekdays = [1, 2, 3, 4, 5].map((d) => p(d, 9, d, 17));
// Fri 20:00 → Sat 02:00 and Sat 22:00 → Sun 03:00 (week wrap)
const nightly = [p(5, 20, 6, 2), p(6, 22, 0, 3)];
const always: PlacePeriod[] = [{ open: { day: 0, hour: 0, minute: 0 } }];

describe("isOpenAt", () => {
  it("handles regular day hours", () => {
    expect(isOpenAt(weekdays, { day: 1, minutes: 9 * 60 })).toBe(true);
    expect(isOpenAt(weekdays, { day: 1, minutes: 17 * 60 })).toBe(false);
    expect(isOpenAt(weekdays, { day: 0, minutes: 12 * 60 })).toBe(false);
  });

  it("handles periods past midnight", () => {
    expect(isOpenAt(nightly, { day: 6, minutes: 60 })).toBe(true);
    expect(isOpenAt(nightly, { day: 6, minutes: 3 * 60 })).toBe(false);
  });

  it("handles the Saturday → Sunday week wrap", () => {
    expect(isOpenAt(nightly, { day: 6, minutes: 23 * 60 })).toBe(true);
    expect(isOpenAt(nightly, { day: 0, minutes: 2 * 60 })).toBe(true);
    expect(isOpenAt(nightly, { day: 0, minutes: 4 * 60 })).toBe(false);
  });

  it("treats a single open-only period as 24/7", () => {
    expect(isOpenAt(always, { day: 3, minutes: 4 * 60 })).toBe(true);
  });
});

describe("open now", () => {
  it("converts to local time using utcOffsetMinutes", () => {
    // 2026-09-21 is a Monday. 06:30 UTC → 08:30 in Warsaw (UTC+2).
    const now = new Date("2026-09-21T06:30:00Z");
    expect(localMomentFromOffset(now, 120)).toEqual({ day: 1, minutes: 8 * 60 + 30 });
    expect(computeOpenNow({ periods: weekdays }, undefined, 120, now)).toBe(false);
    expect(computeOpenNow({ periods: weekdays }, undefined, 120, new Date("2026-09-21T07:30:00Z"))).toBe(true);
  });

  it("prefers Google's currentOpeningHours.openNow (special hours)", () => {
    const now = new Date("2026-09-21T10:00:00Z");
    expect(computeOpenNow({ periods: weekdays }, { openNow: false }, 120, now)).toBe(false);
  });

  it("returns null without hours data", () => {
    expect(computeOpenNow(undefined, undefined, 120, new Date())).toBeNull();
  });
});

describe("matchHoursFilter", () => {
  const now = new Date("2026-09-21T10:00:00Z"); // Monday 12:00 in Warsaw
  const place = { regularOpeningHours: { periods: weekdays }, utcOffsetMinutes: 120 };

  it("any time always matches", () => {
    expect(matchHoursFilter({ mode: "any" }, {}, now)).toBe("match");
  });

  it("open now", () => {
    expect(matchHoursFilter({ mode: "now" }, place, now)).toBe("match");
    expect(matchHoursFilter({ mode: "now" }, {}, now)).toBe("no-data");
  });

  it("open at a chosen day and time", () => {
    expect(matchHoursFilter({ mode: "at", day: 2, time: "10:15" }, place, now)).toBe("match");
    expect(matchHoursFilter({ mode: "at", day: 6, time: "10:15" }, place, now)).toBe("no-match");
    expect(matchHoursFilter({ mode: "at", day: 6, time: "10:15" }, {}, now)).toBe("no-data");
  });
});

describe("rangesForDay", () => {
  it("lists ranges that start on the day", () => {
    expect(rangesForDay(nightly, 6)).toEqual([{ open: "22:00", close: "03:00" }]);
    expect(rangesForDay(weekdays, 0)).toEqual([]);
  });
});
