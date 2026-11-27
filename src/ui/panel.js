import { formatManila, magnitudeBin, relativeTime } from "./format.js";
import { emptyMessage, filterQuakes, panelStatusCopy } from "./panel-state.js";

export { emptyMessage, filterQuakes, panelStatusCopy } from "./panel-state.js";

const MAX_LIST = 8;

const MAG_COLORS = {
  minor: "#38bdf8",
  light: "#fbbf24",
  moderate: "#fb923c",
  strong: "#ef4444",
  unknown: "#94a3b8",
};

/** Two shorthand summaries for the footer: "M 5.1" and "14:02". */
function listRow(quake, onSelect) {
  const li = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "quake-item";
  button.style.setProperty("--c", MAG_COLORS[magnitudeBin(quake.mag)]);
  button.title = quake.place;

  const mag = document.createElement("span");
  mag.className = "q-mag";
  mag.textContent = quake.mag == null ? "M ?" : `M ${quake.mag.toFixed(1)}`;

  const place = document.createElement("span");
  place.className = "q-place";
  place.textContent = quake.place;

  const time = document.createElement("span");
  time.className = "q-time";
  time.textContent = formatManila(quake.time);

  button.append(mag, place, time);
  button.addEventListener("click", () => onSelect(quake.id));
  li.append(button);
  return li;
}

/**
 * Own the panel chrome: toggles, magnitude filter, refresh, status area,
 * recent list, and the mobile sheet. The caller supplies callbacks; the
 * panel never fetches.
 */
export function mountPanel({
  onRefresh,
  onToggleQuakes,
  onToggleWeather,
  onFilter,
  onSelectQuake,
  getQuakes,
  getStatus,
}) {
  const panel = document.getElementById("panel");
  const sheetButton = document.getElementById("controls-button");
  const closeButton = document.getElementById("panel-close");
  const backdrop = document.getElementById("sheet-backdrop");
  const quakesToggle = document.getElementById("toggle-quakes");
  const weatherToggle = document.getElementById("toggle-weather");
  const filterSelect = document.getElementById("filter-mag");
  const refreshButton = document.getElementById("refresh");
  const statusEl = document.getElementById("status");
  const listEl = document.getElementById("quake-list");

  let quakes = [];
  let filter = 0;
  let lastStatus = { status: "idle", fetchedAt: null };

  function renderList() {
    listEl.replaceChildren();
    const shown = filterQuakes(quakes, filter).slice(0, MAX_LIST);

    if (!shown.length) {
      const li = document.createElement("li");
      li.className = "list-empty";
      li.textContent =
        emptyMessage({ status: lastStatus.status, filter, hasQuakes: quakes }) ??
        (lastStatus.status === "idle" ? "Loading…" : "Nothing to show yet.");
      listEl.append(li);
      return;
    }

    for (const quake of shown) listEl.append(listRow(quake, (id) => onSelectQuake?.(id, { closeSheet: true })));
  }

  function renderStatus() {
    const copy = panelStatusCopy(lastStatus);
    const liveStatus = document.getElementById("live-status");
    const liveText = document.getElementById("live-text");
    liveStatus.dataset.state = copy.state;
    liveText.textContent = copy.text;

    statusEl.classList.toggle("is-error", lastStatus.status === "error");
    statusEl.replaceChildren();

    if (lastStatus.status === "loading") {
      const wrap = document.createElement("p");
      wrap.className = "status-loading";
      const spin = document.createElement("span");
      spin.className = "spinner";
      spin.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      label.textContent = "Loading earthquakes…";
      wrap.append(spin, label);
      statusEl.append(wrap);
      return;
    }

    if (lastStatus.status === "error") {
      const text = document.createElement("p");
      text.textContent = lastStatus.fetchedAt
        ? `Couldn't refresh. Showing data from ${formatManila(lastStatus.fetchedAt)}.`
        : "Could not load earthquakes. Check your connection and try again.";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "button button-small";
      retry.textContent = lastStatus.fetchedAt ? "Retry" : "Try again";
      retry.addEventListener("click", () => onRefresh?.());
      const row = document.createElement("div");
      row.className = "retry-row";
      row.append(retry);
      statusEl.append(text, row);
      return;
    }

    if (lastStatus.status === "empty") {
      const text = document.createElement("p");
      text.textContent = "No earthquakes in the last 7 days.";
      statusEl.append(text);
      return;
    }

    if (lastStatus.status === "ready") {
      const text = document.createElement("p");
      text.textContent = `${quakes.length} earthquake${quakes.length === 1 ? "" : "s"} in the last 7 days. Updated ${formatManila(lastStatus.fetchedAt)}.`;
      statusEl.append(text);
    }
  }

  /* ---- mobile sheet ---- */

  function openSheet() {
    panel.classList.add("is-open");
    backdrop.classList.add("is-open");
    backdrop.hidden = false;
    sheetButton.setAttribute("aria-expanded", "true");
    closeButton.focus({ preventScroll: true });
  }

  function closeSheet({ restoreFocus = true } = {}) {
    panel.classList.remove("is-open");
    backdrop.classList.remove("is-open");
    backdrop.hidden = true;
    sheetButton.setAttribute("aria-expanded", "false");
    if (restoreFocus) sheetButton.focus({ preventScroll: true });
  }

  sheetButton.addEventListener("click", () => {
    if (panel.classList.contains("is-open")) closeSheet();
    else openSheet();
  });
  closeButton.addEventListener("click", () => closeSheet());
  backdrop.addEventListener("click", () => closeSheet());

  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) {
      event.stopPropagation();
      closeSheet();
    }
  });

  /* ---- desktop controls ---- */

  quakesToggle.addEventListener("change", (event) => onToggleQuakes?.(event.currentTarget.checked));
  weatherToggle.addEventListener("change", (event) => onToggleWeather?.(event.currentTarget.checked));
  filterSelect.addEventListener("change", (event) => {
    filter = Number(event.currentTarget.value) || 0;
    onFilter?.(filter);
    renderList();
    renderStatus();
  });
  refreshButton.addEventListener("click", () => onRefresh?.());

  return {
    setStatus(next) {
      lastStatus = next;
      renderStatus();
      renderList();
    },
    setQuakes(next) {
      quakes = next;
      renderList();
      renderStatus();
    },
    setFilter(min) {
      filter = Number(min) || 0;
      filterSelect.value = String(filter);
      renderList();
    },
    getFilter() {
      return filter;
    },
    open: openSheet,
    close: closeSheet,
  };
}
