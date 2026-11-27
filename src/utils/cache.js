/**
 * A tiny in-memory cache with a time limit.
 *
 * `now` is injectable so tests (and callers that need determinism) never
 * depend on the wall clock. A value is stale once `now() - storedAt` reaches
 * `ttl`; stale values are evicted when read.
 */
export function createCache({ ttl = 5 * 60 * 1000, now = Date.now } = {}) {
  const store = new Map();

  return {
    get(key) {
      const entry = store.get(key);
      if (!entry) return undefined;
      if (now() - entry.storedAt >= ttl) {
        store.delete(key);
        return undefined;
      }
      return entry.value;
    },

    set(key, value) {
      store.set(key, { value, storedAt: now() });
    },

    delete(key) {
      store.delete(key);
    },

    clear() {
      store.clear();
    },

    size() {
      return store.size;
    },
  };
}
