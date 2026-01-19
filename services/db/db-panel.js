// services/db/db-panel.js
// Database panel (DB)
// Uses canvas-based icon rendering for preview
//
// NOTE:
// - Localization is NOT implemented here (TODO)
// - Node UI icon renderer is NOT used here by design

import { createDbIconCanvas } from "./db-icon-canvas.js";
import * as DB from "./database.js";
import { showError } from "../../ui/popup.js";

let modalEl = null;
let currentType = "afflictions";
let expandedAll = false;

// Cache fallback icon (concealed)
let fallbackIcon = null;

/* =========================================================
   PUBLIC API
   ========================================================= */

export async function openDatabasePanel() {
  try {
    if (!modalEl) {
      await prepareFallbackIcon();
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

async function prepareFallbackIcon() {
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

  // Backdrop / close
  modal.querySelector(".db-backdrop").onclick = closeDatabasePanel;
  modal.querySelector(".db-close").onclick = closeDatabasePanel;

  // Tabs
  modal.querySelectorAll(".db-tabs button").forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll(".db-tabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentType = btn.dataset.type;
      expandedAll = false;
      renderList();
    };
  });

  // Expand all
  modal.querySelector(".db-expand-all").onclick = () => {
    expandedAll = !expandedAll;
    renderList();
  };

  // Search
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
    details.style.display = details.style.display === "none" ? "block" : "none";
  };

  card.onclick = () => {
    details.style.display = details.style.display === "none" ? "block" : "none";
  };

  card.appendChild(details);

  return card;
}

/* =========================================================
   ICON HANDLING (DB ONLY)
   ========================================================= */

function createEntryIcon(entry) {
  const iconData = entry.icon || fallbackIcon;
  if (!iconData) return null;

  return createDbIconCanvas({
    texture: iconData.texture,
    sourcerect: iconData.sourcerect,
    size: 28
  });
}
