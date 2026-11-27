# PH Live Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a static dark map dashboard that shows live Philippine earthquakes and click-for-weather, deployed publicly with clean code and honest states.

**Architecture:** Vite builds a vanilla ES-module app. Leaflet renders a CARTO dark basemap; `src/layers/earthquakes.js` fetches USGS GeoJSON, caches it five minutes, and draws circle markers; `src/layers/weather.js` fetches Open-Meteo on map click into one reusable popup; `src/ui/panel.js` owns controls, legend, quake list, and status; `src/main.js` wires them. Pure helpers live in `src/utils/cache.js` and `src/ui/format.js` and are unit-tested with `node:test`.

**Tech Stack:** Vite 7, vanilla JavaScript (ES modules), Leaflet 1.9, plain CSS, `node:test` + `node:assert`, GitHub Actions → GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-11-27-ph-live-map-design.md` (approved), derived from `PH Live Map Project Spec.md`.

## Global Constraints

- Static front end only: no backend, no login, no database, no API keys anywhere in the repo or git history.
- Free APIs only: USGS `earthquake.usgs.gov/fdsnws/event/1/query`, Open-Meteo `api.open-meteo.com/v1/forecast`, CARTO dark raster tiles, Leaflet.
- Earthquake window: last 7 days, bounding box `minlatitude=4&maxlatitude=22&minlongitude=116&maxlongitude=128`, `format=geojson`, `orderby=time`.
- Cache TTL exactly 5 minutes, in memory, keyed by request URL.
- Weather fetches only on map click, never on hover; popup fields only: temperature, feels-like, rain, wind speed + direction, weather code, coordinates, fetch time in `Asia/Manila`.
- Quake popup fields: place, magnitude, depth in km, local time in `Asia/Manila`.
- Magnitude color bins: `<4.5` `#38bdf8`, `4.5–5.4` `#fbbf24`, `5.5–6.4` `#fb923c`, `≥6.5` `#ef4444`, null `#94a3b8`; radius `7 + mag × 2` (null radius 7).
- Mobile (<760px): panel collapses behind a “Controls” button into a bottom sheet; Escape closes it; backdrop closes it.
- Always-visible brand state: Live / Updating / Stale / Offline with last success time.
- Accessibility: native controls, visible focus, `aria-live="polite"` status, labelled toggles, keyboard-reachable quake list.
- Node 20+ floor (plan built and verified on Node 26).

## Review Focus

- USGS returns `mag: null` and non-earthquake event types: giant circles must not render; a null magnitude is gray and radius 7, and only `type === "earthquake"` features draw.
- USGS returns 0 features in the window: the map must say “No earthquakes in the last 7 days.”, never look broken or blank.
- Clicking directly on a quake circle must not also fire a weather request or replace the quake popup.
- Network fails or returns a non-2xx body on a *later* refresh after success: existing circles stay, brand flips to Offline/Stale, and Retry recovers without a reload.
- Rapid repeated clicks and filter/toggle changes while a fetch is in flight: the last click must win, no duplicate pins/popups, no stale response overwriting newer state.

---

### Task 1: Scaffold, map base, deploy pipeline

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `src/main.js`, `src/styles.css`, `.gitignore`, `.github/workflows/deploy.yml`
- Test: none (verified in browser)

**Interfaces:**
- Consumes: nothing.
- Produces: running app at `/`, Vite config with `base` `"/"` in dev and `"/ph-live-map/"` in CI, `#map` full-screen element, `npm run dev`, `npm run build`, `npm test`.

- [ ] **Step 1: Initialize git, `.gitignore`, and package manifests**

`npm init -y`, then set `"type": "module"`, scripts `dev`/`build`/`preview`/`test`, install `leaflet` and `vite`. `.gitignore`: `node_modules/`, `dist/`, `*.local`, `.DS_Store`. First commit before any build artifacts exist, including the approved design and this plan under `docs/`.

- [ ] **Step 2: Add `vite.config.js`**

`base: process.env.GITHUB_ACTIONS ? "/ph-live-map/" : "/"`, `build.outDir: "dist"`. Scripts: `"test": "node --test test/"`.

- [ ] **Step 3: Write `index.html`**

Full-bleed `<main id="map">`, `<header>` brand block (`h1` “PH Live Map”, subtitle “Live earthquakes & weather · Philippines”, `#live-status` with pulsing dot), `<aside id="panel">` placeholder, `<footer>` credits links (USGS, Open-Meteo, CARTO, Leaflet), `<script type="module" src="/src/main.js">`. Include `<meta name="viewport" content="width=device-width, initial-scale=1">` and a `<noscript>` message.

- [ ] **Step 4: Write `src/main.js` map setup**

`L.map("map", { center: [12.5, 122.5], zoom: 5, zoomControl: false, worldCopyJump: true, minZoom: 4 })`; add CARTO dark tiles `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png` with attribution; add `L.control.scale({ imperial: false })` bottom-left; add zoom control top-right.

- [ ] **Step 5: Write `src/styles.css` base**

Dark neutral theme (`--bg:#0b0f14`, `--panel:rgba(13,18,25,.92)`, `--ink:#e6edf3`, `--muted:#8b98a5`, `--line:rgba(255,255,255,.09)`, `--accent:#38bdf8`), system font stack, full-height layout, panel card styling, `prefers-reduced-motion` guard for the pulse.

- [ ] **Step 6: Verify in browser and build**

Run `npm run dev`, open the app, confirm the dark PH map loads, zoom/pan work, scale bar shows, console clean. Then `npm run build` and `npm run preview`, confirm again.

- [ ] **Step 7: Add Pages workflow and commit**

`.github/workflows/deploy.yml`: on push to `main`, `actions/checkout`, `setup-node` 20, `npm ci`, `npm test`, `npm run build`, `upload-pages-artifact` from `dist`, `deploy-pages` with `pages: write`/`id-token: write`. Commit scaffold.

### Task 2: Cache and format helpers (TDD)

**Files:**
- Create: `src/utils/cache.js`, `src/ui/format.js`, `test/cache.test.js`, `test/format.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `createCache({ ttl = 300_000, now = Date.now }) -> { get(key), set(key, value), delete(key), clear() }`; `get` returns `undefined` when missing or older than `ttl` (and evicts); `set` records `now()`.
  - `formatManila(isoOrMs) -> "HH:MM"` (24h, `Asia/Manila`); `formatManilaFull(isoOrMs) -> "27 Nov 2026, 14:02"`; `describeWeatherCode(code) -> string`; `compass(deg) -> "NE"` etc.; `magnitudeBin(mag) -> "minor"|"light"|"moderate"|"strong"|"unknown"`; `quakeRadius(mag) -> 7 + mag*2` (unknown 7); `relativeTime(ms, now) -> "just now"|"3 min ago"|"2 h ago"`.

- [ ] **Step 1: Write failing tests for cache TTL**

Assert: set then get returns value; get after `ttl - 1` ms returns value; get at exactly `ttl` returns `undefined`; `delete` removes; a custom injected `now` makes expiry deterministic.

- [ ] **Step 2: Run tests, expect failure**

Run: `npm test` — Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/utils/cache.js`**

`Map` of `{ value, storedAt }`; monotonic injected clock; expiry check `now() - storedAt >= ttl` (>= so the exactly-5-minutes case is stale, matching “older than 5 minutes” in the design).

- [ ] **Step 4: Write failing tests for formatting**

Pin examples with fixed timestamps (e.g. `2026-11-27T08:00:00Z` → `16:00` Manila), `compass(0) = "N"`, `compass(113) = "ESE"`, `magnitudeBin(4.5) = "light"`, `magnitudeBin(null) = "unknown"`, `quakeRadius(5) = 17`, `describeWeatherCode(3) = "Overcast"`, `describeWeatherCode(95) = "Thunderstorm"`.

- [ ] **Step 5: Implement `src/ui/format.js`**

`Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit", hour12: false })`; a small `WEATHER_CODES` map for WMO codes; compass from 8 sectors; bins at the design's thresholds.

- [ ] **Step 6: Run all tests, commit**

Run: `npm test` — Expected: PASS.

### Task 3: Earthquake fetch, cache, and layer

**Files:**
- Create: `src/layers/earthquakes.js`
- Modify: `src/main.js`, `src/styles.css`
- Test: `test/earthquakes.test.js` (URL builder and feature→model mapping, pure exports)

**Interfaces:**
- Consumes: `createCache` from Task 2; `magnitudeBin`, `quakeRadius` from Task 2.
- Produces:
  - `buildQuakeUrl(now = Date.now()) -> string` (spec params, `starttime` = now − 7 days, `orderby=time`).
  - `toQuake(feature) -> { id, lat, lon, mag, place, time, depthKm, url } | null` (null for non-earthquake types; `depthKm` from `geometry.coordinates[2]`).
  - `loadEarthquakes({ force = false }) -> Promise<{ quakes, fetchedAt, fromCache }>`; throws on network/HTTP failure.
  - `mountEarthquakes(map) -> { setVisible(bool), setFilter(minMag), setQuakes(quakes), focusQuake(id), getQuakes() }`.
  - `getQuakeState() -> { status: "idle"|"loading"|"ready"|"error"|"empty", quakes, fetchedAt, lastError }`.

- [ ] **Step 1: Write failing tests**

`buildQuakeUrl` includes `format=geojson`, the four bbox params, `starttime` equal to 7 days before the injected now as `YYYY-MM-DD`. `toQuake` maps a sample USGS feature (including a null-mag one and a `type: "quarry blast"` one): quake fields exact, non-earthquake null, null mag preserved.

- [ ] **Step 2: Implement URL builder and mapper**

Filter `features` by `type === "earthquake"`; keep null magnitudes (draw gray).

- [ ] **Step 3: Implement `loadEarthquakes` with cache**

One shared cache; key = URL; `force` bypasses `get` but still `set`s; on failure throw with the HTTP status in the message; `fetchedAt` is the local completion time.

- [ ] **Step 4: Implement `mountEarthquakes`**

`L.layerGroup()` of `L.circleMarker` with radius/color from Task 2, `weight: 1.5`, dark stroke, `fillOpacity: .85`, and `bubblingMouseEvents: false` so a circle click never reaches the map and triggers a weather fetch. Quake popup DOM: place (bold), `M 5.1`, depth km, local time, and an outbound USGS link. `focusQuake(id)` opens and focuses that popup. `setFilter` redraws from the retained list.

- [ ] **Step 5: Wire initial load in `src/main.js`**

On start, call `loadEarthquakes()`, mount, and show a loading badge in `#live-status`; on success render circles and set “Live · updated HH:MM”; on error set “Offline” and keep the map usable.

- [ ] **Step 6: Verify against live USGS, commit**

`npm run dev`: circles appear (expect a handful in 7 days), popup shows place/magnitude/depth/time, console clean, `npm test` passes.

### Task 4: Weather on click

**Files:**
- Create: `src/layers/weather.js`
- Modify: `src/main.js`, `src/styles.css`
- Test: `test/weather.test.js` (URL builder only)

**Interfaces:**
- Consumes: `createCache`, `describeWeatherCode`, `compass`, `formatManila` from Task 2.
- Produces:
  - `buildWeatherUrl(lat, lon) -> string` (`current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m`, `timezone=Asia/Manila`).
  - `loadWeather(lat, lon) -> Promise<{ tempC, feelsC, rainMm, windKmh, windDirDeg, code, fetchedAt }>`; throws on failure; 5-min cache.
  - `mountWeather(map) -> { setEnabled(bool), getPin() }`; clicking shows pin + popup with loading state, then values or “Couldn’t load weather. Try again.” + Retry.

- [ ] **Step 1: Write failing test** for `buildWeatherUrl` with `14.5995, 120.9842` containing both coordinates and every `current=` field.

- [ ] **Step 2: Run to fail, then implement URL builder and `loadWeather`**

Round coordinates to 4 dp in the URL so nearby clicks share cache entries; `rainMm` from `precipitation`; `windKmh` from `wind_speed_10m`.

- [ ] **Step 3: Implement `mountWeather`**

Reuse one `L.marker` (small dot icon via `L.divIcon`) and one `L.popup`; build the popup DOM with `textContent` only (no innerHTML with API data). Loading state shows a spinner. Retry re-runs the same coordinates. Guard so a popup opens only for the latest click (incrementing request id).

- [ ] **Step 4: Wire click routing in `src/main.js`**

`map.on("click", ...)` fetches weather only when the weather toggle is on and the event did not originate from a circle marker (`event.originalEvent` target check / marker popup state); the Task 3 `bubblingMouseEvents: false` is the primary guard, and the click handler checks `event.sourceTarget === map` as belt-and-braces. Quake layer clicks must not trigger weather.

- [ ] **Step 5: Verify in browser, commit**

Click land and sea points; check temperature, wind, rain, Manila time appear. Disable the weather toggle and confirm clicks do nothing. Test offline via devtools; pin stays and the popup shows Retry.

### Task 5: Panel, controls, legend, list, status, mobile sheet

**Files:**
- Create: `src/ui/panel.js`
- Modify: `index.html`, `src/main.js`, `src/styles.css`
- Test: `test/panel.test.js` (pure filter/empty copy helpers)

**Interfaces:**
- Consumes: everything from Tasks 3–4.
- Produces:
  - `filterQuakes(quakes, minMag) -> quake[]`.
  - `emptyMessage({ status, filter, hasQuakes }) -> string | null` (exact copy below).
  - `mountPanel({ onRefresh, onToggleQuakes, onToggleWeather, onFilter, onSelectQuake, getQuakes, getStatus }) -> { setStatus(state), setQuakes(quakes), setFilter(min), open(), close() }`.

- [ ] **Step 1: Write failing tests**

`filterQuakes` drops below-threshold and keeps null-mag only under “All”. `emptyMessage`: `{status:"empty"}` → “No earthquakes in the last 7 days.”; filter hides everything → “No earthquakes match this filter.”; error → “Couldn’t load earthquakes.”; ready → null.

- [ ] **Step 2: Write the panel markup and styles**

Brand block, `#controls-button` (mobile only), `<aside id="panel">` with: `fieldset` “Layers” (`#toggle-quakes`, `#toggle-weather` checkboxes with labels), `label`+`select#filter-mag` (All / M4.5+ / M5.5+ / M6.5+), legend (four swatch rows + “Size = magnitude”), Refresh button, `#status` (`role="status" aria-live="polite"`), “Recent earthquakes” `<ul id="quake-list">`. Sheet on <760px: panel fixed bottom, translated closed by default, backdrop, close button, Escape handler, `aria-expanded` on the button.

- [ ] **Step 3: Implement panel logic**

Render quake list as buttons (`M 5.1 · 95 km SSE of Sarangani · 14:02`), activating calls `onSelectQuake(id)` and pans/opens popup; cap at 8 entries with a count. Status copy: loading spinner + “Loading earthquakes…”, error + Retry button, empty message, “Live · updated HH:MM”, stale “Stale · updated HH:MM”. Mirror status into brand `#live-status`.

- [ ] **Step 4: Wire main.js**

Toggle quakes → `earthquakes.setVisible`; weather toggle → `weather.setEnabled`; filter → `setFilter` + panel render; refresh → `loadEarthquakes({ force: true })`; success/failure updates status and keeps old circles.

- [ ] **Step 5: Verify mobile and desktop in browser, commit**

Resize to 390×844: Controls opens sheet, backdrop and Escape close it, toggles/filter/refresh work, quake list opens popup and closes sheet. Desktop 1440×900: panel sits in the corner, no overlap with zoom/scale. Console clean.

### Task 6: Freshness lifecycle and stale handling

**Files:**
- Modify: `src/layers/earthquakes.js`, `src/main.js`, `src/ui/panel.js`
- Test: `test/freshness.test.js` (pure `isStale(fetchedAt, now, ttl = 300_000)`)

**Interfaces:**
- Consumes: Tasks 3–5.
- Produces: `isStale(fetchedAt, now = Date.now(), ttl = 300_000) -> boolean`; `mountFreshness({ refresh, getFetchedAt, now }) -> { start(), stop() }` running a 60s check only while `document.visibilityState === "visible"`, plus immediate check on `visibilitychange` and `window.focus`.

- [ ] **Step 1: Failing tests** for `isStale`: false at `ttl - 1`, true at `ttl`, true for null fetchedAt.

- [ ] **Step 2: Implement and wire**

Timer started on load; each tick and on visibilitychange → if `isStale` and no fetch in flight, refresh silently. Brand shows “Stale” when data is old but a refresh is failing; “Offline” when the last request failed with no cached data.

- [ ] **Step 3: Verify**

Throttle network to offline after a successful load for >5 min (or temporarily shrink TTL in devtools) and confirm the stale → offline path, Retry, and recovery. `npm test` passes; commit.

### Task 7: README, screenshot, and public deploy

**Files:**
- Create: `README.md`, `docs/screenshot.png` (or `.webp`)
- Modify: `.github/workflows/deploy.yml` if Pages settings need a first manual toggle

**Interfaces:**
- Consumes: the finished app.
- Produces: public URL, README with run steps, credits, and learnings.

- [x] **Step 1: Capture screenshot and demo GIF**

Desktop 1440×900 with visible quake circles and one open popup; save `docs/screenshot.png`. Capture 2–3 frames (map + quake popup, weather popup, mobile sheet) and stitch `docs/demo.gif` with ffmpeg (8 fps, 1200px wide). If recording is unavailable, ship the screenshot and say so in the README.

- [x] **Step 2: Write `README.md`**

What it is (3 sentences), screenshot, features list, run (`npm install`, `npm run dev`), build/deploy, data sources and required attribution, USGS-instead-of-PHIVOLCS note, architecture (five lines mapping files to responsibilities), accessibility notes incl. weather-is-click-only limitation, “what I learned” 3–5 sentences.

- [x] **Step 3: Create the GitHub repo and push**

`gh repo create ph-live-map --public --source . --push`, confirm the repo description and topics (`leaflet`, `earthquakes`, `weather`, `philippines`, `usgs`, `open-meteo`, `vite`, `vanilla-js`).

- [x] **Step 4: Enable Pages via Actions and verify the deployed URL**

`gh api` to set `build_type: workflow`, watch the run, open the `https://arcogm.github.io/ph-live-map/` URL, verify map, quakes, weather popup, mobile layout, and no console errors. Confirm no keys in `git log -p` / `dist`.

- [x] **Step 5: Commit and tag**

Commit README and screenshot; confirm the project spec's definition-of-done checklist item by item: phases 1–4 work in the deployed version, real phone and desktop, no API keys in code or git history, loading/error/empty states tested via network-off, README has demo media, run steps, credits, and learnings.
