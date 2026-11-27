import { createCache } from "../utils/cache.js";

const USGS_ENDPOINT = "https://earthquake.usgs.gov/fdsnws/event/1/query";

const PH_BOX = {
  minlatitude: 4,
  maxlatitude: 22,
  minlongitude: 116,
  maxlongitude: 128,
};
const WINDOW_DAYS = 7;

const cache = createCache();

function ymd(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildQuakeUrl(now = Date.now()) {
  const start = new Date(now - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const url = new URL(USGS_ENDPOINT);
  url.searchParams.set("format", "geojson");
  url.searchParams.set("starttime", ymd(start));
  url.searchParams.set("minlatitude", String(PH_BOX.minlatitude));
  url.searchParams.set("maxlatitude", String(PH_BOX.maxlatitude));
  url.searchParams.set("minlongitude", String(PH_BOX.minlongitude));
  url.searchParams.set("maxlongitude", String(PH_BOX.maxlongitude));
  url.searchParams.set("orderby", "time");
  return url.toString();
}

/** USGS GeoJSON feature -> the fields the map popup uses, or null. */
export function toQuake(feature) {
  if (!feature || feature.properties?.type !== "earthquake") return null;

  const [lon, lat, depth] = feature.geometry?.coordinates ?? [];
  if (typeof lat !== "number" || typeof lon !== "number") return null;

  const props = feature.properties;
  return {
    id: feature.id,
    lat,
    lon,
    mag: typeof props.mag === "number" ? props.mag : null,
    place: props.place || "Unknown location",
    time: props.time,
    depthKm: typeof depth === "number" ? depth : null,
    url: props.url || null,
  };
}

/**
 * Fetch the last seven days of earthquakes. Results are cached for five
 * minutes; `force` skips the cache read (an explicit user refresh) but still
 * stores the response. Rejects on network and HTTP failure.
 */
export async function loadEarthquakes({ force = false } = {}) {
  const url = buildQuakeUrl();

  if (!force) {
    const cached = cache.get(url);
    if (cached) return { ...cached, fromCache: true };
  }

  const response = await fetch(url, { headers: { Accept: "application/geo+json" } });
  if (!response.ok) {
    throw new Error(`USGS responded ${response.status}`);
  }

  const data = await response.json();
  const quakes = (data.features ?? []).map(toQuake).filter(Boolean);
  const result = { quakes, fetchedAt: Date.now() };
  cache.set(url, result);

  return { ...result, fromCache: false };
}
