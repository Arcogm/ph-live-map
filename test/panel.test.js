import { test } from "node:test";
import assert from "node:assert/strict";

import { emptyMessage, filterQuakes, panelStatusCopy, quakeRowCopy } from "../src/ui/panel-state.js";

const quake = (id, mag) => ({ id, mag, place: `Place ${id}`, time: 1, lat: 0, lon: 0, depthKm: 1, url: null });

test("filterQuakes drops quakes below the threshold", () => {
  const list = [quake("a", 3.1), quake("b", 4.5), quake("c", 5.6), quake("d", null)];
  assert.deepEqual(filterQuakes(list, 4.5).map((q) => q.id), ["b", "c"]);
  assert.deepEqual(filterQuakes(list, 5.5).map((q) => q.id), ["c"]);
  assert.deepEqual(filterQuakes(list, 0).map((q) => q.id), ["a", "b", "c", "d"]);
});

test("unknown magnitudes survive only under All", () => {
  const list = [quake("x", null)];
  assert.equal(filterQuakes(list, 0).length, 1);
  assert.equal(filterQuakes(list, 4.5).length, 0);
});

test("empty messages name the exact state", () => {
  const list = [quake("a", 3.1)];
  assert.equal(emptyMessage({ status: "empty", filter: 0, hasQuakes: [] }), "No earthquakes in the last 7 days.");
  assert.equal(emptyMessage({ status: "ready", filter: 5.5, hasQuakes: list }), "No earthquakes match this filter.");
  assert.equal(emptyMessage({ status: "ready", filter: 0, hasQuakes: list }), null);
  assert.equal(emptyMessage({ status: "error", filter: 0, hasQuakes: list }), null);
});

test("panel status copy mirrors the brand states", () => {
  const fetchedAt = Date.UTC(2026, 10, 27, 8, 0, 0);
  const now = fetchedAt + 60_000;
  assert.deepEqual(panelStatusCopy({ status: "loading", fetchedAt: null }), { state: "loading", text: "Updating…" });
  assert.deepEqual(panelStatusCopy({ status: "ready", fetchedAt, now }), { state: "live", text: "Live · updated 16:00" });
  assert.deepEqual(panelStatusCopy({ status: "empty", fetchedAt, now }), { state: "live", text: "Live · no recent quakes" });
  assert.deepEqual(panelStatusCopy({ status: "error", fetchedAt, now }), {
    state: "stale",
    text: "Stale · updated 16:00",
  });
  assert.deepEqual(panelStatusCopy({ status: "error", fetchedAt: null }), { state: "offline", text: "Offline · no data yet" });
  assert.deepEqual(panelStatusCopy({ status: "idle", fetchedAt: null }), { state: "idle", text: "Starting…" });
});

test("list rows read as relative time with the full date on hover", () => {
  const time = Date.UTC(2026, 10, 27, 8, 0, 0);
  const now = time + 3 * 3_600_000;
  assert.deepEqual(quakeRowCopy({ id: "a", mag: 5.1, place: "Mindoro, Philippines", time }, now), {
    mag: "M 5.1",
    place: "Mindoro, Philippines",
    time: "3 h ago",
    timeTitle: "27 Nov 2026, 16:00",
    label: "M 5.1 earthquake, Mindoro, Philippines, 3 h ago",
  });
});

test("list rows keep unknown magnitude and time honest", () => {
  assert.deepEqual(quakeRowCopy({ id: "b", mag: null, place: "Unknown location", time: null }, 0), {
    mag: "M ?",
    place: "Unknown location",
    time: "unknown",
    timeTitle: "—",
    label: "M ? earthquake, Unknown location, time unknown",
  });
});

test("kept data turns stale once it is older than the ttl", () => {
  const fetchedAt = Date.UTC(2026, 10, 27, 8, 0, 0);
  const now = fetchedAt + 5 * 60_000;
  assert.deepEqual(panelStatusCopy({ status: "ready", fetchedAt, now }), { state: "stale", text: "Stale · updated 16:00" });
});
