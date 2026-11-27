# PH Live Map: Project Spec

Nov 21, 2026 · @Arcogm

## Overview

PH Live Map is a small web dashboard that shows live earthquakes and weather on an interactive map of the Philippines. It is a scaled-down, achievable take on God's Eye View, built to show employers that Justin can work with real APIs, async data, and a clean front end.

- **Type:** static front-end web app, no backend or login
- **Build time:** 1-2 weeks, shipped in phases
- **Audience:** employers and visitors to the portfolio site; the live demo is linked from it
- **Cost:** free, using free-tier APIs and free hosting

## Goals and non-goals

The project succeeds if a visitor understands it in 10 seconds and a recruiter can see clean, working code behind it.

**Goals**

- Show live earthquake data around the Philippines on a map
- Show current weather for any point the visitor clicks
- Handle loading, empty, and error states properly
- Work on phone and desktop
- Be deployed publicly with a clear README

**Non-goals**

- No 3D globe, no user accounts, no database
- No paid APIs or API keys that could leak
- No attempt to match God's Eye View feature for feature

## Features by phase

Each phase ends with something working and deployable, so the project is never stuck half-built.

| Phase | Feature | Done when |
| --- | --- | --- |
| 1. Map base | Dark Leaflet map centered on the Philippines, zoom and pan, scale bar | Map loads on desktop and phone with no console errors |
| 2. Earthquakes | Circles per quake, sized and colored by magnitude, popup with place, time, depth | Real USGS data shows for the last 7 days within the Philippine area |
| 3. Weather | Click the map to see temperature, wind, and rain for that point | Click shows correct current weather and a loading state |
| 4. Polish | Layer toggles, magnitude filter, last-updated time, refresh button, error and empty states | App stays usable when an API is down or offline |
| 5. Stretch (optional) | Typhoon or live flights layer | Only attempted after phases 1-4 are deployed |

## Data sources

Both APIs are free and need no key, so nothing secret ever sits in the front-end code. Endpoint details below are from memory; confirm them against each provider's docs on day 1.

| Source | Used for | Endpoint (check docs) | Notes |
| --- | --- | --- | --- |
| USGS Earthquake Catalog | Earthquake layer | `earthquake.usgs.gov/fdsnws/event/1/query` with `format=geojson` | Filter with a bounding box around the Philippines (roughly lat 4 to 22, lon 116 to 128) and a start time 7 days back |
| Open-Meteo | Weather on click | `api.open-meteo.com/v1/forecast` with `latitude`, `longitude`, `current=` | Free for non-commercial use; ask only for the fields shown in the popup |
| Map tiles | Base map | A free dark tile provider, such as CARTO | Keep the attribution text visible, it is required |

The official local source for Philippine earthquakes is PHIVOLCS. It has no clean public API that I can confirm, so USGS is the data source here and the README should say so.

**Rules for using the data**

- Cache each response in memory for 5 minutes to avoid hammering the APIs
- Never fetch on every mouse move, only on click
- Show a clear error message if a request fails, never a blank map

## Tech stack and structure

Keep it small: plain JavaScript with Vite and Leaflet. React is optional and only worth it if Justin already knows it well.

| Part | Choice | Why |
| --- | --- | --- |
| Language | JavaScript (ES modules) | Simple, no build complexity |
| Build tool | Vite | Fast dev server, easy static build |
| Map | Leaflet | Light, well documented, beginner friendly |
| Data fetching | `fetch` with async/await | No extra library needed |
| Hosting | GitHub Pages, Netlify, or Vercel | Free and gives a public demo link |

**Suggested files**

- `index.html`, `src/main.js`: app entry and map setup
- `src/layers/earthquakes.js`: fetch, cache, and draw quakes
- `src/layers/weather.js`: fetch and show weather on click
- `src/ui/panel.js`: layer toggles, filter, refresh, status messages
- `src/utils/cache.js`: small in-memory cache with a time limit
- `README.md`: what it is, screenshot or GIF, how to run it, data credits

## UI and UX requirements

The look should be clean and readable first. A dark map with bright quake circles is enough to look polished.

- **Layout:** full-screen map with a small control panel in a corner; on phones the panel collapses to a button
- **Earthquake circles:** size and color scale with magnitude, with a small legend explaining them
- **Popups:** place name, magnitude, depth in km, and local time (Asia/Manila)
- **Loading state:** a visible spinner or message while data loads
- **Error state:** a short message such as "Could not load earthquakes. Try again" with a retry button
- **Empty state:** a message when the filter hides every quake
- **Accessibility basics:** readable text contrast, buttons reachable by keyboard, labels on toggles
- **Footer:** data credits for USGS, Open-Meteo, and the map tiles

## Timeline

Seven working days gets phases 1 to 4 done, with room to spare. If a day slips, push the stretch goal, never the deploy.

1. **Day 1:** set up the Vite project, Git repo, and a Leaflet map of the Philippines; deploy it the same day
2. **Day 2:** dark tiles, controls, and a clean layout that works on mobile
3. **Day 3:** fetch USGS data and log it to the console; check the bounding box returns Philippine quakes
4. **Day 4:** draw quake circles with magnitude size and color, popups, and a legend
5. **Day 5:** weather on click with Open-Meteo, plus its loading and error states
6. **Day 6:** layer toggles, magnitude filter, refresh button, 5-minute cache, last-updated time
7. **Day 7:** test on a phone, fix bugs, write the README, record a demo GIF, redeploy
8. **Week 2 (optional):** stretch layer, then add the project to the portfolio site with a write-up

## Risks

| Risk | Likelihood | What to do |
| --- | --- | --- |
| An API changes or goes down | Medium | Show a friendly error, keep the last cached data, note the data date in the UI |
| API rate limits or slow responses | Medium | Cache for 5 minutes, fetch only on click for weather, never on hover |
| Scope creep into flights or 3D | High | Stretch goals only start after phase 4 is deployed |
| Map looks broken on phones | Medium | Test on a real phone on day 2 and again on day 7 |
| Missing attribution for tiles or data | Low | Keep credits in the footer and in the README |

## Definition of done and portfolio packaging

The project is done when a stranger can open the link, understand it in 10 seconds, and find clean code behind it.

**Definition of done**

- [ ] Phases 1 to 4 work in the deployed version, not just locally
- [ ] Works on a real phone and a desktop browser
- [ ] No API keys in the code or the Git history
- [ ] Loading, error, and empty states all tested by turning off the network
- [ ] README includes a demo GIF, run instructions, data credits, and a list of what was learned

**Portfolio packaging**

- Put it on its own page of the portfolio site with a live demo link and a GitHub link
- Write a short "what I built, what was hard, what I learned" section of 3 to 5 sentences
- Pin the repository on GitHub and use a clear description and topic tags
- Mention it on the résumé under Projects with one line on the APIs and tools used
