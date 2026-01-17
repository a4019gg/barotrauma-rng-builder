// ui/db-panel.js
// Database Panel UI
//
// TODO: Localization
// All user-facing strings must be moved to external localization files
// (legacy-style key/value dictionaries).
// This file should use localization keys only.

import * as DB from "../services/database.js";
import { createIcon } from "./icon-renderer.js";
import { showSuccess, showWarning, showError } from "./popup.js";

/* =========================================================
   STATE
   ========================================================= */

let isOpen = false;

let currentType = "afflictions";
let currentSort = "name-asc";
let currentQuery = "";

const expandedIds = new Set();

/* DOM refs */
let rootEl;
let listEl;
let searchInput;
let sortButton;
let expandAllButton;

/* Cached fallback icon (concealed) */
let concealedFallbackIcon = null;

/* =========================================================
   PUBLIC API
   ========================================================= */

export async function openDatabasePanel() {
  if (isOpen) return;

  try {
    await DB.load();
    cacheFallbackIcon();
  } catch (err) {
    console.error(err);
    showError("Failed to load database");
    return;
  }

  buildUI();
  render();
  isOpen = true;
}

export function closeDatabasePanel() {
  if (!isOpen) return;

  rootEl.remove();
  rootEl = null;
  expandedIds.clear();
  isOpen = false;
}

/* =========================================================
   FALLBACK ICON
   ========================================================= */

function cacheFallbackIcon() {
  const concealed = DB.getById("afflictions", "concealed");
  concealedFallbackIcon = concealed?.icon ?? null;
}

function resolveIcon(entry) {
  if (entry.icon && entry.icon.texture && entry.icon.sourcerect) {
    return entry.icon;
  }
  return concealedFallbackIcon;
}

/* =========================================================
   UI BUILD
   ========================================================= */

function buildUI() {
  rootEl = document.createElement("div");
  rootEl.className = "db-modal";

  rootEl.innerHTML = `
    <div class="db-backdrop"></div>

    <div class="db-window">
      <div class="db-header">
        <div class="db-tabs">
          <button data-type="afflictions">Afflictions</button>
          <button data-type="items">Items</button>
          <button data-type="creatures">Creatures</button>
        </div>
        <button class="db-close">✕</button>
      </div>

      <div class="db-toolbar">
        <input
          class="db-search"
          type="text"
          placeholder="Search by ID or name"
        />
        <button class="db-sort">A–Z</button>
        <button
          class="db-expand-all"
          title="Expand / Collapse all"
        >⧉</button>
      </div>

      <div class="db-list"></div>
    </div>
  `;

  document.body.appendChild(rootEl);

  listEl = rootEl.querySelector(".db-list");
  searchInput = rootEl.querySelector(".db-search");
  sortButton = rootEl.querySelector(".db-sort");
  expandAllButton = rootEl.querySelector(".db-expand-all");

  bindEvents();
}

/* =========================================================
   EVENTS
   ========================================================= */

function bindEvents() {
  rootEl.querySelector(".db-backdrop")
    .addEventListener("click", closeDatabasePanel);

  rootEl.querySelector(".db-close")
    .addEventListener("click", closeDatabasePanel);

  rootEl.querySelectorAll(".db-tabs button").forEach(btn => {
    btn.addEventListener("click", () => setType(btn.dataset.type));
  });

  searchInput.addEventListener("input", e => {
    currentQuery = e.target.value;
    expandedIds.clear();
    render();
  });

  sortButton.addEventListener("click", () => {
    toggleSort();
    render();
  });

  expandAllButton.addEventListener("click", onExpandAll);

  window.addEventListener("keydown", onKeyDown);
}

function onKeyDown(e) {
  if (e.key === "Escape") {
    closeDatabasePanel();
    window.removeEventListener("keydown", onKeyDown);
  }
}

/* =========================================================
   RENDER
   ========================================================= */

function render() {
  updateTabs();
  updateSortLabel();
  renderList();
}

function updateTabs() {
  rootEl.querySelectorAll(".db-tabs button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.type === currentType);
  });
}

function updateSortLabel() {
  sortButton.textContent =
    currentSort.endsWith("asc") ? "A–Z" : "Z–A";
}

function renderList() {
  listEl.innerHTML = "";

  let entries = DB.search(currentType, currentQuery);
  entries = DB.sort(entries, currentSort);

  if (entries.length === 0) {
    listEl.innerHTML =
      `<div class="db-empty">No results</div>`;
    return;
  }

  for (const entry of entries) {
    listEl.appendChild(createEntryCard(entry));
  }
}

/* =========================================================
   ENTRY CARD
   ========================================================= */

function createEntryCard(entry) {
  const card = document.createElement("div");
  card.className = "db-entry";

  const isExpanded = expandedIds.has(entry.id);

  const header = document.createElement("div");
  header.className = "db-entry-header";

  const iconData = resolveIcon(entry);
  if (iconData) {
    header.appendChild(createIcon({
      texture: iconData.texture,
      sourcerect: iconData.sourcerect,
      role: iconData.role,
      palette: iconData.palette,
      mode: "gradient"
    }));
  }

  const title = document.createElement("div");
  title.className = "db-entry-title";
  title.textContent = entry.name || entry.id;

  header.appendChild(title);
  card.appendChild(header);

  const idEl = document.createElement("div");
  idEl.className = "db-entry-id";
  idEl.textContent = entry.id;
  card.appendChild(idEl);

  const expandBtn = document.createElement("button");
  expandBtn.className = "db-expand-btn";
  expandBtn.textContent = "▾";
  expandBtn.title = "Expand / Collapse";

  expandBtn.addEventListener("click", e => {
    e.stopPropagation();
    toggleExpanded(entry.id);
  });

  card.appendChild(expandBtn);

  card.addEventListener("click", () => {
    copyToClipboard(entry.id);
  });

  if (isExpanded) {
    card.appendChild(createDetails(entry));
  }

  return card;
}

/* =========================================================
   DETAILS
   ========================================================= */

function createDetails(entry) {
  const box = document.createElement("div");
  box.className = "db-entry-details";

  if (currentType === "afflictions") {
    addRow(box, "Type", entry.type);
    addRow(box, "Max strength", entry.maxstrength);
    addRow(box, "Limb specific", String(entry.limbspecific));
    addRow(box, "Is buff", String(entry.isbuff));
  }

  if (entry.description) {
    addDescription(box, entry.description);
  }

  return box;
}

/* =========================================================
   EXPAND ALL
   ========================================================= */

function onExpandAll() {
  const entries = DB.search(currentType, currentQuery);

  if (expandedIds.size > 0) {
    expandedIds.clear();
    render();
    return;
  }

  if (entries.length > 100) {
    showWarning("Too many entries to expand");
    return;
  }

  for (const entry of entries) {
    expandedIds.add(entry.id);
  }

  render();
}

/* =========================================================
   HELPERS
   ========================================================= */

function setType(type) {
  if (currentType === type) return;

  currentType = type;
  currentQuery = "";
  expandedIds.clear();
  searchInput.value = "";
  render();
}

function toggleSort() {
  switch (currentSort) {
    case "name-asc": currentSort = "name-desc"; break;
    case "name-desc": currentSort = "id-asc"; break;
    case "id-asc": currentSort = "id-desc"; break;
    default: currentSort = "name-asc";
  }
}

function toggleExpanded(id) {
  expandedIds.has(id)
    ? expandedIds.delete(id)
    : expandedIds.add(id);
  render();
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => showSuccess(`ID copied: ${text}`))
    .catch(() => showWarning("Failed to copy ID"));
}

function addRow(box, label, value) {
  if (value == null) return;
  const row = document.createElement("div");
  row.className = "db-row";
  row.textContent = `${label}: ${value}`;
  box.appendChild(row);
}

function addDescription(box, text) {
  const desc = document.createElement("div");
  desc.className = "db-description";
  desc.textContent = text;
  box.appendChild(desc);
}
