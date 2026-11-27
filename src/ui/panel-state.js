import { formatManila } from "./format.js";

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

/** Brand/panel state word and copy from the load state. */
export function panelStatusCopy({ status, fetchedAt }) {
  if (status === "loading") return { state: "loading", text: "Updating…" };
  if (status === "error") {
    return {
      state: "offline",
      text: fetchedAt ? `Offline · data from ${formatManila(fetchedAt)}` : "Offline · no data yet",
    };
  }
  if (status === "ready") return { state: "live", text: `Live · updated ${formatManila(fetchedAt)}` };
  if (status === "empty") return { state: "live", text: "Live · no recent quakes" };
  if (status === "stale") return { state: "stale", text: `Stale · updated ${formatManila(fetchedAt)}` };
  return { state: "idle", text: "Starting…" };
}
