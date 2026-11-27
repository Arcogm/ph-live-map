import { test } from "node:test";
import assert from "node:assert/strict";

import { buildWeatherUrl, roundCoord } from "../src/layers/weather-data.js";

test("weather url asks for exactly the fields the popup shows", () => {
  const url = new URL(buildWeatherUrl(14.5995, 120.9842));

  assert.equal(url.origin + url.pathname, "https://api.open-meteo.com/v1/forecast");
  assert.equal(url.searchParams.get("latitude"), "14.5995");
  assert.equal(url.searchParams.get("longitude"), "120.9842");
  assert.equal(url.searchParams.get("timezone"), "Asia/Manila");
  assert.deepEqual(url.searchParams.get("current").split(","), [
    "temperature_2m",
    "apparent_temperature",
    "precipitation",
    "weather_code",
    "wind_speed_10m",
    "wind_direction_10m",
  ]);
});

test("nearby clicks share one cache entry via 4-dp rounding", () => {
  assert.equal(roundCoord(14.59951), 14.5995);
  assert.equal(roundCoord(120.98424), 120.9842);
  assert.equal(buildWeatherUrl(14.59951, 120.98424), buildWeatherUrl(14.5995, 120.9842));
});
