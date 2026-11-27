import L from "leaflet";

import { compass, describeWeatherCode, formatManila } from "../ui/format.js";
import { loadWeather } from "./weather-data.js";

export { buildWeatherUrl, loadWeather, roundCoord } from "./weather-data.js";

const PIN_ICON = L.divIcon({
  className: "weather-pin",
  html: '<span class="weather-pin-dot"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function weatherPopupContent(result, lat, lon) {
  const el = document.createElement("div");
  el.className = "popup weather-popup";

  const title = document.createElement("h3");
  title.textContent = `${result.tempC.toFixed(1)} °C`;
  const condition = document.createElement("p");
  condition.className = "popup-condition";
  condition.textContent = describeWeatherCode(result.code);

  const details = document.createElement("dl");
  const addRow = (label, value) => {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    details.append(dt, dd);
  };

  addRow("Feels like", `${Number(result.feelsC).toFixed(1)} °C`);
  addRow("Rain", `${Number(result.rainMm).toFixed(1)} mm`);
  addRow("Wind", `${Math.round(result.windKmh)} km/h ${compass(result.windDirDeg)}`);
  addRow("At", `${lat.toFixed(2)}, ${lon.toFixed(2)}`);
  addRow("Manila time", formatManila(result.time));

  const foot = document.createElement("p");
  foot.className = "popup-foot";
  foot.textContent = result.fromCache ? "Cached result · Open-Meteo" : "Open-Meteo";

  el.append(title, condition, details, foot);
  return el;
}

function popupShell(children) {
  const wrap = document.createElement("div");
  wrap.className = "popup";
  wrap.append(...children);
  return wrap;
}

/**
 * One reusable pin and popup. The map click handler decides when to call
 * `show`; this module owns the loading/error/success states.
 */
export function mountWeather(map, popupOptions = {}) {
  const marker = L.marker([0, 0], { icon: PIN_ICON, keyboard: false, bubble: false });
  const popup = L.popup({ closeButton: true, offset: [0, -2], maxWidth: 280, ...popupOptions });
  let enabled = true;
  let requestId = 0;

  function openAt(lat, lon) {
    marker.setLatLng([lat, lon]);
    if (!map.hasLayer(marker)) marker.addTo(map);
    popup.setLatLng([lat, lon]).setContent(popupShell([]));
    marker.bindPopup(popup);
    marker.openPopup();
  }

  function setContent(el) {
    popup.setContent(el);
    popup.update();
  }

  async function show(lat, lon) {
    const id = ++requestId;
    openAt(lat, lon);

    const loading = popupShell([]);
    const row = document.createElement("p");
    row.className = "status-loading";
    const spin = document.createElement("span");
    spin.className = "spinner";
    spin.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = "Loading weather…";
    row.append(spin, label);
    loading.append(row);
    setContent(loading);

    try {
      const result = await loadWeather(lat, lon);
      if (id !== requestId) return;
      setContent(weatherPopupContent(result, lat, lon));
    } catch {
      if (id !== requestId) return;
      const failed = popupShell([]);
      const msg = document.createElement("p");
      msg.className = "popup-error";
      msg.textContent = "Couldn't load weather.";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "button button-small popup-retry";
      retry.textContent = "Try again";
      retry.addEventListener("click", () => show(lat, lon));
      failed.append(msg, retry);
      setContent(failed);
    }
  }

  return {
    setEnabled(nextEnabled) {
      enabled = nextEnabled;
      if (!enabled) {
        map.removeLayer(marker);
        map.closePopup(popup);
      }
    },

    isEnabled() {
      return enabled;
    },

    show,

    getPin() {
      return marker;
    },
  };
}
