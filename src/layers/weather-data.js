import { createCache } from "../utils/cache.js";

const ENDPOINT = "https://api.open-meteo.com/v1/forecast";
const CURRENT_FIELDS = [
  "temperature_2m",
  "apparent_temperature",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "wind_direction_10m",
];

const cache = createCache();

/** 4 decimal places ~11 m of precision: nearby clicks share a cache entry. */
export function roundCoord(value) {
  return Math.round(Number(value) * 10_000) / 10_000;
}

export function buildWeatherUrl(lat, lon) {
  const url = new URL(ENDPOINT);
  url.searchParams.set("latitude", String(roundCoord(lat)));
  url.searchParams.set("longitude", String(roundCoord(lon)));
  url.searchParams.set("current", CURRENT_FIELDS.join(","));
  url.searchParams.set("timezone", "Asia/Manila");
  return url.toString();
}

/** Current conditions at a point, cached for five minutes. Rejects on failure. */
export async function loadWeather(lat, lon) {
  const url = buildWeatherUrl(lat, lon);

  const cached = cache.get(url);
  if (cached) return { ...cached, fromCache: true };

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Open-Meteo responded ${response.status}`);
  }

  const data = await response.json();
  const current = data.current;
  if (!current || typeof current.temperature_2m !== "number") {
    throw new Error("Open-Meteo returned no current conditions");
  }

  const result = {
    tempC: current.temperature_2m,
    feelsC: current.apparent_temperature,
    rainMm: current.precipitation,
    windKmh: current.wind_speed_10m,
    windDirDeg: current.wind_direction_10m,
    code: current.weather_code,
    fetchedAt: Date.now(),
    time: current.time,
  };

  cache.set(url, result);
  return { ...result, fromCache: false };
}
