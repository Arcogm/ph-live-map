# PH Live Map — Design

2026-11-27 · Status: approved

## Intent and why

PH Live Map is a public, static dashboard showing live earthquakes and
click-anywhere weather on a dark map of the Philippines. It exists as a
portfolio piece: proof to employers that Justin can consume real APIs,
handle async data and failure states, and ship a clean, responsive front
end. A visitor should understand it in ten seconds; a recruiter should
find readable code behind it.

## Goals

- Live USGS earthquakes, last 7 days, in the Philippine bounding box.
- Click the map for current weather at that point (Open-Meteo).
- Honest loading, empty, stale, and error states.
- Works on a phone and on desktop, keyboard accessible.
- Deployed publicly, no API keys anywhere in the repo or history.
- Clean README with screenshot, run steps, and data credits.

## Non-goals

- No 3D globe, accounts, database, or backend.
- No paid APIs, keys, or tile providers requiring registration.
- No typhoon/flights layer until phases 1–4 are deployed (stretch only).
- No attempt to match God's Eye View feature for feature.

## Constraints

- Free tier only: USGS FDSN, Open-Meteo, CARTO dark raster tiles, Leaflet.
- Static hosting on GitHub Pages (repository will be public).
- Small scope: vanilla JavaScript, no framework.
- The user chose a **clean modern dashboard** look, not the portfolio's
  pixel theme.

## Approaches considered

1. **Vanilla JS + Vite + Leaflet (chosen).** Smallest surface, matches the
   spec, every line is recruiter-readable, static build deploys anywhere.
   Trade-off: no component abstraction; acceptable because the UI is one
   panel and one layer per concern.
2. **React + Vite + Leaflet.** More familiar component model, but adds
   boilerplate, a reconciler, and hooks around imperative Leaflet objects.
   The spec makes React optional; it would not improve this app.
3. **MapLibre GL + vector tiles.** Smoother zoom and styling, but needs a
   style/tile source with more setup and a heavier API for markers and
   popups. More risk for no feature the spec asks for.

## Decisions

### Stack and files

- Vite 7, vanilla ES modules, Leaflet 1.9, plain CSS.
- No runtime dependencies beyond Leaflet. System UI font stack.
- Files follow the spec:
  - `index.html` — shell, map container, panel, credits.
  - `src/main.js` — app wiring, click routing, state.
  - `src/layers/earthquakes.js` — USGS fetch, geo→UI model, layer drawing.
  - `src/layers/weather.js` — Open-Meteo fetch, click marker, popup.
  - `src/ui/panel.js` — toggles, filter, legend, refresh, status messages.
  - `src/ui/format.js` — pure formatting helpers (time, depth, compass).
  - `src/utils/cache.js` — in-memory TTL cache, injectable clock for tests.
  - `src/styles.css` — theme, layout, responsive panel.
  - `test/*.test.js` — `node:test` for cache and formatting helpers.

### Look and layout

- Full-screen dark CARTO basemap. Dark UI chrome, one accent hue.
- Top-left brand block: `PH LIVE MAP`, one-line subtitle, live status
  (“Live · updated 14:02” with a pulsing dot).
- Control panel under the brand (desktop): layer toggles, magnitude
  filter, legend, refresh button, status area.
- Mobile: brand stays compact; controls collapse behind a “Controls”
  button into a bottom sheet with a close button and backdrop.
- Bottom-right credits: USGS, Open-Meteo, CARTO, Leaflet (links).
- Magnitude is the only saturated color scale; everything else is
  neutral so the quakes read first. Palette and radii:
  - `< 4.5` blue `#38bdf8`, radius `7 + mag × 2`
  - `4.5–5.4` amber `#fbbf24`, same radius formula
  - `5.5–6.4` orange `#fb923c`
  - `≥ 6.5` red `#ef4444`
  - `null` magnitude: gray, radius 7.
- Circles have a subtle dark ring and light hover. Legend lists the
  color bins with sample dots and the size rule (“size = magnitude”).

### Data and behavior

- **Earthquakes:** `GET https://earthquake.usgs.gov/fdsnws/event/1/query`
  with `format=geojson`, `starttime` computed as now − 7 days,
  `minlatitude=4&maxlatitude=22&minlongitude=116&maxlongitude=128`,
  `orderby=time`. Confirmed live: returns PH-region quakes keyless.
- Load on start, whenever cached data passes 5 minutes old while the tab
  is visible, and on manual refresh. Keep the last successful feature
  list in memory; if a later fetch fails, keep drawing it and show
  “Couldn’t refresh. Showing data from HH:MM.” with Retry. A failed
  first load shows the error card on the map, never a blank map.
- **Weather:** only on map click (never hover). `GET
  https://api.open-meteo.com/v1/forecast` with `latitude`,
  `longitude`, `current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m`,
  `timezone=Asia/Manila`. Shows a pin at the clicked point and a popup:
  temperature, feels-like, rain, wind speed + compass direction, weather
  code description, coordinates, fetch time in Asia/Manila. Clicking a
  quake circle opens the quake popup only, never a weather fetch.
- **Cache and freshness (my call, resolving the reviewer's question):**
  in-memory `Map`, TTL exactly 5 minutes, keyed by request URL. A
  one-minute timer runs only while the tab is visible and refetches
  earthquakes only when the cached data is older than 5 minutes; on
  `visibilitychange` back to visible the same check runs immediately. No
  polling while hidden. Manual Refresh is explicit user intent and
  bypasses the earthquake cache. So the brand’s liveness is real: fresh
  under 5 minutes = “Live · updated HH:MM”, older = “Stale · updated
  HH:MM”. Repeated weather clicks within 5 minutes reuse the response.
- **Magnitude filter:** All / 4.5+ / 5.5+ / 6.5+, applied client-side to
  the cached feature list. Empty result shows “No earthquakes match this
  filter” with a reset action. Empty API result shows “No earthquakes in
  the last 7 days.”
- **Toggle:** earthquakes layer on/off (Leaflet layer add/remove);
  weather-on-click on/off (map cursor hint + click handler guard).
- **Visible status (my call):** the always-visible brand block shows the
  load state on every viewport: Live / Updating / Stale / Offline, with
  the last successful time. The panel’s detailed status area (retry
  buttons, empty/filter messages) mirrors it. On mobile, a failed first
  load or a later refresh failure therefore still surfaces outside the
  closed sheet, and the sheet opens with the error and Retry when tapped.
- **Weather states (my call):** weather has its own slot inside the
  popup. Clicking shows the pin plus a popup with a loading state; on
  success it renders the values; on failure the pin stays and the popup
  shows “Couldn’t load weather. Try again.” with a Retry button, kept out
  of the earthquake status area. Clicking elsewhere replaces pin and
  popup.
- **Keyboard (my call, resolving the second question):** controls-only is
  the bar the spec sets. All chrome is keyboard operable; quake popups
  are reachable without a pointer through a keyboard-accessible,
  screen-reader-labelled earthquake list in the panel (newest first,
  magnitude, place, time; activating an entry opens and focuses its
  popup). Weather stays click-only, since a non-pointer point picker is
  new UI the spec doesn’t ask for; the README documents that limit.
- **Status:** `aria-live="polite"` region for loading, updated time,
  stale, error, and empty messages. Spinner respects
  `prefers-reduced-motion`.
- **Keyboard mechanics:** all controls are real buttons/checkboxes/selects
  so the browser handles focus and activation; Escape closes the mobile
  sheet; focus-visible outlines use the accent. The earthquake list
  entries are buttons inside a labelled list.

### Deployment and verification

- Public GitHub repo `ph-live-map` (gh CLI already authenticated).
  Vite `base` set to `/ph-live-map/` for the Pages project URL in CI;
  dev uses `/`.
- GitHub Actions workflow builds and publishes `dist/` to Pages.
- Verify with `npm run build`, `node --test`, and the in-app browser:
  desktop + mobile viewport, console clean, network-offline error path,
  popup content, and screenshot for the README.
- README: what it is, screenshot, run/deploy steps, architecture in five
  lines, data credits and USGS-vs-PHIVOLCS note, what was learned.

## Open items left to the builder

Exact microcopy, spacing polish, and README wording. Any new feature that
is not in phases 1–4 needs a separate approval.
