import { test } from "node:test";
import assert from "node:assert/strict";

import { isStale, mountFreshness, TTL } from "../src/ui/freshness.js";

test("data is fresh until exactly the ttl", () => {
  const fetchedAt = 1_000_000;
  assert.equal(isStale(fetchedAt, fetchedAt + TTL - 1), false);
  assert.equal(isStale(fetchedAt, fetchedAt + TTL), true);
});

test("nothing cached is always stale", () => {
  assert.equal(isStale(null, Date.now()), true);
});

function fakeWindow({ visible = true } = {}) {
  const doc = { visibilityState: visible ? "visible" : "hidden", addEventListener() {}, removeEventListener() {} };
  const win = { addEventListener() {}, removeEventListener() {} };
  return { doc, win };
}

test("a visible tab refreshes once data is stale", () => {
  const { doc, win } = fakeWindow();
  let refreshes = 0;
  const freshness = mountFreshness({
    getFetchedAt: () => 1_000,
    now: () => 1_000 + TTL,
    refresh: () => refreshes++,
    doc,
    win,
  });

  freshness.check();
  assert.equal(refreshes, 1);
});

test("a hidden tab never refreshes", () => {
  const { doc, win } = fakeWindow({ visible: false });
  let refreshes = 0;
  const freshness = mountFreshness({
    getFetchedAt: () => 1_000,
    now: () => 1_000 + TTL,
    refresh: () => refreshes++,
    doc,
    win,
  });

  freshness.check();
  assert.equal(refreshes, 0);
});

test("an in-flight fetch blocks the background refresh", () => {
  const { doc, win } = fakeWindow();
  let refreshes = 0;
  const freshness = mountFreshness({
    getFetchedAt: () => 1_000,
    now: () => 1_000 + TTL,
    canRefresh: () => false,
    refresh: () => refreshes++,
    doc,
    win,
  });

  freshness.check();
  assert.equal(refreshes, 0);
});
