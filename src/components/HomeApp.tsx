"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LOCALES, useI18n, type Locale } from "@/i18n/I18nProvider";
import { sortByDistance, sortByRating } from "@/lib/search/sort";
import type { HoursFilter, LatLng, SearchResponse, SortMode, Weekday } from "@/lib/types";
import { AddressSearch } from "./AddressSearch";
import { MapView } from "./MapView";
import { GoogleMapsAttribution, PlaceDetail } from "./PlaceDetail";
import { PlaceList, PlaceListSkeleton } from "./PlaceList";

type LocationPhase = "consent" | "locating" | "ready" | "denied" | "failed" | "unsupported" | "manual";
type SearchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; data: SearchResponse }
  | { status: "error"; kind: "rate" | "other" };

const DEFAULT_CENTER: LatLng = { lat: 52.2297, lng: 21.0122 }; // Warsaw — only used to position the manual pin
const CONSENT_KEY = "locationConsent";

interface Props {
  appName: string;
  mapsApiKey: string;
  mapId: string;
}

export function HomeApp(props: Props) {
  const { locale } = useI18n();
  if (!props.mapsApiKey) return <Shell {...props} />;
  return (
    <APIProvider apiKey={props.mapsApiKey} language={locale} libraries={["places", "marker"]}>
      <Shell {...props} />
    </APIProvider>
  );
}

function Shell({ appName, mapsApiKey, mapId }: Props) {
  const { t, locale } = useI18n();
  const [phase, setPhase] = useState<LocationPhase>("consent");
  const [center, setCenter] = useState<LatLng | null>(null);
  const [hours, setHours] = useState<HoursFilter>({ mode: "any" });
  const [sort, setSort] = useState<SortMode>("rating");
  const [view, setView] = useState<"map" | "list">("list");
  const [search, setSearch] = useState<SearchState>({ status: "idle" });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  const requestLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setPhase("unsupported");
      return;
    }
    try {
      localStorage.setItem(CONSENT_KEY, "granted");
    } catch {
      // ignore
    }
    setPhase("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPhase("ready");
      },
      (err) => setPhase(err.code === err.PERMISSION_DENIED ? "denied" : "failed"),
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  // Browser-only initialisation: default view by screen size, and skip the consent
  // screen for returning users who already agreed.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setView(window.matchMedia("(min-width: 768px)").matches ? "map" : "list");
    let consented = false;
    try {
      consented = localStorage.getItem(CONSENT_KEY) === "granted";
    } catch {
      // ignore
    }
    if (consented) requestLocation();
  }, [requestLocation]);

  const chooseManual = useCallback((p: LatLng) => {
    setCenter(p);
    setPhase((ph) => (ph === "consent" ? "manual" : ph));
  }, []);

  // Run the search whenever the location, filter or language changes.
  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!center) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearch({ status: "loading" });
    setSelectedId(null);
    fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: center.lat, lng: center.lng, hours, lang: locale }),
      signal: ctrl.signal,
    })
      .then(async (res) => {
        if (res.status === 429) return setSearch({ status: "error", kind: "rate" });
        if (!res.ok) return setSearch({ status: "error", kind: "other" });
        setSearch({ status: "done", data: (await res.json()) as SearchResponse });
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setSearch({ status: "error", kind: "other" });
      });
    return () => ctrl.abort();
  }, [center, hours, locale, retryToken]);

  const places = useMemo(() => {
    if (search.status !== "done") return [];
    return [...search.data.places].sort(sort === "distance" ? sortByDistance : sortByRating);
  }, [search, sort]);
  const selected = places.find((p) => p.id === selectedId) ?? null;

  if (phase === "consent" && !center) {
    return (
      <Page appName={appName}>
        <ConsentCard
          onAllow={requestLocation}
          onManual={() => setPhase("manual")}
        />
      </Page>
    );
  }

  const pin = center ?? DEFAULT_CENTER;

  return (
    <Page appName={appName}>
      <section className="space-y-3 border-b border-stone-200 bg-white px-4 py-3">
        <LocationStatus phase={phase} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {mapsApiKey ? (
            <div className="flex-1">
              <AddressSearch placeholder={t("location.searchPlaceholder")} onSelect={chooseManual} />
            </div>
          ) : (
            <p className="flex-1 text-sm text-rose-700">{t("map.missingKey")}</p>
          )}
          <button
            type="button"
            onClick={requestLocation}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            {t("location.useMine")}
          </button>
        </div>
        <Controls hours={hours} setHours={setHours} sort={sort} setSort={setSort} view={view} setView={setView} />
      </section>

      <section className="flex-1 px-4 py-3">
        <ResultNotices search={search} onRetry={() => setRetryToken((n) => n + 1)} />

        {view === "map" ? (
          <div className="relative h-[65dvh] overflow-hidden rounded-xl border border-stone-200 md:h-[calc(100dvh-16rem)]">
            {mapsApiKey ? (
              <MapView
                center={pin}
                places={places}
                mapId={mapId}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onCenterChange={chooseManual}
              />
            ) : (
              <p className="p-4 text-sm text-stone-600">{t("map.missingKey")}</p>
            )}
            {search.status === "loading" && (
              <div className="absolute inset-x-0 top-0 h-1 animate-pulse bg-amber-500" aria-hidden="true" />
            )}
            <p className="pointer-events-none absolute bottom-2 left-2 rounded bg-white/90 px-2 py-1 text-xs text-stone-600">
              {t("location.dragHint")}
            </p>
          </div>
        ) : search.status === "loading" ? (
          <PlaceListSkeleton />
        ) : (
          <PlaceList places={places} onSelect={setSelectedId} />
        )}

        {search.status === "done" && places.length > 0 && (
          <p className="mt-3 text-[11px] text-stone-500">
            <GoogleMapsAttribution />
          </p>
        )}
      </section>

      {selected && <PlaceDetail place={selected} onClose={() => setSelectedId(null)} />}
    </Page>
  );
}

function Page({ appName, children }: { appName: string; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <header className="flex items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-stone-900">{appName}</h1>
          <p className="hidden text-xs text-stone-500 sm:block">{t("app.tagline")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/privacy" className="text-xs text-stone-500 underline">
            {t("privacy.link")}
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}

function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div role="group" aria-label={t("lang.label")} className="flex overflow-hidden rounded-md border border-stone-300 text-xs">
      {LOCALES.map((l: Locale) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`px-2 py-1 font-medium uppercase ${locale === l ? "bg-stone-900 text-white" : "bg-white text-stone-700"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function ConsentCard({ onAllow, onManual }: { onAllow: () => void; onManual: () => void }) {
  const { t } = useI18n();
  return (
    <div className="mx-auto my-10 max-w-md space-y-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-stone-900">{t("consent.title")}</h2>
      <p className="text-sm leading-relaxed text-stone-700">{t("consent.body")}</p>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={onAllow} className="rounded-lg bg-stone-900 px-4 py-2.5 font-medium text-white hover:bg-stone-700">
          {t("consent.useLocation")}
        </button>
        <button type="button" onClick={onManual} className="rounded-lg border border-stone-300 px-4 py-2.5 font-medium text-stone-800 hover:bg-stone-50">
          {t("consent.manual")}
        </button>
      </div>
      <Link href="/privacy" className="block text-center text-xs text-stone-500 underline">
        {t("consent.privacy")}
      </Link>
    </div>
  );
}

function LocationStatus({ phase }: { phase: LocationPhase }) {
  const { t } = useI18n();
  if (phase === "locating") {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-stone-700">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-stone-400 border-t-transparent" aria-hidden="true" />
        {t("location.loading")}
      </p>
    );
  }
  const key =
    phase === "denied" ? "location.denied" : phase === "failed" ? "location.failed" : phase === "unsupported" ? "location.unsupported" : null;
  if (!key) return null;
  return (
    <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
      {t(key)}
    </p>
  );
}

interface ControlsProps {
  hours: HoursFilter;
  setHours: (h: HoursFilter) => void;
  sort: SortMode;
  setSort: (s: SortMode) => void;
  view: "map" | "list";
  setView: (v: "map" | "list") => void;
}

function Controls({ hours, setHours, sort, setSort, view, setView }: ControlsProps) {
  const { t } = useI18n();
  const selectCls = "rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm";

  const onModeChange = (mode: HoursFilter["mode"]) => {
    if (mode === "at") {
      const now = new Date();
      setHours({ mode: "at", day: now.getDay() as Weekday, time: `${String(now.getHours()).padStart(2, "0")}:00` });
    } else setHours({ mode });
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs text-stone-600">
        {t("filters.hours")}
        <select className={selectCls} value={hours.mode} onChange={(e) => onModeChange(e.target.value as HoursFilter["mode"])}>
          <option value="any">{t("filters.any")}</option>
          <option value="now">{t("filters.now")}</option>
          <option value="at">{t("filters.at")}</option>
        </select>
      </label>

      {hours.mode === "at" && (
        <>
          <label className="flex flex-col gap-1 text-xs text-stone-600">
            {t("filters.day")}
            <select
              className={selectCls}
              value={hours.day}
              onChange={(e) => setHours({ ...hours, day: Number(e.target.value) as Weekday })}
            >
              {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                <option key={d} value={d}>
                  {t(`day.${d}` as "day.0")}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-stone-600">
            {t("filters.time")}
            <input
              type="time"
              step={900}
              className={selectCls}
              value={hours.time}
              onChange={(e) => e.target.value && setHours({ ...hours, time: e.target.value.slice(0, 5) })}
            />
          </label>
        </>
      )}

      <label className="flex flex-col gap-1 text-xs text-stone-600">
        {t("filters.sort")}
        <select className={selectCls} value={sort} onChange={(e) => setSort(e.target.value as SortMode)}>
          <option value="rating">{t("filters.sortRating")}</option>
          <option value="distance">{t("filters.sortDistance")}</option>
        </select>
      </label>

      <div role="group" className="ml-auto flex overflow-hidden rounded-md border border-stone-300 text-sm">
        {(["map", "list"] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`px-3 py-1.5 font-medium ${view === v ? "bg-stone-900 text-white" : "bg-white text-stone-700"}`}
          >
            {t(v === "map" ? "view.map" : "view.list")}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultNotices({ search, onRetry }: { search: SearchState; onRetry: () => void }) {
  const { t } = useI18n();
  if (search.status === "loading") {
    return (
      <p role="status" className="mb-3 text-sm text-stone-600">
        {t("results.searching")}
      </p>
    );
  }
  if (search.status === "error") {
    return (
      <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-900">
        {t(search.kind === "rate" ? "results.rateLimited" : "results.error")}
        <button type="button" onClick={onRetry} className="font-medium underline">
          {t("results.retry")}
        </button>
      </div>
    );
  }
  if (search.status !== "done") return null;
  const { data } = search;

  return (
    <div className="mb-3 space-y-2">
      {data.tier === null ? (
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
          <h2 className="font-semibold text-stone-900">{t("results.emptyTitle")}</h2>
          <p className="mt-1 text-sm text-stone-600">{t("results.emptyBody")}</p>
        </div>
      ) : (
        <p className="text-sm font-medium text-stone-700">{t("results.count", { count: data.places.length })}</p>
      )}
      {data.tier === 2 && (
        <p role="status" className="rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-sm text-stone-800">
          {t("results.tier2Notice")}
        </p>
      )}
      {data.hiddenNoHours > 0 && <p className="text-xs text-stone-500">{t("results.hiddenNoHours", { count: data.hiddenNoHours })}</p>}
      {data.truncated && <p className="text-xs text-stone-500">{t("results.truncated")}</p>}
    </div>
  );
}
