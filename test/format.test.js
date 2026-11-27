import { test } from "node:test";
import assert from "node:assert/strict";

import {
  compass,
  describeWeatherCode,
  formatManila,
  formatManilaFull,
  magnitudeBin,
  quakeRadius,
  relativeTime,
} from "../src/ui/format.js";

test("formatManila renders UTC as Asia/Manila 24h time", () => {
  assert.equal(formatManila("2026-11-27T08:00:00Z"), "16:00");
});

test("formatManilaFull includes the date in Asia/Manila", () => {
  assert.equal(formatManilaFull("2026-11-27T08:00:00Z"), "27 Nov 2026, 16:00");
});

test("compass names the eight sectors", () => {
  assert.equal(compass(0), "N");
  assert.equal(compass(45), "NE");
  assert.equal(compass(113), "ESE");
  assert.equal(compass(180), "S");
  assert.equal(compass(359), "N");
});

test("magnitude bins follow the spec thresholds", () => {
  assert.equal(magnitudeBin(4.4), "minor");
  assert.equal(magnitudeBin(4.5), "light");
  assert.equal(magnitudeBin(5.4), "light");
  assert.equal(magnitudeBin(5.5), "moderate");
  assert.equal(magnitudeBin(6.4), "moderate");
  assert.equal(magnitudeBin(6.5), "strong");
  assert.equal(magnitudeBin(null), "unknown");
});

test("quake radius is 7 + magnitude x 2, with 7 for unknown", () => {
  assert.equal(quakeRadius(5), 17);
  assert.equal(quakeRadius(6.2), 19.4);
  assert.equal(quakeRadius(null), 7);
});

test("weather codes map to plain descriptions", () => {
  assert.equal(describeWeatherCode(0), "Clear sky");
  assert.equal(describeWeatherCode(3), "Overcast");
  assert.equal(describeWeatherCode(61), "Rain");
  assert.equal(describeWeatherCode(95), "Thunderstorm");
  assert.equal(describeWeatherCode(999), "Unknown conditions");
});

test("relativeTime reads naturally", () => {
  const now = 1_000_000_000;
  assert.equal(relativeTime(now - 20_000, now), "just now");
  assert.equal(relativeTime(now - 3 * 60_000, now), "3 min ago");
  assert.equal(relativeTime(now - 2 * 3_600_000, now), "2 h ago");
  assert.equal(relativeTime(null, now), "unknown");
});
