import { test } from "node:test";
import assert from "node:assert/strict";

import { createCache } from "../src/utils/cache.js";

const TTL = 300_000;

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms) => (t += ms) };
}

test("a cached value is returned before its ttl", () => {
  const c = clock();
  const cache = createCache({ ttl: TTL, now: c.now });

  cache.set("k", "v");
  c.advance(TTL - 1);

  assert.equal(cache.get("k"), "v");
});

test("a value exactly at its ttl is stale", () => {
  const c = clock();
  const cache = createCache({ ttl: TTL, now: c.now });

  cache.set("k", "v");
  c.advance(TTL);

  assert.equal(cache.get("k"), undefined);
});

test("a stale value is evicted on read", () => {
  const c = clock();
  const cache = createCache({ ttl: TTL, now: c.now });

  cache.set("k", "v");
  c.advance(TTL);
  cache.get("k");

  assert.equal(cache.size(), 0);
});

test("missing keys return undefined", () => {
  const cache = createCache({ ttl: TTL, now: clock().now });
  assert.equal(cache.get("nope"), undefined);
});

test("delete removes a fresh value", () => {
  const cache = createCache({ ttl: TTL, now: clock().now });

  cache.set("k", "v");
  cache.delete("k");

  assert.equal(cache.get("k"), undefined);
});

test("set refreshes the stored time", () => {
  const c = clock();
  const cache = createCache({ ttl: TTL, now: c.now });

  cache.set("k", "old");
  c.advance(TTL - 1_000);
  cache.set("k", "new");
  c.advance(TTL - 1_000);

  assert.equal(cache.get("k"), "new");
});
