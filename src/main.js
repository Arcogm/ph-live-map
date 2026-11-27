import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { loadEarthquakes, mountEarthquakes } from "./layers/earthquakes.js";
import { mountWeather } from "./layers/weather.js";
import { mountFreshness } from "./ui/freshness.js";
import { mountPanel } from "./ui/panel.js";

const PH_CENTER = [12.6, 122.2];
const PH_ZOOM = 5;

const ESRI_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com/">Esri</a> — Esri, HERE, Garmin, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const map = L.map("map", {
  center: PH_CENTER,
  zoom: PH_ZOOM,
  minZoom: 4,
  maxZoom: 13,
  zoomControl: false,
  worldCopyJump: true,
  attributionControl: true,
});

// CARTO began watermarking keyless basemap tiles with "API KEY REQUIRED"
// (verified 2026-11-27), so the dark basemap is Esri's keyless Dark Gray
// Canvas plus its label reference layer.
L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  {
    attribution: ESRI_ATTRIBUTION,
    maxZoom: 16,
    maxNativeZoom: 16,
  },
).addTo(map);

L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
  {
    maxZoom: 16,
    maxNativeZoom: 16,
    pane: "overlayPane",
  },
).addTo(map);

L.control.zoom({ position: "topright" }).addTo(map);
L.control.scale({ position: "bottomleft", imperial: false }).addTo(map);

/* ---------- layers ---------- */

const earthquakes = mountEarthquakes(map);
const weather = mountWeather(map);

// Weather only on a deliberate map click: never on hover, never when the
// click belonged to a quake circle (circle markers stop bubbling, and this
// second check catches anything that slips through).
map.on("click", (event) => {
  if (!weather.isEnabled()) return;
  if (event.sourceTarget !== map) return;
  weather.show(event.latlng.lat, event.latlng.lng);
});

/* ---------- state ---------- */

const state = {
  status: "idle",
  quakes: [],
  fetchedAt: null,
  lastError: null,
  inFlight: false,
};

export function getQuakeState() {
  return {
    status: state.status,
    quakes: state.quakes,
    fetchedAt: state.fetchedAt,
    lastError: state.lastError,
  };
}

/* ---------- panel ---------- */

const panel = mountPanel({
  onRefresh: () => refresh({ force: true }),
  onToggleQuakes: (visible) => earthquakes.setVisible(visible),
  onToggleWeather: (enabled) => weather.setEnabled(enabled),
  onFilter: (minMag) => earthquakes.setFilter(minMag),
  onSelectQuake: (id, { closeSheet } = {}) => {
    if (closeSheet) panel.close({ restoreFocus: false });
    earthquakes.focusQuake(id);
  },
  getQuakes: () => state.quakes,
  getStatus: () => getQuakeState(),
});

/* ---------- loading ---------- */

function pushStatus() {
  panel.setStatus({ status: state.status, fetchedAt: state.fetchedAt, lastError: state.lastError });
}

function showMapMessage(message, onRetry) {
  let card = document.getElementById("map-error");
  if (!card) {
    card = document.createElement("div");
    card.id = "map-error";
    card.className = "map-message";
    card.setAttribute("role", "alert");
    document.body.append(card);
  }
  card.replaceChildren();

  const text = document.createElement("p");
  text.textContent = message;
  const retry = document.createElement("button");
  retry.type = "button";
  retry.className = "button button-small";
  retry.textContent = "Try again";
  retry.addEventListener("click", () => {
    card.remove();
    onRetry?.();
  });

  card.append(text, retry);
}

const clearMapMessage = () => document.getElementById("map-error")?.remove();

async function refresh({ force = false } = {}) {
  if (state.inFlight) return;
  state.inFlight = true;
  state.status = "loading";
  pushStatus();

  try {
    const { quakes, fetchedAt } = await loadEarthquakes({ force });
    state.quakes = quakes;
    state.fetchedAt = fetchedAt;
    state.lastError = null;
    state.status = quakes.length ? "ready" : "empty";

    earthquakes.setQuakes(quakes);
    panel.setQuakes(quakes);
    clearMapMessage();
  } catch (error) {
    state.lastError = error;
    state.status = "error";
    if (!state.fetchedAt) {
      showMapMessage("Could not load earthquakes. Check your connection and try again.", () =>
        refresh({ force: true }),
      );
    }
  } finally {
    state.inFlight = false;
    pushStatus();
  }
}

refresh();

/* ---------- freshness ---------- */

// While the tab is visible, pick up new quakes once data passes five
// minutes. A hidden tab costs nothing; coming back checks immediately.
const freshness = mountFreshness({
  getFetchedAt: () => state.fetchedAt,
  canRefresh: () => !state.inFlight,
  refresh: () => refresh(),
});
freshness.start();
