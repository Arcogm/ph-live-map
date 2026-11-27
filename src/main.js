import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { loadEarthquakes, mountEarthquakes } from "./layers/earthquakes.js";
import { formatManila } from "./ui/format.js";

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

/* ---------- app state ---------- */

const state = {
  status: "idle",
  quakes: [],
  fetchedAt: null,
  lastError: null,
};

const earthquakes = mountEarthquakes(map);

/** Snapshot of the earthquake load state, for the panel and freshness timer. */
export function getQuakeState() {
  return {
    status: state.status,
    quakes: state.quakes,
    fetchedAt: state.fetchedAt,
    lastError: state.lastError,
  };
}

const liveStatus = document.getElementById("live-status");
const liveText = document.getElementById("live-text");
const statusEl = document.getElementById("status");
const refreshButton = document.getElementById("refresh");

function setLive(stateName, text) {
  liveStatus.dataset.state = stateName;
  liveText.textContent = text;
}

function renderStatus() {
  statusEl.classList.toggle("is-error", state.status === "error");
  statusEl.replaceChildren();

  if (state.status === "loading") {
    const wrap = document.createElement("p");
    wrap.className = "status-loading";
    const spin = document.createElement("span");
    spin.className = "spinner";
    spin.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = "Loading earthquakes…";
    wrap.append(spin, label);
    statusEl.append(wrap);
    setLive("loading", "Updating…");
    return;
  }

  if (state.status === "error") {
    const text = document.createElement("p");
    text.textContent = state.fetchedAt
      ? `Couldn't refresh. Showing data from ${formatManila(state.fetchedAt)}.`
      : "Could not load earthquakes. Check your connection and try again.";
    statusEl.append(text);
    setLive("offline", state.fetchedAt ? `Offline · data from ${formatManila(state.fetchedAt)}` : "Offline · no data yet");
    return;
  }

  if (state.status === "empty") {
    const text = document.createElement("p");
    text.textContent = "No earthquakes in the last 7 days.";
    statusEl.append(text);
    setLive("live", "Live · no recent quakes");
    return;
  }

  if (state.status === "ready") {
    const text = document.createElement("p");
    text.textContent = `${state.quakes.length} earthquake${state.quakes.length === 1 ? "" : "s"} in the last 7 days. Updated ${formatManila(state.fetchedAt)}.`;
    statusEl.append(text);
    setLive("live", `Live · updated ${formatManila(state.fetchedAt)}`);
  }
}

async function refresh({ force = false } = {}) {
  refreshButton.disabled = true;
  state.status = "loading";
  renderStatus();

  try {
    const { quakes, fetchedAt } = await loadEarthquakes({ force });
    state.quakes = quakes;
    state.fetchedAt = fetchedAt;
    state.lastError = null;
    state.status = quakes.length ? "ready" : "empty";
    earthquakes.setQuakes(quakes);
    clearMapMessage();
  } catch (error) {
    state.lastError = error;
    state.status = "error";
    if (!state.fetchedAt) {
      // Nothing on the map yet: make the failure visible without a reload.
      showMapMessage(
        "Could not load earthquakes. Check your connection and try again.",
        () => refresh({ force: true }),
      );
    }
  } finally {
    refreshButton.disabled = false;
    renderStatus();
  }
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

refreshButton.addEventListener("click", () => refresh({ force: true }));

refresh();
