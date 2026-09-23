import { HomeApp } from "@/components/HomeApp";

export default function Home() {
  return (
    <HomeApp
      appName={process.env.NEXT_PUBLIC_APP_NAME || "Best Bites"}
      // Browser key: restricted to Maps JavaScript API + HTTP referrers. Never the server key.
      mapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_JS_API_KEY ?? ""}
      mapId={process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID"}
    />
  );
}
