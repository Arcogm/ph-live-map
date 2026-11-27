import L from "leaflet";

import { formatManila, magnitudeBin, quakeRadius } from "../ui/format.js";

export { buildQuakeUrl, loadEarthquakes, toQuake } from "./quake-data.js";

export const MAG_COLORS = {
  minor: "#38bdf8",
  light: "#fbbf24",
  moderate: "#fb923c",
  strong: "#ef4444",
  unknown: "#94a3b8",
};

function quakePopup(quake) {
  const color = MAG_COLORS[magnitudeBin(quake.mag)];
  const el = document.createElement("div");
  el.className = "popup";
  el.style.setProperty("--c", color);

  const title = document.createElement("h3");
  title.textContent = quake.place;

  const mag = document.createElement("p");
  mag.className = "popup-mag";
  mag.textContent = quake.mag == null ? "Magnitude unknown" : `M ${quake.mag.toFixed(1)}`;

  const details = document.createElement("dl");

  const addRow = (label, value) => {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    details.append(dt, dd);
  };

  addRow("Depth", quake.depthKm == null ? "Unknown" : `${quake.depthKm.toFixed(1)} km`);
  addRow("Local time", formatManila(quake.time));

  el.append(title, mag, details);

  if (quake.url) {
    const foot = document.createElement("p");
    foot.className = "popup-foot";
    const link = document.createElement("a");
    link.href = quake.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Event page on USGS";
    foot.append(link);
    el.append(foot);
  }

  return el;
}

/**
 * Draw quake circles on the map. The layer owns marker state; the caller
 * hands it a list whenever fresh data arrives.
 */
export function mountEarthquakes(map) {
  const layer = L.layerGroup().addTo(map);
  const markers = new Map();
  let quakes = [];
  let minMag = 0;
  let visible = true;

  function markerFor(quake) {
    const color = MAG_COLORS[magnitudeBin(quake.mag)];
    const marker = L.circleMarker([quake.lat, quake.lon], {
      radius: quakeRadius(quake.mag),
      color: "rgba(4, 10, 16, 0.85)",
      weight: 1.5,
      fillColor: color,
      fillOpacity: 0.85,
      bubblingMouseEvents: false,
      className: "quake-circle",
      ariaLabel: `Magnitude ${quake.mag ?? "unknown"} earthquake — ${quake.place}`,
    });
    marker.bindPopup(quakePopup(quake), { closeButton: true, maxWidth: 280 });
    return marker;
  }

  function draw() {
    layer.clearLayers();
    markers.clear();
    if (!visible) return;

    const shown = minMag === 0 ? quakes : quakes.filter((q) => q.mag != null && q.mag >= minMag);
    for (const quake of shown) {
      const marker = markerFor(quake);
      markers.set(quake.id, marker);
      layer.addLayer(marker);
    }
  }

  return {
    setQuakes(next) {
      quakes = next;
      draw();
    },

    setFilter(nextMinMag) {
      minMag = Number(nextMinMag) || 0;
      draw();
    },

    setVisible(nextVisible) {
      visible = nextVisible;
      if (visible) {
        if (!map.hasLayer(layer)) layer.addTo(map);
      } else if (map.hasLayer(layer)) {
        map.removeLayer(layer);
      }
      draw();
    },

    focusQuake(id) {
      const marker = markers.get(id);
      if (!marker) return false;
      map.panTo(marker.getLatLng(), { animate: true });
      marker.openPopup();
      return true;
    },

    getQuakes() {
      return quakes;
    },
  };
}
