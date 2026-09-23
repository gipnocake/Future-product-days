import type { Locale } from "./I18nProvider";

interface PrivacyContent {
  title: string;
  updated: string;
  back: string;
  sections: { heading: string; body: string[] }[];
}

// Template text — have it reviewed and add the operator's legal name and contact before launch.
export const privacyContent: Record<Locale, PrivacyContent> = {
  en: {
    title: "Privacy policy",
    updated: "Last updated: September 2026",
    back: "← Back to the app",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Location: if you allow it, your browser shares your approximate position so we can find places within 5 km. Alternatively you can type an address or move a pin on the map.",
          "Your location is sent to our server only to run the search. We do not store it after the request, we do not log it, and we do not build a profile of you.",
          "To prevent abuse we briefly count requests per IP address (for about one minute). These counters are deleted automatically.",
        ],
      },
      {
        heading: "Third parties",
        body: [
          "The map and address search are provided by Google Maps Platform. Google processes data when your browser loads the map or search suggestions, under the Google Privacy Policy (https://policies.google.com/privacy).",
          "Place information (ratings, opening hours, photos) comes from Google Maps. Some cover images come from public Instagram business profiles via Meta's Instagram Graph API; those requests are made by our server, not your browser, but images are loaded from Instagram's servers.",
        ],
      },
      {
        heading: "Cookies and storage",
        body: [
          "We do not use advertising or analytics cookies. We store your language choice and whether you already agreed to share your location in your browser's local storage; you can clear it at any time in your browser settings.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "Under the GDPR you may ask what data we hold about you, and ask for it to be corrected or deleted. Because we don't store personal data after a search, there is normally nothing to return. Contact: [add contact email].",
        ],
      },
    ],
  },
  pl: {
    title: "Polityka prywatności",
    updated: "Ostatnia aktualizacja: wrzesień 2026",
    back: "← Wróć do aplikacji",
    sections: [
      {
        heading: "Jakie dane zbieramy",
        body: [
          "Lokalizacja: jeśli wyrazisz zgodę, przeglądarka przekaże Twoją przybliżoną pozycję, abyśmy mogli znaleźć miejsca w promieniu 5 km. Możesz też wpisać adres lub przesunąć pinezkę na mapie.",
          "Twoja lokalizacja trafia na nasz serwer wyłącznie w celu wykonania wyszukiwania. Nie przechowujemy jej po zakończeniu zapytania, nie zapisujemy jej w logach i nie tworzymy Twojego profilu.",
          "Aby zapobiegać nadużyciom, przez około minutę zliczamy zapytania z danego adresu IP. Liczniki są usuwane automatycznie.",
        ],
      },
      {
        heading: "Podmioty trzecie",
        body: [
          "Mapę i wyszukiwarkę adresów dostarcza Google Maps Platform. Google przetwarza dane, gdy przeglądarka ładuje mapę lub podpowiedzi, zgodnie z Polityką prywatności Google (https://policies.google.com/privacy).",
          "Informacje o miejscach (oceny, godziny otwarcia, zdjęcia) pochodzą z Map Google. Część zdjęć pochodzi z publicznych profili firmowych na Instagramie (Instagram Graph API firmy Meta); zapytania wykonuje nasz serwer, ale same zdjęcia są ładowane z serwerów Instagrama.",
        ],
      },
      {
        heading: "Pliki cookie i pamięć przeglądarki",
        body: [
          "Nie używamy reklamowych ani analitycznych plików cookie. W pamięci lokalnej przeglądarki zapisujemy wybrany język oraz informację, czy zgodziłeś się udostępnić lokalizację; możesz je w każdej chwili usunąć w ustawieniach przeglądarki.",
        ],
      },
      {
        heading: "Twoje prawa",
        body: [
          "Zgodnie z RODO możesz zapytać, jakie dane o Tobie przechowujemy, oraz zażądać ich poprawienia lub usunięcia. Ponieważ nie przechowujemy danych osobowych po wyszukiwaniu, zwykle nie ma czego zwrócić. Kontakt: [dodaj adres e-mail].",
        ],
      },
    ],
  },
};
