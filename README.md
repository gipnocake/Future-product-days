# Best Bites

A web app that shows only the **best-rated restaurants and cafés within 5 km** of the user, using Google Maps Platform.

- **Tier 1:** Google rating ≥ 4.9 and ≥ 5 reviews.
- **Tier 2 (fallback):** if tier 1 is empty, rating ≥ 4.8 and ≥ 2 reviews. These results are labelled "Next best" and come with a notice.
- **Cover image:** the place's most-liked Instagram post, when that is available (behind a feature flag). Otherwise its first Google Maps photo.
- **Languages:** English and Polish. **Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Vitest.

> The app name is a placeholder; set `NEXT_PUBLIC_APP_NAME`.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in the keys (see below)
npm run dev                  # http://localhost:3000
npm test                     # unit tests (no API calls, no credits spent)
npm run lint && npm run typecheck
```

## How a search works

All Google and Instagram calls run server-side, in `src/app/api/search/route.ts` and `src/lib/**`.

1. **Places Aggregate API** (`computeInsights`). The query uses:
   - a circle centred on the chosen point, rounded to about 110 m so cached results can be shared. The radius is 5 km plus a 120 m margin.
   - `includedTypes`: `restaurant`, `cafe`, `coffee_shop`
   - `OPERATING_STATUS_OPERATIONAL`
   - a `ratingFilter` of 4.9–5.0

   It sends `INSIGHT_COUNT` first. If the count is 100 or less, it sends `INSIGHT_PLACES` to get the place IDs. If the count is over 100, it splits the area into quadrants (sent as `customArea` polygons) and repeats recursively. Quadrants that don't touch the circle are skipped. Splitting stops at the API's minimum area of 1,556.86 m². See `src/lib/search/collectPlaceIds.ts`.
2. **Place Details (Places API New)** for each ID, run in parallel with a concurrency limit. The field mask is:
   `id, displayName, location, rating, userRatingCount, regularOpeningHours, currentOpeningHours, utcOffsetMinutes, websiteUri, photos, googleMapsUri`.
   `utcOffsetMinutes` was added to the brief's list so that "Open now" can be computed in the place's local time.
3. **Filtering:**
   - Drop places outside the exact 5 km circle.
   - Drop places below the tier's minimum review count.
   - Apply the opening-hours filter. Places with no hours data are hidden only while a filter is active, and the UI shows how many were hidden.
4. **Tier 2 fallback:** if nothing is left after step 3 (including after the hours filter), steps 1–3 run again with the tier-2 rules. Details already fetched in this search are reused.
5. **Sorting:** by rating, then review count, then distance. The user can switch to sorting by distance.
6. **Logging:** each search logs one JSON line with the number of Aggregate and Details calls and cache hits, so cost can be estimated. User coordinates are never logged.

### Opening-hours filter

| Option | Behaviour |
|---|---|
| Any time | No filtering. |
| Open now | Uses Google's `currentOpeningHours.openNow` (includes holiday hours). Falls back to `regularOpeningHours` plus `utcOffsetMinutes`. |
| Open at… | Checks the weekly `regularOpeningHours` periods for the chosen day and time, in the place's local time. Handles hours that run past midnight and from Saturday into Sunday. |

### Cover images

- **Instagram** (only when `INSTAGRAM_ENABLED=true`):
  - Used only when the place's `websiteUri` points to an instagram.com profile.
  - The server calls Business Discovery for that account's last 25 posts and picks the one with the most likes. Videos use their thumbnail.
  - If like counts are hidden, it uses the newest post.
  - Any error falls back to the Google photo without surfacing an error.
  - Results are kept in memory for 30 minutes only, because media URLs expire.
- **Google:** the first Places photo, served through `/api/photo/places/{id}/photos/{photo}` so the API key stays on the server. The photo author attribution is shown in the detail view.
- A small label on each image shows whether it came from Instagram or Google.

### Caching and Google terms

- Only **place ID lists** are stored long-term: in Upstash Redis if configured, keyed by rounded location and tier, with a 7-day TTL by default. Google's terms allow storing place IDs indefinitely.
- Place Details responses (ratings, hours, photos) are kept **in memory for 10 minutes only** and are never written to a persistent store.
- Google Maps attribution is shown under the results and in every detail card. The map itself carries Google's own attribution.

### Abuse and cost protection

- The search endpoint is rate-limited per IP: `RATE_LIMIT_PER_MINUTE`, default 10.
- The photo proxy is rate-limited per IP: `PHOTO_RATE_LIMIT_PER_MINUTE`, default 120.
- Each search is capped by `MAX_DETAILS_PER_SEARCH` (default 60) and `MAX_AGGREGATE_CALLS_PER_SEARCH` (default 60). The UI says when the cap cut the results short.

## Google Cloud setup

1. Create or choose a Google Cloud project and **enable billing**.
2. Enable these APIs under *APIs & Services → Library*:
   - **Maps JavaScript API** (map and markers)
   - **Places API (New)** (Place Details, Place Photos, and the browser's `PlaceAutocompleteElement`)
   - **Places Aggregate API** (`areainsights.googleapis.com`)
3. Create **two API keys** under *Credentials*:
   - **Server key → `GOOGLE_PLACES_API_KEY`**
     - API restrictions: *Places API (New)* and *Places Aggregate API*.
     - Add an IP restriction if your host has fixed egress IPs.
     - Never expose this key to the browser.
   - **Browser key → `NEXT_PUBLIC_GOOGLE_MAPS_JS_API_KEY`**
     - API restrictions: *Maps JavaScript API* and *Places API (New)*.
     - Application restriction: **HTTP referrers**, e.g. `https://your-domain.com/*` and `http://localhost:3000/*`.
4. Create a **Map ID** (*Google Maps Platform → Map Management*, type JavaScript, vector) and set `NEXT_PUBLIC_GOOGLE_MAP_ID`. Advanced Markers need it. `DEMO_MAP_ID` works for development only.
5. Set **quotas and budget alerts** (*Google Maps Platform → Quotas*, and *Billing → Budgets*). Place Details requests that include `rating`, `userRatingCount`, `regularOpeningHours` or `websiteUri` are billed at the **Enterprise** SKU.
6. Check coverage: Places Aggregate API data coverage varies by country. Confirm it covers your launch markets.

The legacy `google.maps.places.Autocomplete` has not been available to new customers since March 2025, so the app uses `PlaceAutocompleteElement`.

## Instagram (Meta) setup — optional

Business Discovery only works when **our own** Instagram professional account queries **other public Business/Creator accounts**.

1. Convert our Instagram account to a **Business** (or Creator) account and link it to a **Facebook Page**.
2. At [developers.facebook.com](https://developers.facebook.com/) create an app of type **Business**, and add the **Instagram** product using *API setup with Facebook Login*.
3. Request these permissions:
   - `instagram_basic`
   - `pages_show_list`
   - `pages_read_engagement` (and `business_management` if your Page setup needs it)

   Business Discovery needs **Advanced Access**, which requires **App Review** and Business Verification.
4. Generate a **long-lived** user access token for the account that manages the Page. Find the Instagram Business Account ID with `GET /{page-id}?fields=instagram_business_account`.
5. Set `INSTAGRAM_BUSINESS_ACCOUNT_ID`, `INSTAGRAM_ACCESS_TOKEN` and `META_GRAPH_API_VERSION`, then set `INSTAGRAM_ENABLED=true`.
6. Rate limits: Business Discovery calls count against the app's Business Use Case limits. Results are cached in memory for 30 minutes per handle.

Until review is approved, leave `INSTAGRAM_ENABLED=false` and the app uses Google photos only.

## Deployment (Vercel)

- Add every variable from `.env.example` to the project's environment variables.
- Recommended: add an **Upstash Redis** integration (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`). Without it, the rate limit and ID cache are per instance and don't survive between requests on serverless.
- `/api/search` sets `maxDuration = 60`, because first searches in dense areas can take several seconds.

## Privacy

- The app asks for location consent in plain language before the browser prompt, and offers manual address entry or dragging the pin as an alternative.
- User coordinates are only used to handle the request. They are never logged or persisted.
- There are no cookies. `localStorage` holds only the language choice and whether the user already agreed to share their location.
- `/privacy` contains a template policy in English and Polish. Add the operator's name and contact details before launch. No cookie banner is needed unless non-essential cookies are added.

## Project layout

```
src/
  app/
    api/search/route.ts        search endpoint (validation, rate limit, pipeline)
    api/photo/[...name]/       Place Photos proxy
    privacy/                   privacy policy page
    page.tsx, layout.tsx
  components/                  UI (map, list, detail sheet, filters, address search)
  i18n/                        en.ts / pl.ts strings, provider, privacy text
  lib/
    search/collectPlaceIds.ts  Aggregate count → places / recursive split
    search/pipeline.ts         tiers, filters, sorting, cover selection, logging
    google/                    Places Aggregate + Place Details clients
    hours.ts                   opening-hours logic
    instagram.ts               handle detection, Business Discovery, best-post picker
    geo.ts, store.ts, rateLimit.ts, config.ts
tests/                         Vitest unit tests with fake API clients
```

## Known limitations

- If a single sub-area at the minimum size still holds more than 100 matching places (very unlikely at a 4.8+ rating), it is skipped and a warning is logged.
- When the per-search Details cap is reached, the places checked are the first N IDs in the order returned. They are not the N best.
- "Open at…" uses the regular weekly schedule, so holiday hours are not considered.
