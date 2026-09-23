"use client";

/* eslint-disable @next/next/no-img-element -- images come from our photo proxy or Instagram's CDN with expiring URLs */
import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import type { PlaceResult } from "@/lib/types";

interface Props {
  place: PlaceResult;
  className?: string;
  /** Show Google author attribution under the image (required wherever the photo is shown large). */
  showAttribution?: boolean;
  width?: number;
}

export function CoverImage({ place, className = "", showAttribution = false, width = 800 }: Props) {
  const { t } = useI18n();
  const [failed, setFailed] = useState(false);
  const cover = place.cover;

  if (!cover || failed) {
    return (
      <div className={`flex items-center justify-center bg-stone-200 text-sm text-stone-500 ${className}`}>
        {t("place.noPhoto")}
      </div>
    );
  }

  const src = cover.source === "google" ? `${cover.src}?w=${width}` : cover.src;
  const attributions = cover.attributions ?? [];

  return (
    <figure className="relative">
      <img
        src={src}
        alt={place.name}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
        {cover.source === "instagram" ? <InstagramIcon /> : <GoogleIcon />}
        {t(cover.source === "instagram" ? "place.source.instagram" : "place.source.google")}
      </span>
      {showAttribution && attributions.length > 0 && (
        <figcaption className="mt-1 text-xs text-stone-500">
          {t("place.photoBy")}{" "}
          {attributions.map((a, i) => (
            <span key={i}>
              {i > 0 && ", "}
              {a.uri ? (
                <a href={a.uri} target="_blank" rel="noopener noreferrer" className="underline">
                  {a.displayName}
                </a>
              ) : (
                a.displayName
              )}
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden="true">
      <path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" />
    </svg>
  );
}
