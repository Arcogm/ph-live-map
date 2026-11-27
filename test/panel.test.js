import { test } from "node:test";
import assert from "node:assert/strict";

import { emptyMessage, filterQuakes, panelStatusCopy } from "../src/ui/panel-state.js";

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
  assert.deepEqual(panelStatusCopy({ status: "loading", fetchedAt: null }), { state: "loading", text: "Updating…" });
  assert.deepEqual(panelStatusCopy({ status: "ready", fetchedAt }), { state: "live", text: "Live · updated 16:00" });
  assert.deepEqual(panelStatusCopy({ status: "empty", fetchedAt }), { state: "live", text: "Live · no recent quakes" });
  assert.deepEqual(panelStatusCopy({ status: "error", fetchedAt }), {
    state: "offline",
    text: "Offline · data from 16:00",
  });
  assert.deepEqual(panelStatusCopy({ status: "error", fetchedAt: null }), { state: "offline", text: "Offline · no data yet" });
  assert.deepEqual(panelStatusCopy({ status: "idle", fetchedAt: null }), { state: "idle", text: "Starting…" });
});
