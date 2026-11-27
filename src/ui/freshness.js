/** Earthquakes are considered current for five minutes. */
export const TTL = 5 * 60 * 1000;

/** True when the last successful fetch is older than the ttl (or missing). */
export function isStale(fetchedAt, now = Date.now(), ttl = TTL) {
  if (fetchedAt == null) return true;
  return now - fetchedAt >= ttl;
}

/**
 * Refresh silently whenever cached data passes the ttl, but only while the
 * tab is visible: a hidden tab costs the API nothing. Coming back to the tab
 * checks immediately, as does focusing the window.
 *
 * `canRefresh` is the caller's guard against overlapping fetches.
 */
export function mountFreshness({
  getFetchedAt,
  canRefresh = () => true,
  refresh,
  interval = 60_000,
  now = Date.now,
  ttl = TTL,
  doc = document,
  win = window,
} = {}) {
  let timer = null;

  function check() {
    if (doc.visibilityState !== "visible") return;
    if (!canRefresh()) return;
    if (isStale(getFetchedAt(), now(), ttl)) refresh();
  }

  function start() {
    if (timer != null) return;
    timer = setInterval(check, interval);
    doc.addEventListener("visibilitychange", check);
    win.addEventListener("focus", check);
    check();
  }

  function stop() {
    if (timer == null) return;
    clearInterval(timer);
    timer = null;
    doc.removeEventListener("visibilitychange", check);
    win.removeEventListener("focus", check);
  }

  return { start, stop, check };
}
