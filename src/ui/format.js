const MANILA = "Asia/Manila";

const timeFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: MANILA,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const fullFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: MANILA,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const toDate = (value) => (value instanceof Date ? value : new Date(value));

/** "16:00" in Asia/Manila; "—" when the value is missing or invalid. */
export function formatManila(value) {
  if (value == null) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return timeFormat.format(date);
}

/** "27 Nov 2026, 16:00" in Asia/Manila; "—" when missing or invalid. */
export function formatManilaFull(value) {
  if (value == null) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return fullFormat.format(date);
}

const COMPASS_POINTS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

/** Compass point for a bearing in degrees, 16 sectors. */
export function compass(degrees) {
  if (degrees == null || Number.isNaN(Number(degrees))) return "—";
  const normalized = ((Number(degrees) % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(normalized / 22.5) % 16];
}

const WEATHER_CODES = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Light showers",
  81: "Showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with heavy hail",
};

export function describeWeatherCode(code) {
  return WEATHER_CODES[code] ?? "Unknown conditions";
}

/** "minor" | "light" | "moderate" | "strong" | "unknown" at spec thresholds. */
export function magnitudeBin(mag) {
  if (mag == null || Number.isNaN(Number(mag))) return "unknown";
  const value = Number(mag);
  if (value < 4.5) return "minor";
  if (value < 5.5) return "light";
  if (value < 6.5) return "moderate";
  return "strong";
}

/** Circle radius in pixels: 7 + magnitude x 2, or 7 when unknown. */
export function quakeRadius(mag) {
  if (mag == null || Number.isNaN(Number(mag))) return 7;
  return 7 + Number(mag) * 2;
}

/** "just now" | "N min ago" | "N h ago" | "N d ago" | "unknown". */
export function relativeTime(timestamp, now = Date.now()) {
  if (timestamp == null) return "unknown";
  const elapsed = Math.max(0, now - Number(timestamp));
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}
