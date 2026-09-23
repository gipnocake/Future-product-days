"use client";

import { AdvancedMarker, Circle, Map, Pin, useMap } from "@vis.gl/react-google-maps";
import { useEffect } from "react";
import { SEARCH_RADIUS_M } from "@/lib/config";
import type { LatLng, PlaceResult } from "@/lib/types";

interface Props {
  center: LatLng;
  places: PlaceResult[];
  mapId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCenterChange: (p: LatLng) => void;
}

export function MapView({ center, places, mapId, selectedId, onSelect, onCenterChange }: Props) {
  return (
    <Map
      mapId={mapId}
      defaultCenter={center}
      defaultZoom={13}
      gestureHandling="greedy"
      disableDefaultUI
      zoomControl
      clickableIcons={false}
      className="h-full w-full"
    >
      <FitToCircle center={center} />
      <Circle
        center={center}
        radius={SEARCH_RADIUS_M}
        strokeColor="#b45309"
        strokeOpacity={0.6}
        strokeWeight={2}
        fillColor="#f59e0b"
        fillOpacity={0.06}
        clickable={false}
      />
      <AdvancedMarker
        position={center}
        draggable
        zIndex={1000}
        onDragEnd={(e) => {
          const ll = e.latLng;
          if (ll) onCenterChange({ lat: ll.lat(), lng: ll.lng() });
        }}
      >
        <div className="h-5 w-5 rounded-full border-[3px] border-white bg-sky-600 shadow-lg ring-2 ring-sky-600/30" />
      </AdvancedMarker>
      {places.map((p) => (
        <AdvancedMarker key={p.id} position={p.location} title={p.name} onClick={() => onSelect(p.id)} zIndex={p.id === selectedId ? 999 : undefined}>
          <Pin
            background={p.tier === 1 ? "#d97706" : "#a8a29e"}
            borderColor={p.tier === 1 ? "#92400e" : "#57534e"}
            glyphColor="#ffffff"
            scale={p.id === selectedId ? 1.3 : 1}
          />
        </AdvancedMarker>
      ))}
    </Map>
  );
}

/** Keep the whole 5 km circle in view whenever the search centre moves. */
function FitToCircle({ center }: { center: LatLng }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const circle = new google.maps.Circle({ center, radius: SEARCH_RADIUS_M });
    const bounds = circle.getBounds();
    if (bounds) map.fitBounds(bounds, 24);
  }, [map, center]);
  return null;
}
