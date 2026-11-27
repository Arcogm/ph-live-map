import { formatManila } from "./format.js";
import { isStale } from "./freshness.js";

/** Quakes at or above the threshold; unknown magnitudes only under "All". */
export function filterQuakes(quakes, minMag) {
  const threshold = Number(minMag) || 0;
  if (threshold === 0) return quakes.slice();
  return quakes.filter((q) => q.mag != null && q.mag >= threshold);
}

/** The one sentence to show when nothing is drawn, or null. */
export function emptyMessage({ status, filter, hasQuakes }) {
  if (status === "empty") return "No earthquakes in the last 7 days.";
  if (status === "ready" && hasQuakes && !filterQuakes(hasQuakes, filter).length) {
    return "No earthquakes match this filter.";
  }
  return null;
}

/**
 * Brand/panel state word and copy from the load state.
 *
 * Honesty rules: "Live" only while the data is inside the ttl, "Stale" when
 * older data is still on the map, and "Offline" only when the last request
 * failed and there is nothing cached to show.
 */
export function panelStatusCopy({ status, fetchedAt, now = Date.now() }) {
  if (status === "loading") return { state: "loading", text: "Updating…" };
  if (status === "error") {
    if (fetchedAt == null) return { state: "offline", text: "Offline · no data yet" };
    return { state: "stale", text: `Stale · updated ${formatManila(fetchedAt)}` };
  }
  if (status === "empty") return { state: "live", text: "Live · no recent quakes" };
  if (status === "ready" || status === "stale") {
    if (isStale(fetchedAt, now)) return { state: "stale", text: `Stale · updated ${formatManila(fetchedAt)}` };
    return { state: "live", text: `Live · updated ${formatManila(fetchedAt)}` };
  }
  return { state: "idle", text: "Starting…" };
}
