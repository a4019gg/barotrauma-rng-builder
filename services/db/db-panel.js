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
import { showError, showSuccess } from "../../ui/popup.js";

/* =========================================================
   STATE
   ========================================================= */

let modalEl = null;
let currentType = "afflictions";
let expandedAll = false;
let sortMode = "name-asc";
let scaleIndex = 1;
let isCompact = false;
let searchTimer = null;
let searchQuery = "";
let activeRoleFilter = "all";

// fallback icon (concealed)
let fallbackIcon = null;

const DEFAULT_ICON_SIZE = 36;
const SCALE_LEVELS = [0.9, 1, 1.1];
const STORAGE_KEY = "dbPanelPrefs";
export const DB_PANEL_VERSION = "2025-01-11";

function showLoadingState(isLoading) {
  if (!modalEl) return;
  const windowEl = modalEl.querySelector(".db-window");
  if (!windowEl) return;
  windowEl.classList.toggle("db-loading", isLoading);
}

function renderFilters() {
  if (!modalEl) return;
  const filtersEl = modalEl.querySelector(".db-filters");
  if (!filtersEl) return;

  filtersEl.innerHTML = "";
  const group = document.createElement("div");
  group.className = "db-filter-group";

  if (currentType === "afflictions") {
    ["all", "buff", "debuff", "damage", "status", "mental", "electric"].forEach(role => {
      const btn = document.createElement("button");
      btn.className = "db-filter-btn";
      btn.textContent = t(`filter-${role}`);
      btn.dataset.role = role;
      btn.classList.toggle("active", activeRoleFilter === role);
      btn.onclick = () => {
        activeRoleFilter = role;
        savePrefs();
        renderFilters();
        renderList();
      };
      group.appendChild(btn);
    });
  }

  filtersEl.appendChild(group);
}

/* =========================================================
   PUBLIC API
   ========================================================= */

export async function openDatabasePanel() {
  try {
    if (!modalEl) {
      modalEl = buildModal();
      document.body.appendChild(modalEl);
      showLoadingState(true);
      await DB.load();
      prepareFallbackIcon();
      showLoadingState(false);
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
    updateSortButton();
    setScaleLevel(SCALE_LEVELS[scaleIndex]);
    updateCompactState();
    updateCount();
    renderFilters();
    updateCardLocalization();
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
        <button class="db-scale" title="" data-l10n-title="scaleLabel"></button>
        <button class="db-compact" title="" data-l10n-title="compactLabel"></button>
        <button class="db-expand-all" title="" data-l10n-title="expandAll">⧉</button>
        <div class="db-count" data-l10n="countLabel"></div>
      </div>

      <div class="db-filters"></div>

      <div class="db-body">
        <div class="db-legend-panel" aria-label="Controls">
          <div class="db-legend-title" data-l10n="legendTitle"></div>
          <div class="db-legend-row" data-l10n="legendSearch"></div>
          <div class="db-legend-row" data-l10n="legendSort"></div>
          <div class="db-legend-row" data-l10n="legendScale"></div>
          <div class="db-legend-row" data-l10n="legendCompact"></div>
          <div class="db-legend-row" data-l10n="legendCopy"></div>
        </div>
        <div class="db-content">
          <div class="db-list"></div>
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
      renderFilters();
      updateCount();
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
    savePrefs();
    renderList();
  };

  // scale
  modal.querySelector(".db-scale").onclick = () => {
    scaleIndex = (scaleIndex + 1) % SCALE_LEVELS.length;
    setScaleLevel(SCALE_LEVELS[scaleIndex]);
    savePrefs();
  };

  modal.querySelector(".db-compact").onclick = () => {
    isCompact = !isCompact;
    updateCompactState();
    savePrefs();
  };

  // search
  modal.querySelector(".db-search").oninput = e => {
    searchQuery = e.target.value.toLowerCase();
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      renderList();
    }, 200);
  };

  // language
  const langSelect = modal.querySelector(".db-language");
  langSelect.value = getLanguage();
  langSelect.onchange = () => setDatabaseLanguage(langSelect.value);

  loadPrefs();
  updateLocalizedLabels(modal);
  updateSortButton(modal);
  setScaleLevel(SCALE_LEVELS[scaleIndex], modal);
  updateCompactState(modal);
  renderFilters();
  updateCount();

  return modal;
}

/* =========================================================
   RENDER LIST
   ========================================================= */

function renderList() {
  const listEl = modalEl.querySelector(".db-list");
  const searchValue = searchQuery || "";

  listEl.innerHTML = "";

  const entries = DB.getAll(currentType);
  const filteredByType = filterEntries(entries, searchValue);
  if (!entries || entries.length === 0) {
    listEl.innerHTML = `<div class="db-empty">${t("noEntries")}</div>`;
    return;
  }

  if (filteredByType.length === 0) {
    listEl.innerHTML = `<div class="db-empty">${t("nothingFound")}</div>`;
    updateCount(0);
    return;
  }

  const sorted = DB.sort(filteredByType, sortMode);
  for (const entry of sorted) {
    listEl.appendChild(buildEntryCard(entry));
  }
  updateCount(sorted.length);
}

/* =========================================================
   ENTRY CARD
   ========================================================= */

function buildEntryCard(entry) {
  switch (currentType) {
    case "afflictions":
      return buildEffectCard(entry);
    case "items":
      return buildItemCard(entry);
    case "creatures":
      return buildCreatureCard(entry);
    default:
      return buildItemCard(entry);
  }
}

function buildEffectCard(entry) {
  const { card, header, copyBtn, titleWrap } = buildBaseCard(entry);

  const expandBtn = document.createElement("button");
  expandBtn.className = "db-expand-btn";
  expandBtn.textContent = "ⓘ";
  header.appendChild(expandBtn);

  header.appendChild(copyBtn);
  card.appendChild(header);

  const details = document.createElement("div");
  details.className = "db-entry-details";
  details.style.display = expandedAll ? "block" : "none";

  details.appendChild(createDetailRow("typeLabel", entry.type ?? "-"));
  details.appendChild(createDetailRow("maxStrengthLabel", entry.maxstrength ?? "-"));
  details.appendChild(createDetailRow("limbSpecificLabel", entry.limbspecific, true));
  details.appendChild(createDetailRow("isBuffLabel", entry.isbuff, true));

  const desc = document.createElement("div");
  desc.className = "db-description";
  desc.textContent = entry.description || "";
  details.appendChild(desc);

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

function createDetailRow(labelKey, value, isBoolean = false) {
  const row = document.createElement("div");
  row.className = "db-row";

  const label = document.createElement("strong");
  label.dataset.l10n = labelKey;
  label.textContent = t(labelKey);

  const spacer = document.createTextNode(": ");
  const valueSpan = document.createElement("span");
  valueSpan.className = "db-row-value";

  if (isBoolean) {
    valueSpan.dataset.value = value === undefined ? "unset" : value ? "true" : "false";
    valueSpan.textContent = formatBooleanValue(value);
  } else {
    valueSpan.textContent = value ?? "-";
  }

  row.appendChild(label);
  row.appendChild(spacer);
  row.appendChild(valueSpan);
  return row;
}

function formatBooleanValue(value) {
  if (value === undefined) return "-";
  return value ? t("yes") : t("no");
}

function buildItemCard(entry) {
  const { card, header, copyBtn } = buildBaseCard(entry);
  header.appendChild(copyBtn);
  card.appendChild(header);
  card.classList.add("db-entry-simple");
  return card;
}

function buildCreatureCard(entry) {
  const { card, header, copyBtn } = buildBaseCard(entry);
  header.appendChild(copyBtn);
  card.appendChild(header);
  card.classList.add("db-entry-simple");
  return card;
}

function buildBaseCard(entry) {
  const card = document.createElement("div");
  card.className = "db-entry";

  const header = document.createElement("div");
  header.className = "db-entry-header";

  const icon = createEntryIcon(entry);
  if (icon) header.appendChild(icon);

  const titleWrap = document.createElement("div");

  const title = document.createElement("div");
  title.className = "db-entry-title";
  applyHighlight(title, entry.name || entry.id);

  const id = document.createElement("div");
  id.className = "db-entry-id";
  applyHighlight(id, entry.id);

  const copyBtn = document.createElement("button");
  copyBtn.className = "db-copy-btn";
  copyBtn.textContent = t("copyId");
  copyBtn.onclick = async e => {
    e.stopPropagation();
    if (!entry.id) return;
    try {
      await navigator.clipboard?.writeText(entry.id);
      showSuccess(t("copyIdSuccess"));
    } catch (err) {
      console.warn(err);
      showError(t("copyIdError"));
    }
  };

function buildEffectCard(entry) {
  const { card, header, copyBtn, titleWrap } = buildBaseCard(entry);

  return { card, header, copyBtn, titleWrap };
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
    el.dataset.tag = tag;
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
    size: DEFAULT_ICON_SIZE,
    tint: resolveIconTint(iconData)
  });
}

function createDbIconCanvas({ texture, sourcerect, size, tint }) {
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

    if (tint) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = buildTintFill(ctx, size, tint);
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 0.35;
      ctx.drawImage(img, x, y, w, h, 0, 0, size, size);
      ctx.globalAlpha = 1;
    }
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

function resolveIconTint(iconData = {}) {
  const role = String(iconData.role || iconData.type || "").toLowerCase();
  const colorMode = String(iconData.colorMode || iconData.colormode || "").toLowerCase();
  const fixedKey = String(iconData.fixedColorKey || iconData.fixedcolorkey || "").toLowerCase();
  const isDynamic = colorMode === "dynamic";

  const roleMap = {
    buff: "buff",
    debuff: "debuff",
    damage: "damage",
    status: "neutral",
    mental: "mental",
    electric: "electric",
    neutral: "neutral"
  };

  const targetRole = roleMap[fixedKey] || roleMap[role] || "neutral";

  if (isDynamic) {
    return {
      type: "gradient",
      colors: [
        getCssRgb(`--role-${targetRole}-low`),
        getCssRgb(`--role-${targetRole}-mid`),
        getCssRgb(`--role-${targetRole}-high`)
      ]
    };
  }

  return {
    type: "solid",
    color: getCssRgb(`--role-${targetRole}-mid`)
  };
}

function buildTintFill(ctx, size, tint) {
  if (!tint) return "transparent";
  if (tint.type === "gradient") {
    const [low, mid, high] = tint.colors;
    const gradient = ctx.createLinearGradient(0, 0, size, 0);
    gradient.addColorStop(0, low || "rgb(160, 160, 160)");
    gradient.addColorStop(0.5, mid || "rgb(190, 190, 190)");
    gradient.addColorStop(1, high || "rgb(210, 210, 210)");
    return gradient;
  }
  return tint.color || "transparent";
}

function getCssRgb(varName, fallback = null) {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();

  if (!raw) return fallback;
  if (raw.startsWith("rgb")) return raw;

  const parts = raw.split(" ").filter(Boolean);
  if (parts.length < 3) return fallback;

  return `rgb(${parts.slice(0, 3).join(", ")})`;
}

function updateLocalizedLabels(root = modalEl) {
  if (!root) return;
  root.querySelectorAll("[data-l10n]").forEach(el => {
    const key = el.dataset.l10n;
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll("[data-l10n-placeholder]").forEach(el => {
    const key = el.dataset.l10nPlaceholder;
    if (key) el.placeholder = t(key);
  });
  root.querySelectorAll("[data-l10n-title]").forEach(el => {
    const key = el.dataset.l10nTitle;
    if (key) el.title = t(key);
  });
}

function updateSortButton(root = modalEl) {
  if (!root) return;
  const btn = root.querySelector(".db-sort");
  if (!btn) return;

  const labelMap = {
    "name-asc": t("sortNameAsc"),
    "name-desc": t("sortNameDesc")
  };

  btn.textContent = labelMap[sortMode] || t("sortLabel");
}

function nextSortMode(mode) {
  switch (mode) {
    case "name-asc":
    default:
      return "name-desc";
    case "name-desc":
      return "name-asc";
  }
}

function setScaleLevel(scale, root = modalEl) {
  if (!root) return;
  const windowEl = root.querySelector(".db-window");
  if (!windowEl) return;

  windowEl.style.setProperty("--db-scale", String(scale));

  const scaleBtn = root.querySelector(".db-scale");
  if (scaleBtn) {
    const percent = Math.round(scale * 100);
    scaleBtn.textContent = t("scaleValue", `${percent}%`).replace("{value}", `${percent}%`);
  }
}

function updateCompactState(root = modalEl) {
  if (!root) return;
  const windowEl = root.querySelector(".db-window");
  const compactBtn = root.querySelector(".db-compact");
  if (windowEl) {
    windowEl.classList.toggle("db-compact", isCompact);
  }
  if (compactBtn) {
    compactBtn.textContent = t("compactLabel");
    compactBtn.classList.toggle("active", isCompact);
    compactBtn.setAttribute("aria-pressed", String(isCompact));
  }
}

function updateCardLocalization() {
  if (!modalEl) return;
  modalEl.querySelectorAll(".db-copy-btn").forEach(btn => {
    btn.textContent = t("copyId");
  });
  modalEl.querySelectorAll(".db-tags-label").forEach(label => {
    label.textContent = t("tagsLabel");
  });
  modalEl.querySelectorAll(".db-row-value").forEach(value => {
    if (!value.dataset.value) return;
    const key = value.dataset.value;
    if (key === "unset") {
      value.textContent = "-";
    } else {
      value.textContent = key === "true" ? t("yes") : t("no");
    }
  });
}

function applyHighlight(element, text) {
  if (!element) return;
  const query = searchQuery?.trim();
  if (!query) {
    element.textContent = text || "";
    return;
  }

  const safeText = text || "";
  const lower = safeText.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lower.indexOf(lowerQuery);

  if (index === -1) {
    element.textContent = safeText;
    return;
  }

  element.textContent = "";
  const before = document.createTextNode(safeText.slice(0, index));
  const match = document.createElement("span");
  match.className = "db-highlight";
  match.textContent = safeText.slice(index, index + lowerQuery.length);
  const after = document.createTextNode(safeText.slice(index + lowerQuery.length));
  element.appendChild(before);
  element.appendChild(match);
  element.appendChild(after);
}

function filterEntries(entries, searchValue) {
  let filtered = entries.filter(e =>
    e.name?.toLowerCase().includes(searchValue) ||
    e.id?.toLowerCase().includes(searchValue) ||
    entryMatchesTag(e, searchValue)
  );

  if (currentType === "afflictions" && activeRoleFilter !== "all") {
    filtered = filtered.filter(entry => entry.icon?.role === activeRoleFilter);
  }

  return filtered;
}

function entryMatchesTag(entry, searchValue) {
  if (!searchValue) return false;
  const tags = new Set();
  if (entry.type) tags.add(String(entry.type));
  if (entry.isbuff) tags.add("buff");
  if (entry.limbspecific) tags.add("limb");
  if (Array.isArray(entry.tags)) {
    entry.tags.forEach(tag => tags.add(String(tag)));
  }
  if (entry.category) tags.add(String(entry.category));
  return [...tags].some(tag => tag.toLowerCase().includes(searchValue));
}

function updateCount(countOverride = null) {
  if (!modalEl) return;
  const countEl = modalEl.querySelector(".db-count");
  if (!countEl) return;

  let count = countOverride;
  if (count === null) {
    try {
      count = DB.getAll(currentType).length;
    } catch (err) {
      count = 0;
    }
  }
  countEl.textContent = t("countValue", `${count}`).replace("{count}", `${count}`);
}

function savePrefs() {
  const prefs = {
    sortMode,
    scaleIndex,
    isCompact,
    activeRoleFilter
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const prefs = JSON.parse(raw);
    if (prefs.sortMode) sortMode = prefs.sortMode;
    if (typeof prefs.scaleIndex === "number") {
      scaleIndex = Math.min(Math.max(prefs.scaleIndex, 0), SCALE_LEVELS.length - 1);
    }
    if (typeof prefs.isCompact === "boolean") isCompact = prefs.isCompact;
    if (typeof prefs.activeRoleFilter === "string") activeRoleFilter = prefs.activeRoleFilter;
  } catch (err) {
    console.warn("Failed to load DB prefs", err);
  }
}
