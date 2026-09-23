"use client";

import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";
import type { LatLng } from "@/lib/types";

interface Props {
  placeholder: string;
  onSelect: (point: LatLng) => void;
}

/**
 * Address search using the Places UI Kit `PlaceAutocompleteElement`
 * (the legacy `google.maps.places.Autocomplete` is closed to new customers).
 */
export function AddressSearch({ placeholder, onSelect }: Props) {
  const places = useMapsLibrary("places");
  const container = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!places || !container.current) return;
    const el = new places.PlaceAutocompleteElement({});
    el.setAttribute("placeholder", placeholder);
    el.style.width = "100%";
    el.style.colorScheme = "light";

    const handler = async (event: Event) => {
      const { placePrediction } = event as google.maps.places.PlacePredictionSelectEvent;
      const place = placePrediction.toPlace();
      await place.fetchFields({ fields: ["location"] });
      if (place.location) onSelectRef.current({ lat: place.location.lat(), lng: place.location.lng() });
    };
    el.addEventListener("gmp-select", handler);
    const host = container.current;
    host.replaceChildren(el);
    return () => {
      el.removeEventListener("gmp-select", handler);
      el.remove();
    };
  }, [places, placeholder]);

  return <div ref={container} className="w-full min-h-10" />;
}
