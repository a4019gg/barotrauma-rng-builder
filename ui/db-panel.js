// ui/db-panel.js
// Database Panel UI (v2)
// - Modal window
// - Tabs (afflictions / items / creatures)
// - Search + sort
// - Expand / collapse cards
// - Expand All with hard limit + batching
// - Icon rendering via CSS contract
//
// UI-only module:
// NO core
// NO state
// NO business logic
// NO color calculations

import * as DB from "../services/database.js";
import {
  showSuccess,
  showWarning,
  showError
} from "./popup.js";

/* =========================================================
   CONFIG
   ========================================================= */

const EXPAND_ALL_LIMIT = 100;     // Hard safety limit
const EXPAND_BATCH_SIZE = 20;     // Cards expanded per frame

/* =========================================================
   LOCAL STATE (DB PANEL ONLY)
   ========================================================= */

let isOpen = false;

let currentType = "afflictions";  // persisted between opens
let currentSort = "name-asc";     // persisted between opens
let currentQuery = "";

const expandedIds = new Set();    // NOT persisted

/* Cached DOM references */
let rootEl = null;
let listEl = null;
let searchInput = null;
let sortButton = null;
let expandAllButton = null;

/* =========================================================
   PUBLIC API
   ========================================================= */

/**
 * Opens the database panel.
 * Database is lazy-loaded on first open.
 */
export async function openDatabasePanel() {
  if (isOpen) return;

  try {
    await DB.load();
  } catch (err) {
    console.error(err);
    showError("Failed to load database");
    return;
  }

  buildUI();
  render();

  isOpen = true;
}

/**
 * Closes the database panel.
 */
export function closeDatabasePanel() {
  if (!isOpen) return;

  rootEl.remove();
  rootEl = null;
  expandedIds.clear();

  isOpen = false;
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
        <button class="db-expand-all">Expand All</button>
      </div>

      <div class="db-list"></div>
    </div>
  `;

  document.body.appendChild(rootEl);

  /* Cache DOM */
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
  /* Close on backdrop */
  rootEl.querySelector(".db-backdrop")
    .addEventListener("click", closeDatabasePanel);

  /* Close button */
  rootEl.querySelector(".db-close")
    .addEventListener("click", closeDatabasePanel);

  /* Tabs */
  rootEl.querySelectorAll(".db-tabs button").forEach(btn => {
    btn.addEventListener("click", () => {
      setType(btn.dataset.type);
    });
  });

  /* Search */
  searchInput.addEventListener("input", e => {
    currentQuery = e.target.value;
    expandedIds.clear();     // reset expanded cards on new search
    render();
  });

  /* Sort */
  sortButton.addEventListener("click", () => {
    toggleSort();
    render();
  });

  /* Expand / Collapse All */
  expandAllButton.addEventListener("click", onExpandAll);

  /* ESC key */
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
  updateExpandAllLabel();
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

function updateExpandAllLabel() {
  expandAllButton.textContent =
    expandedIds.size > 0 ? "Collapse All" : "Expand All";
}

function renderList() {
  listEl.innerHTML = "";

  let entries = DB.search(currentType, currentQuery);
  entries = DB.sort(entries, currentSort);

  if (entries.length === 0) {
    listEl.innerHTML = `<div class="db-empty">No results</div>`;
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

  /* Header (always visible) */
  const header = document.createElement("div");
  header.className = "db-entry-header";

  const icon = createIcon(entry);
  const title = document.createElement("div");
  title.className = "db-entry-title";
  title.textContent = entry.name || entry.id;

  const idEl = document.createElement("div");
  idEl.className = "db-entry-id";
  idEl.textContent = entry.id;

  const expandBtn = document.createElement("button");
  expandBtn.className = "db-expand-btn";
  expandBtn.textContent = isExpanded ? "▾" : "▸";

  expandBtn.addEventListener("click", e => {
    e.stopPropagation();
    toggleExpanded(entry.id);
  });

  header.append(icon, title, expandBtn);
  card.append(header, idEl);

  /* Click on card body copies ID */
  card.addEventListener("click", () => {
    copyToClipboard(entry.id);
  });

  /* Expanded details (lazy) */
  if (isExpanded) {
    card.append(createDetails(entry));
  }

  return card;
}

/* =========================================================
   ICON RENDERING (DB PREVIEW)
   ========================================================= */

function createIcon(entry) {
  const icon = document.createElement("div");
  icon.className = "icon";

  const role = entry.icon?.role || "neutral";
  const palette = entry.icon?.palette || role;

  icon.classList.add(
    `icon-role-${role}`,
    `icon-palette-${palette}`,
    "icon-mode-gradient"
  );

  return icon;
}

/* =========================================================
   DETAILS (TYPE-SPECIFIC)
   ========================================================= */

function createDetails(entry) {
  const box = document.createElement("div");
  box.className = "db-entry-details";

  if (currentType === "afflictions") {
    renderAfflictionDetails(box, entry);
  } else if (currentType === "items") {
    renderItemDetails(box, entry);
  } else if (currentType === "creatures") {
    renderCreatureDetails(box, entry);
  }

  return box;
}

function renderAfflictionDetails(box, entry) {
  addRow(box, "Type", entry.type);
  addRow(box, "Max strength", entry.maxstrength);
  addRow(box, "Limb specific", String(entry.limbspecific));
  addRow(box, "Is buff", String(entry.isbuff));

  if (entry.description) {
    addDescription(box, entry.description);
  }
}

function renderItemDetails(box, entry) {
  if (entry.category) addRow(box, "Category", entry.category);
  if (entry.description) addDescription(box, entry.description);
}

function renderCreatureDetails(box, entry) {
  if (entry.description) addDescription(box, entry.description);
}

/* =========================================================
   EXPAND ALL / COLLAPSE ALL
   ========================================================= */

function onExpandAll() {
  let entries = DB.search(currentType, currentQuery);

  if (expandedIds.size > 0) {
    expandedIds.clear();
    render();
    return;
  }

  if (entries.length > EXPAND_ALL_LIMIT) {
    showWarning("Too many entries to expand");
    return;
  }

  expandAllBatched(entries.map(e => e.id));
}

function expandAllBatched(ids) {
  let index = 0;

  function step() {
    for (let i = 0; i < EXPAND_BATCH_SIZE && index < ids.length; i++) {
      expandedIds.add(ids[index++]);
    }

    render();

    if (index < ids.length) {
      requestAnimationFrame(step);
    }
  }

  step();
}

/* =========================================================
   ACTIONS
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
  if (expandedIds.has(id)) {
    expandedIds.delete(id);
  } else {
    expandedIds.add(id);
  }

  render();
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => showSuccess(`ID copied: ${text}`))
    .catch(() => showWarning("Failed to copy ID"));
}

/* =========================================================
   SMALL UI HELPERS
   ========================================================= */

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
