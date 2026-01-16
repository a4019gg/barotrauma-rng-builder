// ui/db-panel.js
// Database Panel UI (v2, renderer-based)
//
// Uses:
// - services/database.js (data access)
// - ui/icon-renderer.js (icon rendering)
// - ui/popup.js (toasts)
//
// This module:
// - Does NOT render icons itself
// - Does NOT calculate colors
// - Does NOT know about nodes or RNG
//
// All comments are intentionally ENGLISH ONLY.

import * as DB from "../services/database.js";
import { createIcon } from "./icon-renderer.js";
import {
  showSuccess,
  showWarning,
  showError
} from "./popup.js";

/* =========================================================
   CONFIG
   ========================================================= */

const EXPAND_ALL_LIMIT = 100;
const EXPAND_BATCH_SIZE = 20;

/* =========================================================
   LOCAL STATE (DB PANEL ONLY)
   ========================================================= */

let isOpen = false;

let currentType = "afflictions";
let currentSort = "name-asc";
let currentQuery = "";

const expandedIds = new Set();

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
    btn.addEventListener("click", () => {
      setType(btn.dataset.type);
    });
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

  const header = document.createElement("div");
  header.className = "db-entry-header";

  /* Icon (DB preview mode = gradient) */
  if (entry.icon) {
    const iconEl = createIcon({
      texture: entry.icon.texture,
      sourcerect: entry.icon.sourcerect,
      role: entry.icon.role || "neutral",
      palette: entry.icon.palette || entry.icon.role,
      mode: "gradient"
    });

    header.appendChild(iconEl);
  }

  const title = document.createElement("div");
  title.className = "db-entry-title";
  title.textContent = entry.name || entry.id;

  const expandBtn = document.createElement("button");
  expandBtn.className = "db-expand-btn";
  expandBtn.textContent = isExpanded ? "▾" : "▸";

  expandBtn.addEventListener("click", e => {
    e.stopPropagation();
    toggleExpanded(entry.id);
  });

  header.append(title, expandBtn);
  card.append(header);

  const idEl = document.createElement("div");
  idEl.className = "db-entry-id";
  idEl.textContent = entry.id;
  card.append(idEl);

  card.addEventListener("click", () => {
    copyToClipboard(entry.id);
  });

  if (isExpanded) {
    card.append(createDetails(entry));
  }

  return card;
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
  const entries = DB.search(currentType, currentQuery);

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
