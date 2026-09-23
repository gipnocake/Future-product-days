const en = {
  "app.tagline": "Only the best-rated restaurants and cafés within 5 km",
  "lang.label": "Language",

  "consent.title": "Find top-rated places near you",
  "consent.body":
    "To show places near you, we need your location. It is used only to run this search. We don't store it on our servers after the search finishes, and we don't track you.",
  "consent.useLocation": "Use my location",
  "consent.manual": "Enter an address instead",
  "consent.privacy": "Privacy policy",

  "location.loading": "Finding your location…",
  "location.denied": "Location access was denied. Search for an address or drag the pin on the map instead.",
  "location.failed": "We couldn't get your location. Search for an address or drag the pin on the map instead.",
  "location.unsupported": "Your browser doesn't support location. Search for an address instead.",
  "location.searchPlaceholder": "Search for an address",
  "location.useMine": "Use my location",
  "location.dragHint": "Drag the pin to change the search area",

  "filters.hours": "Opening hours",
  "filters.any": "Any time",
  "filters.now": "Open now",
  "filters.at": "Open at…",
  "filters.day": "Day",
  "filters.time": "Time",
  "filters.sort": "Sort by",
  "filters.sortRating": "Rating",
  "filters.sortDistance": "Distance",

  "view.map": "Map",
  "view.list": "List",

  "day.0": "Sunday",
  "day.1": "Monday",
  "day.2": "Tuesday",
  "day.3": "Wednesday",
  "day.4": "Thursday",
  "day.5": "Friday",
  "day.6": "Saturday",

  "results.searching": "Searching for the best places… this can take a few seconds.",
  "results.count": "{count} places",
  "results.tier2Notice": "No places met our top standard nearby — here are the next best.",
  "results.tier2Badge": "Next best",
  "results.hiddenNoHours": "{count} places hidden because they have no opening-hours data.",
  "results.truncated": "This area has a lot of candidates, so some places may be missing.",
  "results.emptyTitle": "Nothing found nearby",
  "results.emptyBody": "No places within 5 km meet our standard. Try a different location or change the hours filter.",
  "results.error": "Something went wrong while searching. Please try again.",
  "results.rateLimited": "Too many searches. Please wait a minute and try again.",
  "results.retry": "Try again",

  "place.reviews": "{count} reviews",
  "place.distance": "{distance} away",
  "place.openNow": "Open now",
  "place.closedNow": "Closed now",
  "place.open24h": "Open 24 hours",
  "place.closedToday": "Closed today",
  "place.today": "Today",
  "place.hoursUnknown": "Hours not available",
  "place.directions": "Directions",
  "place.instagram": "Instagram",
  "place.close": "Close",
  "place.photoBy": "Photo:",
  "place.source.instagram": "Instagram",
  "place.source.google": "Google",
  "place.noPhoto": "No photo",

  "map.missingKey": "The map is unavailable (missing Maps JavaScript API key).",
  "attribution.google": "Ratings, hours and photos from Google Maps",

  "privacy.link": "Privacy",
} as const;

export default en;
export type MessageKey = keyof typeof en;
