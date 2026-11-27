import { test } from "node:test";
import assert from "node:assert/strict";

import { buildQuakeUrl, toQuake } from "../src/layers/quake-data.js";

test("quake url asks for 7 days of GeoJSON inside the Philippine box", () => {
  const now = Date.UTC(2026, 10, 27, 8, 0, 0); // 2026-11-27T08:00:00Z
  const url = new URL(buildQuakeUrl(now));

  assert.equal(url.origin + url.pathname, "https://earthquake.usgs.gov/fdsnws/event/1/query");
  assert.equal(url.searchParams.get("format"), "geojson");
  assert.equal(url.searchParams.get("starttime"), "2026-11-20");
  assert.equal(url.searchParams.get("minlatitude"), "4");
  assert.equal(url.searchParams.get("maxlatitude"), "22");
  assert.equal(url.searchParams.get("minlongitude"), "116");
  assert.equal(url.searchParams.get("maxlongitude"), "128");
  assert.equal(url.searchParams.get("orderby"), "time");
});

const feature = (overrides = {}) => ({
  type: "Feature",
  id: "us6000udqa",
  properties: {
    mag: 4.5,
    place: "95 km SSE of Sarangani, Philippines",
    time: 1795709880760,
    url: "https://earthquake.usgs.gov/earthquakes/eventpage/us6000udqa",
    type: "earthquake",
    ...overrides.properties,
  },
  geometry: {
    type: "Point",
    coordinates: [125.3, 5.4, 61.2],
    ...overrides.geometry,
  },
});

test("toQuake maps the USGS feature fields the popup needs", () => {
  const quake = toQuake(feature());

  assert.deepEqual(quake, {
    id: "us6000udqa",
    lat: 5.4,
    lon: 125.3,
    mag: 4.5,
    place: "95 km SSE of Sarangani, Philippines",
    time: 1795709880760,
    depthKm: 61.2,
    url: "https://earthquake.usgs.gov/earthquakes/eventpage/us6000udqa",
  });
});

test("toQuake keeps unknown magnitudes instead of inventing one", () => {
  const quake = toQuake(feature({ properties: { mag: null } }));
  assert.equal(quake.mag, null);
});

test("toQuake ignores non-earthquake events", () => {
  const blast = feature({ properties: { type: "quarry blast", mag: 1.2 } });
  assert.equal(toQuake(blast), null);
});

test("toQuake tolerates a missing depth", () => {
  const quake = toQuake(feature({ geometry: { coordinates: [125.3, 5.4] } }));
  assert.equal(quake.depthKm, null);
});
