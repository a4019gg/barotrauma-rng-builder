// services/db/db-panel.js
// Database panel (DB)
// Uses inline canvas-based icon rendering (legacy-equivalent)
//
// NOTES:
// - Localization is NOT implemented here (TODO)
// - Canvas is used intentionally for DB preview
// - Node UI icon renderer is NOT used here

import * as DB from "./database.js";
import { showError } from "../../ui/popup.js";

/* =========================================================
   STATE
   ========================================================= */

let modalEl = null;
let currentType = "afflictions";
let expandedAll = false;

// fallback icon (concealed)
let fallbackIcon = null;

const DEFAULT_ICON_SIZE = 28;

/* =========================================================
   PUBLIC API
   ========================================================= */

export async function openDatabasePanel() {
  try {
    if (!modalEl) {
      prepareFallbackIcon();
      modalEl = buildModal();
      document.body.appendChild(modalEl);
    }

    modalEl.style.display = "block";
    renderList();
  } catch (err) {
    console.error(err);
    showError("Failed to load database");
  }
}

export function closeDatabasePanel() {
  if (modalEl) {
    modalEl.style.display = "none";
  }
}

/* =========================================================
   FALLBACK ICON
   ========================================================= */

function prepareFallbackIcon() {
  const concealed = DB.getById("afflictions", "concealed");
  if (!concealed || !concealed.icon) return;

  fallbackIcon = {
    texture: concealed.icon.texture,
    sourcerect: concealed.icon.sourcerect
  };
}

/* =========================================================
   MODAL STRUCTURE
   ========================================================= */

function buildModal() {
  const modal = document.createElement("div");
  modal.className = "db-modal";

  modal.innerHTML = `
    <div class="db-backdrop"></div>
    <div class="db-window">
      <div class="db-header">
        <div class="db-tabs">
          <button data-type="afflictions" class="active">Effects</button>
          <button data-type="items">Items</button>
          <button data-type="creatures">Creatures</button>
        </div>

        <div style="display:flex; gap:8px; align-items:center">
          <select class="db-language">
            <option value="en">EN ▾</option>
            <option value="ru">RU ▾</option>
          </select>
          <button class="db-close">✕</button>
        </div>
      </div>

      <div class="db-toolbar">
        <input class="db-search" placeholder="Search..." />
        <button class="db-expand-all" title="Expand / Collapse all">⧉</button>
      </div>

      <div class="db-list"></div>
    </div>
  `;

  // backdrop / close
  modal.querySelector(".db-backdrop").onclick = closeDatabasePanel;
  modal.querySelector(".db-close").onclick = closeDatabasePanel;

  // tabs
  modal.querySelectorAll(".db-tabs button").forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll(".db-tabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentType = btn.dataset.type;
      expandedAll = false;
      renderList();
    };
  });

  // expand all
  modal.querySelector(".db-expand-all").onclick = () => {
    expandedAll = !expandedAll;
    renderList();
  };

  // search
  modal.querySelector(".db-search").oninput = () => renderList();

  return modal;
}

/* =========================================================
   RENDER LIST
   ========================================================= */

function renderList() {
  const listEl = modalEl.querySelector(".db-list");
  const searchValue = modalEl.querySelector(".db-search").value.toLowerCase();

  listEl.innerHTML = "";

  const entries = DB.getAll(currentType);
  if (!entries || entries.length === 0) {
    listEl.innerHTML = `<div class="db-empty">No entries</div>`;
    return;
  }

  const filtered = entries.filter(e =>
    e.name?.toLowerCase().includes(searchValue) ||
    e.id?.toLowerCase().includes(searchValue)
  );

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="db-empty">Nothing found</div>`;
    return;
  }

  for (const entry of filtered) {
    listEl.appendChild(buildEntryCard(entry));
  }
}

/* =========================================================
   ENTRY CARD
   ========================================================= */

function buildEntryCard(entry) {
  const card = document.createElement("div");
  card.className = "db-entry";

  const header = document.createElement("div");
  header.className = "db-entry-header";

  const icon = createEntryIcon(entry);
  if (icon) header.appendChild(icon);

  const titleWrap = document.createElement("div");

  const title = document.createElement("div");
  title.className = "db-entry-title";
  title.textContent = entry.name || entry.id;

  const id = document.createElement("div");
  id.className = "db-entry-id";
  id.textContent = entry.id;

  titleWrap.appendChild(title);
  titleWrap.appendChild(id);
  header.appendChild(titleWrap);

  const expandBtn = document.createElement("button");
  expandBtn.className = "db-expand-btn";
  expandBtn.textContent = "▾";
  header.appendChild(expandBtn);

  card.appendChild(header);

  const details = document.createElement("div");
  details.className = "db-entry-details";
  details.style.display = expandedAll ? "block" : "none";

  details.innerHTML = `
    <div class="db-row">Type: ${entry.type ?? "-"}</div>
    <div class="db-row">Max strength: ${entry.maxstrength ?? "-"}</div>
    <div class="db-description">${entry.description || ""}</div>
  `;

  expandBtn.onclick = e => {
    e.stopPropagation();
    toggleDetails(details);
  };

  card.onclick = () => toggleDetails(details);

  card.appendChild(details);
  return card;
}

function toggleDetails(details) {
  details.style.display = details.style.display === "none" ? "block" : "none";
}

/* =========================================================
   ICON RENDERING (CANVAS, DB ONLY)
   ========================================================= */

function createEntryIcon(entry) {
  const iconData = entry.icon || fallbackIcon;
  if (!iconData) return null;

  return createDbIconCanvas({
    texture: iconData.texture,
    sourcerect: iconData.sourcerect,
    size: DEFAULT_ICON_SIZE
  });
}

function createDbIconCanvas({ texture, sourcerect, size }) {
  if (!texture || !sourcerect) return null;

  const rect = normalizeSourceRect(sourcerect);
  if (!rect) return null;

  const { x, y, w, h } = rect;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.className = "db-icon-canvas";

  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const img = new Image();
  img.src = texture;

  img.onload = () => {
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, x, y, w, h, 0, 0, size, size);
  };

  return canvas;
}

function normalizeSourceRect(src) {
  let parts;

  if (Array.isArray(src)) {
    parts = src;
  } else if (typeof src === "string") {
    parts = src.split(",").map(v => Number(v.trim()));
  }

  if (!parts || parts.length !== 4 || parts.some(n => !isFinite(n))) {
    return null;
  }

  const [x, y, w, h] = parts;
  if (w <= 0 || h <= 0) return null;

  return { x, y, w, h };
}
