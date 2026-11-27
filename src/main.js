import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

document.getElementById("live-text").textContent = "Map ready";
