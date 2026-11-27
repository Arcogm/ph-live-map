# PH Live Map — Future Features

**Analyzed:** 28 Nov 2026 · deployed site (`arcogm.github.io/ph-live-map`) + source at `ac8b3ea`
**Method:** read every source file, exercised the deployed app in a browser (desktop 1296×932 and phone 396×643), ran Lighthouse, and probed each candidate data source from inside the page so CORS is proven rather than assumed.

Effort is sized for one developer working in this repo's existing stack (vanilla ES modules, Vite, Leaflet, `node:test`), not for a rewrite.

| Bucket | Meaning | Rough size |
| --- | --- | --- |
| **Low** | One focused commit, no new dependency, no new data source. Ships today. | ≤ 4 h |
| **Medium** | One new module or one new data source, testable pure logic, a day of polish. | 1–3 days |
| **High** | Breaks a project constraint (needs a proxy/backend) or touches the map engine. | 1 week+ |

## Where the app stands

The phases 1–4 scope is genuinely done: 34 passing tests, Lighthouse 100 accessibility / 100 best practices, 60 KB over the wire, ~1.7 s load, zero console errors, honest Live/Stale/Offline states, keyboard-reachable quake list, `prefers-reduced-motion` respected. Anything below should extend that, not break it.

Measured gaps worth naming, because several features below are really "finish the promise already in the code":

- ~~`--faint` (#6b7a8b) is **4.14:1** on the panel surface and **3.82:1** on `--surface-2`~~ — fixed: `--faint` is now `#808f9f` (5.49:1 / 5.08:1), guarded by `test/contrast.test.js`.
- ~~Lighthouse's only failure is **touch target size**; credits and panel links render 14–16 px tall.~~ — fixed: credits and panel-foot links are 24 px hit boxes; accessibility scores 1.00.
- The panel status says "**5** earthquakes in the last 7 days" while a 6.5+ filter shows zero, and the design doc's promised **reset action** for the empty filter state does not exist.
- ~~`relativeTime()` is written, tested, and **imported but unused**; the list shows only `00:18` with no date.~~ — fixed: rows read "3 h ago" and show the full Manila date on hover (and in the row's spoken label). `getPin()`, and the panel's `getQuakes`/`getStatus` props are still dead.
- `MAG_COLORS` is defined twice (`ui/panel.js`, `layers/earthquakes.js`).
- USGS returns `alert`, `tsunami`, `sig`, `felt`, `cdi`, `mmi`; `toQuake()` drops all of them.
- No `AbortController` or timeout anywhere: a hung request leaves "Updating…" forever and `inFlight` true, blocking every retry.
- `isPhone` and popup padding are computed **once** at load, so rotating a phone keeps desktop padding.
- Leaflet 1.9.4 **ignores the `ariaLabel` option** (`grep ariaLabel leaflet-src.js` → 0 hits). The quake circles are pointer-only; the panel list is the real keyboard path.
- No OG/Twitter card, no manifest, no LICENSE, no lint/format/PR CI.

---

## Low effort

| # | Feature | Why it matters | Touch |
| --- | --- | --- | --- |
| ~~L1~~ | ~~**Contrast fix** — raise `--faint` to pass 4.5:1~~ **done** | Accessibility is a stated goal and a recruiter-visible claim; was 3.82:1 | `src/styles.css` (one token), `test/contrast.test.js` |
| ~~L2~~ | ~~**Touch targets ≥ 24 px** — pad credits + panel-foot links~~ **done** | Was the single Lighthouse a11y failure; accessibility now scores 1.00 | `src/styles.css` |
| L3 | **Filter reset + honest count** — "Show all" button, status respects the filter | Design doc promised it; today a 6.5+ filter says "5 earthquakes" and offers no way back | `ui/panel.js`, `ui/panel-state.js`, `index.html` |
| ~~L4~~ | ~~**Relative times in the recent list** — "3 h ago", full date on hover~~ **done** | Rows now carry a relative time, hover/popup title, and a spoken label | `ui/panel.js`, `ui/panel-state.js`, tests |
| L5 | **Alert badges** — surface USGS `alert` (green/yellow/orange/red) and `tsunami` flag in popup + list row | The API already returns it, the model throws it away; this is the cheapest "serious dashboard" signal on the page | `layers/quake-data.js`, `layers/earthquakes.js`, `ui/panel.js` |
| L6 | **Time window selector** — 24 h / 7 d / 30 d | USGS already supports it; today's window is 7 d and returns **4** events. 30 d returns **26** and 24 h returns **0**, so the default currently looks emptier than the app deserves | `layers/quake-data.js`, `index.html`, `ui/panel.js`, tests |
| L7 | **Dead code and duplication pass** | `MAG_COLORS` ×2, unused imports/props, unused `formatManilaFull`/`getPin` — a reviewer reads exactly this | `ui/panel.js`, `layers/earthquakes.js`, `layers/weather.js` |
| L8 | **Link previews** — `og:image`, `twitter:card`, 1200×630 render, `manifest.webmanifest`, `apple-touch-icon` | The app is linked from a portfolio; right now it shares as a bare URL | `index.html`, `docs/`, `tools/` |
| L9 | **Fetch timeout** — `AbortController` + 10 s, then a normal error state | A hung socket currently wedges the app in "Updating…" with no retry path | `layers/quake-data.js`, `layers/weather-data.js`, tests |
| L10 | **Preconnect** to the Esri tile host | 40+ tile requests start cold; one `<link rel="preconnect">` is free | `index.html` |
| L11 | **Remember toggles and filter** in `localStorage` | Returning visitors re-pick their magnitude filter every time | `ui/panel.js`, `utils/storage.js` |
| L12 | **MIT LICENSE + repo topics** | A public portfolio repo with no license is a small credibility miss | repo root |
| L13 | **Zoom range** — allow 16 instead of capping at 13 | Tiles serve 16; the current cap stops at city scale | `src/main.js` (one line) |
| L14 | **Recompute phone padding on resize** | Rotation currently keeps the other layout's popup padding | `src/main.js` |
| L15 | **Privacy-friendly freshness copy** — "next check in 2 min" | Reinforces the freshness story the README already sells | `ui/panel.js` |

## Medium effort

| # | Feature | Why it matters | Touch |
| --- | --- | --- | --- |
| M1 | **7-day forecast + 12 h rain strip in the weather popup** | Same endpoint, `daily=`/`hourly=` fields verified working. Turns "current weather" into weather people actually use | `layers/weather-data.js`, `layers/weather.js`, tests |
| M2 | **Place search** (Open-Meteo geocoding, `countryCode=PH`) → fly + open weather | Fixes the documented "weather is click-only" limitation for keyboard users, and is the missing "where am I looking" affordance | new `ui/search.js`, `src/main.js` |
| M3 | **Rain radar overlay + 50-minute scrubber** (RainViewer) | Verified CORS-open: 13 past frames, PNG tiles 200, infrared satellite available. The single biggest "this is live" upgrade, no key | new `layers/radar.js`, `index.html`, `ui/panel.js` |
| M4 | **Basemap switcher** — Dark / Satellite / Topo / Light | All four Esri endpoints verified 200 keyless; also gives the light-mode the theme token set is already shaped for | `src/main.js`, `index.html`, `styles.css` |
| M5 | **Air quality** (PM2.5, US AQI) in the click popup | Open-Meteo air-quality verified CORS-open, no key, same provider already credited | `layers/weather-data.js`, `layers/weather.js` |
| M6 | **Deep links + share** — filter, window, layers, and pin in the URL; copy-link button | Web Interface Guidelines call this out; also makes a demo link in a portfolio shareable as "the 6.5+ view" | `src/main.js`, `ui/panel.js` |
| M7 | **Quake detail sheet** — ShakeMap intensity thumbnail, MMI, felt reports, PAGER alert, tectonic summary | `?eventid=` detail verified (200, 46 KB, products `shakemap`/`dyfi`/`losspager` present). Zero new providers, high "wow" | new `layers/quake-detail.js`, `layers/earthquakes.js` |
| M8 | **Offline shell** — service worker + persisted last-good payload | The app already keeps data on failure; a phone on EDGE should open instantly instead of showing the error card | new `src/sw.js`, `src/main.js` |
| M9 | **Quality gates in CI** — ESLint + Prettier + Playwright smoke (loads, 0 console errors, filter, forced-offline retry) | Deploy already runs tests; nothing runs on PRs, and the browser checks that caught the CARTO watermark are manual today | `.github/workflows/`, `test/`, configs |
| M10 | **Significance view** — sort/list by USGS `sig`, "biggest this month" | `orderby=magnitude` and `sig`/`felt` are available; gives the list a reason to exist beyond a log | `layers/quake-data.js`, `ui/panel.js` |
| M11 | **Focusable quake circles** — real keyboard Tab order over markers | `ariaLabel` is a Leaflet 2.x option and silently no-ops on 1.9.4; until fixed, the map claims more a11y than it delivers | `layers/earthquakes.js`, `styles.css` |
| M12 | **30-day time machine** — range slider replays quake history | One 30-day query is ~26 events today (trivial payload); a genuinely memorable portfolio interaction | `layers/quake-data.js`, `ui/panel.js`, new `ui/timeline.js` |
| M13 | **Other Philippine hazards** (EONET) — Mayon and Kanlaon volcano pins | Verified CORS-ok from the page and returns 2 open PH volcano events right now. Note: occasionally slow (one probe timed out), so needs a longer timeout | new `layers/hazards.js` |
| M14 | **Marine forecast** at coastal clicks (wave height + direction) | Open-Meteo marine API verified keyless; the Philippines is a coastal country | `layers/weather-data.js` |
| M15 | **Filipino/English copy** via `Intl` + `Accept-Language` | An archipelago audience and a differentiator no portfolio map has | `src/i18n/`, `index.html`, `ui/*` |

## High effort

| # | Feature | Why it matters | Why it is expensive |
| --- | --- | --- | --- |
| H1 | **Typhoon layer** (JMA tracks → PAR crossings, forecast cones) | The "stretch" item from the spec; cyclones are the hazard Filipinos actually track | PAGASA (`pubfiles.pagasa.dost.gov.ph`), GDACS, and tsunami.gov all **fail CORS** from the browser (verified). Only JMA's `targetTc.json` is CORS-open and it returned `[]`, so it needs its own schema walk plus a seasonal fallback. Real path: a serverless proxy — which ends the "no backend" constraint |
| H2 | **Official PHIVOLCS feed** | The README has to explain why USGS stands in for the local authority; closing that gap is the strongest credibility win available | `earthquake.phivolcs.dost.gov.ph` serves a 3 MB HTML page, no JSON API, no CORS header (verified). Needs a scheduled GitHub Action scraper committing static JSON, plus a schema and a staleness contract |
| H3 | **Live flights** (OpenSky) | The spec's alternate stretch layer | `opensky-network.org` state vectors **fail CORS** (verified) and need OAuth2 client credentials — a proxy plus secrets, directly against the "no keys that could leak" rule |
| H4 | **Push alerts** — "M5.5+ within 100 km of me" | The natural next step after a dashboard: become a service | Needs a backend, VAPID keys, subscriptions, and a polling worker. Also a real product, not a portfolio feature |
| H5 | **MapLibre GL + vector basemap migration** | Smoother zoom, real light/dark restyle, 3D pitch | Rebuilds the layer stack (markers, popups, hit-testing), replaces raster attribution obligations, and risks the one thing the app does well today: loading in 1.7 s with no console errors |
| H6 | **3D globe** | Explicit non-goal in the spec | Listed only so it stays rejected. It buys nothing a recruiter can use and puts the "understood in 10 seconds" goal at risk |

---

## Verified data-source evidence

Probed from inside the deployed page (so CORS is real, not inferred) and from the shell for headers.

| Source | Use | Result |
| --- | --- | --- |
| USGS FDSN `query` | quakes | ✅ 200, `Access-Control-Allow-Origin: *`; 7 d = 4, 30 d = 26, 24 h = 0 events |
| USGS `?eventid=` detail | M7 | ✅ 200, 46 KB, `shakemap`/`dyfi`/`losspager` products present |
| USGS detail feed `.../detail/<id>.geojson` | M7 alternative | ❌ 404 for PH event ids — use `?eventid=` |
| Open-Meteo forecast `current` | weather | ✅ used today |
| Open-Meteo `daily` + `hourly` | M1 | ✅ 7 days, rain probability array |
| Open-Meteo geocoding | M2 | ✅ `countryCode=PH` returns Quezon City, Manila |
| Open-Meteo air quality | M5 | ✅ PM2.5 + US AQI |
| Open-Meteo marine | M14 | ✅ wave height/direction |
| RainViewer `weather-maps.json` + tiles | M3 | ✅ 13 past frames, tile 200 `image/png` |
| Esri Dark Gray / Light Gray / Imagery / Topo tiles | M4 | ✅ all 200, keyless |
| NASA EONET (bbox PH) | M13 | ✅ 2 open volcano events; one probe timed out — needs a longer timeout |
| JMA `targetTc.json` | H1 | ✅ CORS-open but `[]` (off-season) |
| PAGASA, PHIVOLCS, GDACS, tsunami.gov | H1/H2 | ❌ CORS-blocked (GDACS also 400s with the documented params) |
| OpenSky states | H3 | ❌ CORS-blocked + OAuth required |
| NWS `alerts/active?area=PH` | — | ⚠️ 200 but returns Hawaiʻi marine alerts, not Philippine ones. **Not a PH source — do not use** |

## Suggested order

1. ~~**L1, L2**~~ (done) **L3, L6** — credibility and the "empty map" impression, one afternoon.
2. **L5, L9** — the app starts telling you *which* quakes mattered, and can no longer wedge. (L4 is done.)
3. **M7** — the detail sheet turns one quake into a story; no new provider, biggest single payoff.
4. **M3** — radar makes it feel live to someone watching over your shoulder.
5. **M2 + M1** — weather becomes usable, and keyboard users get parity.
6. **L8, M9** — packaging and gates, so the next round of features does not regress the numbers above.

## Done since the audit

| # | Feature | Commit | Proof |
| --- | --- | --- | --- |
| L1 | Contrast: `--faint` → `#808f9f` (5.49:1 panel, 5.08:1 surface-2) | `5d30d21` | `test/contrast.test.js` fails on the old token |
| L2 | Credits + panel-foot links are 24 px hit boxes | `5d30d21` | Lighthouse accessibility 1.00, no `target-size` finding |
| L4 | Recent list reads "3 h ago", full Manila date on hover, spoken row label | `5d30d21` | `test/panel.test.js` (34 tests green), live browser check |

## Keep, do not regress

Five-minute TTL cache · "Live / Updating / Stale / Offline" honesty · keeping the last good payload on a failed refresh · `prefers-reduced-motion` guards · native `<button>`/`<select>`/`<label>` chrome · 34-test pure-logic suite · no keys in repo or history · one `npm run build` to `dist/` · attribution in the footer and README.

Any feature that adds a key, a backend, or a third-party script should be measured against those.
