import type { MessageKey } from "./en";

const pl: Record<MessageKey, string> = {
  "app.tagline": "Tylko najlepiej oceniane restauracje i kawiarnie w promieniu 5 km",
  "lang.label": "Język",

  "consent.title": "Znajdź najlepiej oceniane miejsca w pobliżu",
  "consent.body":
    "Aby pokazać miejsca w pobliżu, potrzebujemy Twojej lokalizacji. Używamy jej tylko do tego wyszukiwania. Nie przechowujemy jej na naszych serwerach po zakończeniu wyszukiwania i nie śledzimy Cię.",
  "consent.useLocation": "Użyj mojej lokalizacji",
  "consent.manual": "Wpisz adres",
  "consent.privacy": "Polityka prywatności",

  "location.loading": "Ustalamy Twoją lokalizację…",
  "location.denied": "Odmówiono dostępu do lokalizacji. Wyszukaj adres albo przeciągnij pinezkę na mapie.",
  "location.failed": "Nie udało się ustalić lokalizacji. Wyszukaj adres albo przeciągnij pinezkę na mapie.",
  "location.unsupported": "Twoja przeglądarka nie obsługuje lokalizacji. Wyszukaj adres.",
  "location.searchPlaceholder": "Wyszukaj adres",
  "location.useMine": "Użyj mojej lokalizacji",
  "location.dragHint": "Przeciągnij pinezkę, aby zmienić obszar wyszukiwania",

  "filters.hours": "Godziny otwarcia",
  "filters.any": "Dowolna pora",
  "filters.now": "Otwarte teraz",
  "filters.at": "Otwarte o…",
  "filters.day": "Dzień",
  "filters.time": "Godzina",
  "filters.sort": "Sortuj według",
  "filters.sortRating": "Ocena",
  "filters.sortDistance": "Odległość",

  "view.map": "Mapa",
  "view.list": "Lista",

  "day.0": "Niedziela",
  "day.1": "Poniedziałek",
  "day.2": "Wtorek",
  "day.3": "Środa",
  "day.4": "Czwartek",
  "day.5": "Piątek",
  "day.6": "Sobota",

  "results.searching": "Szukamy najlepszych miejsc… to może potrwać kilka sekund.",
  "results.count": "Liczba miejsc: {count}",
  "results.tier2Notice": "W pobliżu nie ma miejsc spełniających nasz najwyższy standard — oto kolejne najlepsze.",
  "results.tier2Badge": "Kolejne najlepsze",
  "results.hiddenNoHours": "Ukryte miejsca bez danych o godzinach otwarcia: {count}.",
  "results.truncated": "W tej okolicy jest bardzo wielu kandydatów, więc niektórych miejsc może brakować.",
  "results.emptyTitle": "Brak wyników w pobliżu",
  "results.emptyBody": "Żadne miejsce w promieniu 5 km nie spełnia naszego standardu. Wybierz inną lokalizację lub zmień filtr godzin.",
  "results.error": "Coś poszło nie tak podczas wyszukiwania. Spróbuj ponownie.",
  "results.rateLimited": "Zbyt wiele wyszukiwań. Odczekaj minutę i spróbuj ponownie.",
  "results.retry": "Spróbuj ponownie",

  "place.reviews": "Opinie: {count}",
  "place.distance": "{distance} stąd",
  "place.openNow": "Otwarte teraz",
  "place.closedNow": "Teraz zamknięte",
  "place.open24h": "Otwarte całą dobę",
  "place.closedToday": "Dziś zamknięte",
  "place.today": "Dziś",
  "place.hoursUnknown": "Brak godzin otwarcia",
  "place.directions": "Dojazd",
  "place.instagram": "Instagram",
  "place.close": "Zamknij",
  "place.photoBy": "Zdjęcie:",
  "place.source.instagram": "Instagram",
  "place.source.google": "Google",
  "place.noPhoto": "Brak zdjęcia",

  "map.missingKey": "Mapa jest niedostępna (brak klucza Maps JavaScript API).",
  "attribution.google": "Oceny, godziny i zdjęcia z Map Google",

  "privacy.link": "Prywatność",
};

export default pl;
