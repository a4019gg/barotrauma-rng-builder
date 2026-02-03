// services/db/db-panel.js
// Database panel (DB)
// Uses inline canvas-based icon rendering (legacy-equivalent)
//
// NOTES:
// - Uses DB-local localization module for labels and tooltips
// - Canvas is used intentionally for DB preview
// - Node UI icon renderer is NOT used here

import * as DB from "./database.js";
import { getLanguage, setLanguage, t } from "./db-loc.js";
import { showError } from "../../ui/popup.js";

/* =========================================================
   STATE
   ========================================================= */

let modalEl = null;
let currentType = "afflictions";
let expandedAll = false;
let sortMode = "name-asc";

// fallback icon (concealed)
let fallbackIcon = null;

const DEFAULT_ICON_SIZE = 28;

/* =========================================================
   PUBLIC API
   ========================================================= */

export async function openDatabasePanel() {
  try {
    if (!modalEl) {
      await DB.load();
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

export function setDatabaseLanguage(lang) {
  setLanguage(lang);
  if (modalEl) {
    updateLocalizedLabels();
    renderList();
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
          <button data-type="afflictions" class="active" data-l10n="effects"></button>
          <button data-type="items" data-l10n="items"></button>
          <button data-type="creatures" data-l10n="creatures"></button>
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
        <input class="db-search" placeholder="" data-l10n-placeholder="searchPlaceholder" />
        <button class="db-sort" title="" data-l10n-title="sortLabel"></button>
        <button class="db-expand-all" title="" data-l10n-title="expandAll">⧉</button>
      </div>

      <div class="db-content">
        <div class="db-list"></div>
        <div class="db-legend" aria-label="Legend">
          <div class="db-legend-title" data-l10n="legendTitle"></div>
          <div class="db-legend-row" data-l10n="legendExpand"></div>
          <div class="db-legend-row" data-l10n="legendDetails"></div>
          <div class="db-legend-row" data-l10n="legendCopy"></div>
        </div>
      </div>
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

  // sort
  modal.querySelector(".db-sort").onclick = () => {
    sortMode = nextSortMode(sortMode);
    updateSortButton();
    renderList();
  };

  // search
  modal.querySelector(".db-search").oninput = () => renderList();

  // language
  const langSelect = modal.querySelector(".db-language");
  langSelect.value = getLanguage();
  langSelect.onchange = () => setDatabaseLanguage(langSelect.value);

  updateLocalizedLabels();
  updateSortButton();

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
    listEl.innerHTML = `<div class="db-empty">${t("noEntries")}</div>`;
    return;
  }

  const filtered = entries.filter(e =>
    e.name?.toLowerCase().includes(searchValue) ||
    e.id?.toLowerCase().includes(searchValue)
  );

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="db-empty">${t("nothingFound")}</div>`;
    return;
  }

  const sorted = DB.sort(filtered, sortMode);
  for (const entry of sorted) {
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

  const copyBtn = document.createElement("button");
  copyBtn.className = "db-copy-btn";
  copyBtn.textContent = t("copyId");
  copyBtn.onclick = e => {
    e.stopPropagation();
    if (!entry.id) return;
    navigator.clipboard?.writeText(entry.id);
  };

  titleWrap.appendChild(title);
  titleWrap.appendChild(id);
  header.appendChild(titleWrap);

  const expandBtn = document.createElement("button");
  expandBtn.className = "db-expand-btn";
  expandBtn.textContent = "ⓘ";
  header.appendChild(expandBtn);

  header.appendChild(copyBtn);

  card.appendChild(header);

  const details = document.createElement("div");
  details.className = "db-entry-details";
  details.style.display = expandedAll ? "block" : "none";

  details.innerHTML = `
    <div class="db-row"><strong>${t("typeLabel")}:</strong> ${entry.type ?? "-"}</div>
    <div class="db-row"><strong>${t("maxStrengthLabel")}:</strong> ${entry.maxstrength ?? "-"}</div>
    <div class="db-row"><strong>${t("limbSpecificLabel")}:</strong> ${
      entry.limbspecific === undefined
        ? "-"
        : entry.limbspecific
          ? t("yes")
          : t("no")
    }</div>
    <div class="db-row"><strong>${t("isBuffLabel")}:</strong> ${
      entry.isbuff === undefined
        ? "-"
        : entry.isbuff
          ? t("yes")
          : t("no")
    }</div>
    <div class="db-description">${entry.description || ""}</div>
  `;

  const tags = buildTags(entry);
  if (tags) details.appendChild(tags);

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

function buildTags(entry) {
  const tags = new Set();
  const primary = ["DAMAGE", "STATUS", "BUFF", "DEBUFF", "POISON"];

  if (entry.type) tags.add(String(entry.type).toUpperCase());
  if (entry.isbuff) tags.add("BUFF");
  if (entry.limbspecific) tags.add("LIMB");
  if (Array.isArray(entry.tags)) {
    entry.tags.forEach(tag => tags.add(String(tag).toUpperCase()));
  }
  if (entry.category) tags.add(String(entry.category).toUpperCase());

  if (tags.size === 0) return null;

  const wrap = document.createElement("div");
  wrap.className = "db-tags";

  const label = document.createElement("div");
  label.className = "db-tags-label";
  label.textContent = t("tagsLabel");
  wrap.appendChild(label);

  const list = document.createElement("div");
  list.className = "db-tags-list";

  const sorted = [
    ...primary.filter(tag => tags.has(tag)),
    ...[...tags].filter(tag => !primary.includes(tag))
  ];

  sorted.forEach(tag => {
    const el = document.createElement("span");
    el.className = "db-tag";
    el.textContent = tag;
    list.appendChild(el);
  });

  wrap.appendChild(list);
  return wrap;
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

function updateLocalizedLabels() {
  if (!modalEl) return;
  modalEl.querySelectorAll("[data-l10n]").forEach(el => {
    const key = el.dataset.l10n;
    if (key) el.textContent = t(key);
  });
  modalEl.querySelectorAll("[data-l10n-placeholder]").forEach(el => {
    const key = el.dataset.l10nPlaceholder;
    if (key) el.placeholder = t(key);
  });
  modalEl.querySelectorAll("[data-l10n-title]").forEach(el => {
    const key = el.dataset.l10nTitle;
    if (key) el.title = t(key);
  });
}

function updateSortButton() {
  if (!modalEl) return;
  const btn = modalEl.querySelector(".db-sort");
  if (!btn) return;

  const labelMap = {
    "name-asc": t("sortNameAsc"),
    "name-desc": t("sortNameDesc"),
    "id-asc": t("sortIdAsc"),
    "id-desc": t("sortIdDesc")
  };

  btn.textContent = labelMap[sortMode] || t("sortLabel");
}

function nextSortMode(mode) {
  switch (mode) {
    case "name-asc":
      return "name-desc";
    case "name-desc":
      return "id-asc";
    case "id-asc":
      return "id-desc";
    case "id-desc":
    default:
      return "name-asc";
  }
}
