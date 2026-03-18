// services/db/db-panel.js
// Database panel (DB)
// Uses inline canvas-based icon rendering (legacy-equivalent)

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
let controlsCollapsed = false;
let fallbackIcon = null;
let hasOpenedDatabasePanel = false;
let virtualState = null;

const DEFAULT_ICON_SIZE = 36;
const SCALE_LEVELS = [0.9, 1, 1.1];
const STORAGE_KEY = "dbPanelPrefs";
export const DB_PANEL_VERSION = "2026-02-10";

/* =========================================================
   PUBLIC API
   ========================================================= */

export async function openDatabasePanel() {
  try {
    if (!modalEl) {
      modalEl = buildModal();
      document.body.appendChild(modalEl);

      showLoadingState(true);
      await DB.loadAfflictions();
      prepareFallbackIcon();
      showLoadingState(false);
    }

    if (!hasOpenedDatabasePanel) {
      controlsCollapsed = false;
      updateControlsState();
      hasOpenedDatabasePanel = true;
    }

    modalEl.style.display = "block";
    modalEl.focus();
    await ensureCurrentTypeLoaded();
    renderList();
  } catch (err) {
    console.error(err);
    showError(t("failedLoadDatabase"));
  }
}

export function closeDatabasePanel() {
  if (modalEl) {
    modalEl.style.display = "none";
  }
}

export function setDatabaseLanguage(lang) {
  setLanguage(lang);
  if (!modalEl) return;

  updateLocalizedLabels();
  updateSortButton();
  setScaleLevel(SCALE_LEVELS[scaleIndex]);
  updateCompactState();
  updateCount();
  renderFilters();
  updateCardLocalization();
}

/* =========================================================
   UI INIT
   ========================================================= */

function buildModal() {
  const modal = document.createElement("div");
  modal.className = "db-modal";
  modal.tabIndex = -1;

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
            <option value="en">EN</option>
            <option value="ru">RU</option>
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
        <div class="db-legend-panel" aria-label="Database controls">
          <div class="db-legend-title">
            <span data-l10n="legendTitle"></span>
            <button class="db-controls-toggle" type="button" data-l10n-title="legendToggleTitle" aria-pressed="false">⟨⟨</button>
          </div>
          <div class="db-legend-content">
            <div class="db-legend-row" data-l10n="legendSearch"></div>
            <div class="db-legend-row" data-l10n="legendSort"></div>
            <div class="db-legend-row" data-l10n="legendScale"></div>
            <div class="db-legend-row" data-l10n="legendCompact"></div>
            <div class="db-legend-row" data-l10n="legendCopy"></div>
          </div>
        </div>
        <div class="db-content">
          <div class="db-list"></div>
        </div>
      </div>
    </div>
  `;

  bindModalEvents(modal);
  loadPrefs();

  updateLocalizedLabels(modal);
  updateSortButton(modal);
  setScaleLevel(SCALE_LEVELS[scaleIndex], modal);
  updateCompactState(modal);
  updateControlsState(modal);
  renderFilters();
  updateCount();

  return modal;
}

function bindModalEvents(modal) {
  modal.querySelector(".db-backdrop").onclick = closeDatabasePanel;
  modal.querySelector(".db-close").onclick = closeDatabasePanel;

  modal.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeDatabasePanel();
    }
  });

  modal.querySelectorAll(".db-tabs button").forEach(btn => {
    btn.onclick = () => {
      modal.querySelectorAll(".db-tabs button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      currentType = btn.dataset.type;
      expandedAll = false;
      showLoadingState(true);
      ensureCurrentTypeLoaded().then(() => {
        showLoadingState(false);
        renderFilters();
        updateCount();
        renderList();
      }).catch(() => showLoadingState(false));
    };
  });

  modal.querySelector(".db-expand-all").onclick = () => {
    expandedAll = !expandedAll;
    if (!setAllDetailsVisibility(expandedAll)) {
      renderList();
    }
  };

  modal.querySelector(".db-sort").onclick = () => {
    sortMode = nextSortMode(sortMode);
    updateSortButton();
    savePrefs();
    renderList();
  };

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

  modal.querySelector(".db-search").oninput = e => {
    searchQuery = normalizeQuery(e.target.value);
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(renderList, 200);
  };

  modal.querySelector(".db-search").onkeydown = e => {
    if (e.key === "Escape") {
      e.target.value = "";
      searchQuery = "";
      renderList();
    }
  };

  modal.querySelector(".db-controls-toggle").onclick = () => {
    controlsCollapsed = !controlsCollapsed;
    updateControlsState();
    savePrefs();
  };

  const langSelect = modal.querySelector(".db-language");
  langSelect.value = getLanguage();
  langSelect.onchange = () => setDatabaseLanguage(langSelect.value);
}

function showLoadingState(isLoading) {
  if (!modalEl) return;
  const windowEl = modalEl.querySelector(".db-window");
  if (!windowEl) return;
  windowEl.classList.toggle("db-loading", isLoading);
}

function prepareFallbackIcon() {
  const concealed = DB.getById("afflictions", "concealed");
  if (!concealed || !concealed.icon) return;

  fallbackIcon = {
    texture: concealed.icon.texture,
    sourcerect: concealed.icon.sourcerect
  };
}

/* =========================================================
   RENDERING
   ========================================================= */

function renderList() {
  if (!modalEl) return;

  const listEl = modalEl.querySelector(".db-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  const entries = DB.getAll(currentType);
  if (!entries.length) {
    listEl.innerHTML = `<div class="db-empty">${t("noEntries")}</div>`;
    updateCount(0);
    return;
  }

  const filtered = filterEntries(entries, searchQuery || "");
  if (!filtered.length) {
    listEl.innerHTML = `<div class="db-empty">${t("nothingFound")}</div>`;
    updateCount(0);
    return;
  }

  const sorted = DB.sort(filtered, sortMode);
  renderVirtualList(sorted, listEl);
  updateCount(sorted.length);
}

function renderVirtualList(sortedEntries, listEl) {
  virtualState = null;
  for (const entry of sortedEntries) {
    listEl.appendChild(buildEntryCard(entry));
  }
}

async function ensureCurrentTypeLoaded() {
  if (currentType === 'items') return DB.loadItems();
  if (currentType === 'creatures') return DB.loadCreatures();
  return DB.loadAfflictions();
}

function buildEntryCard(entry) {
  if (currentType === "afflictions") return buildEffectCard(entry);
  if (currentType === "creatures") return buildSimpleCard(entry);
  return buildSimpleCard(entry);
}

function buildSimpleCard(entry) {
  const { card, header, copyBtn } = buildBaseCard(entry);
  header.appendChild(copyBtn);
  card.appendChild(header);
  card.classList.add("db-entry-simple");
  return card;
}

function buildEffectCard(entry) {
  const { card, header, copyBtn } = buildBaseCard(entry);

  const expandBtn = document.createElement("button");
  expandBtn.className = "db-expand-btn";
  expandBtn.textContent = "ⓘ";
  expandBtn.title = t("expandAll");

  header.appendChild(copyBtn);
  card.appendChild(header);

  const footer = document.createElement("div");
  footer.className = "db-entry-footer";

  const previewTags = buildTags(entry, { compact: true });
  if (previewTags) {
    footer.appendChild(previewTags);
  } else {
    const spacer = document.createElement("div");
    spacer.className = "db-tags db-tags-compact db-tags-empty";
    footer.appendChild(spacer);
  }

  footer.appendChild(expandBtn);
  card.appendChild(footer);

  const details = document.createElement("div");
  details.className = "db-entry-details";
  details.style.display = expandedAll ? "block" : "none";

  details.appendChild(createDetailRow("typeLabel", entry.type ?? "-"));
  details.appendChild(createDetailRow("maxStrengthLabel", entry.maxstrength ?? "-"));
  details.appendChild(createDetailRow("limbSpecificLabel", entry.limbspecific, true));
  details.appendChild(createDetailRow("isBuffLabel", entry.isbuff, true));

  const desc = document.createElement("div");
  desc.className = "db-description";
  desc.textContent = entry.description || t("descriptionMissing");
  details.appendChild(desc);

  expandBtn.onclick = e => {
    e.stopPropagation();
    toggleDetails(details);
  };
  card.onclick = () => toggleDetails(details);

  card.appendChild(details);
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
  titleWrap.className = "db-entry-title-wrap";

  const title = document.createElement("div");
  title.className = "db-entry-title";
  applyHighlight(title, entry.name || entry.id);

  const id = document.createElement("div");
  id.className = "db-entry-id";
  applyHighlight(id, entry.id);

  titleWrap.appendChild(title);
  titleWrap.appendChild(id);
  header.appendChild(titleWrap);

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

  return { card, header, copyBtn };
}

function createDetailRow(labelKey, value, isBoolean = false) {
  const row = document.createElement("div");
  row.className = "db-row";

  const label = document.createElement("strong");
  label.dataset.l10n = labelKey;
  label.textContent = t(labelKey);

  const valueSpan = document.createElement("span");
  valueSpan.className = "db-row-value";

  if (isBoolean) {
    valueSpan.dataset.value = value === undefined ? "unset" : value ? "true" : "false";
    valueSpan.textContent = formatBooleanValue(value);
  } else {
    valueSpan.textContent = value ?? "-";
  }

  row.appendChild(label);
  row.appendChild(document.createTextNode(": "));
  row.appendChild(valueSpan);
  return row;
}

function formatBooleanValue(value) {
  if (value === undefined) return "-";
  return value ? t("yes") : t("no");
}

function toggleDetails(details) {
  details.style.display = details.style.display === "none" ? "block" : "none";
}

function buildTags(entry, options = {}) {
  const { compact = false } = options;
  const tags = new Set();
  const primary = ["DAMAGE", "BURN", "STATUS", "BUFF", "DEBUFF", "POISON"];

  if (entry.type) tags.add(String(entry.type).toUpperCase());
  if (entry.isbuff) tags.add("BUFF");
  if (entry.limbspecific) tags.add("LIMB");
  if (Array.isArray(entry.tags)) {
    entry.tags.forEach(tag => tags.add(String(tag).toUpperCase()));
  }
  if (entry.category) tags.add(String(entry.category).toUpperCase());

  if (!tags.size) return null;

  const wrap = document.createElement("div");
  wrap.className = compact ? "db-tags db-tags-compact" : "db-tags";

  if (!compact) {
    const label = document.createElement("div");
    label.className = "db-tags-label";
    label.textContent = t("tagsLabel");
    wrap.appendChild(label);
  }

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
    el.onclick = event => {
      event.stopPropagation();
      applyTagQuickSearch(tag);
    };
    list.appendChild(el);
  });

  wrap.appendChild(list);
  return wrap;
}

/* =========================================================
   FILTERS / SORT / LOCALIZATION
   ========================================================= */

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

function filterEntries(entries, searchValue) {
  let filtered = entries;

  if (searchValue) {
    filtered = filtered.filter(entry => {
      const name = String(entry.name || "").toLowerCase();
      const id = String(entry.id || "").toLowerCase();
      return (
        name.includes(searchValue) ||
        id.includes(searchValue) ||
        entryMatchesTag(entry, searchValue)
      );
    });
  }

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
    "name-asc": "A-Z",
    "name-desc": "Z-A"
  };

  btn.dataset.sortMode = sortMode;
  btn.textContent = labelMap[sortMode] || "A-Z";
}

function nextSortMode(mode) {
  return mode === "name-asc" ? "name-desc" : "name-asc";
}

function setScaleLevel(scale, root = modalEl) {
  if (!root) return;

  const windowEl = root.querySelector(".db-window");
  if (windowEl) {
    windowEl.style.setProperty("--db-scale", String(scale));
  }

  const scaleBtn = root.querySelector(".db-scale");
  if (scaleBtn) {
    const percent = Math.round(scale * 100);
    scaleBtn.textContent = t("scaleValue", `${percent}%`).replace("{value}", `${percent}%`);
  }
}

function updateCompactState(root = modalEl) {
  if (!root) return;

  const windowEl = root.querySelector(".db-window");
  if (windowEl) {
    windowEl.classList.toggle("db-compact", isCompact);
  }

  const compactBtn = root.querySelector("button.db-compact");
  if (compactBtn) {
    compactBtn.textContent = t("compactLabel");
    compactBtn.classList.toggle("active", isCompact);
    compactBtn.setAttribute("aria-pressed", String(isCompact));
  }
}

function updateControlsState(root = modalEl) {
  if (!root) return;

  const body = root.querySelector(".db-body");
  const toggle = root.querySelector(".db-controls-toggle");
  if (!body || !toggle) return;

  body.classList.toggle("db-controls-collapsed", controlsCollapsed);
  toggle.setAttribute("aria-pressed", String(controlsCollapsed));
  toggle.setAttribute("aria-label", controlsCollapsed ? "Expand controls" : "Collapse controls");
  toggle.textContent = controlsCollapsed ? "⟩" : "⟨";
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
    const key = value.dataset.value;
    if (!key) return;

    if (key === "unset") {
      value.textContent = "-";
    } else {
      value.textContent = key === "true" ? t("yes") : t("no");
    }
  });
}

function applyHighlight(element, text) {
  if (!element) return;

  const query = searchQuery.trim();
  const source = String(text || "");
  if (!query) {
    element.textContent = source;
    return;
  }

  const lower = source.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);

  if (idx === -1) {
    element.textContent = source;
    return;
  }

  element.textContent = "";
  element.appendChild(document.createTextNode(source.slice(0, idx)));

  const match = document.createElement("span");
  match.className = "db-highlight";
  match.textContent = source.slice(idx, idx + q.length);
  element.appendChild(match);

  element.appendChild(document.createTextNode(source.slice(idx + q.length)));
}

function setAllDetailsVisibility(isVisible) {
  if (!modalEl) return false;

  const details = modalEl.querySelectorAll(".db-entry-details");
  if (!details.length) return false;

  details.forEach(el => {
    el.style.display = isVisible ? "block" : "none";
  });
  return true;
}

function normalizeQuery(value) {
  return String(value || "").trim().toLowerCase();
}

function applyTagQuickSearch(tag) {
  searchQuery = normalizeQuery(tag);

  const searchInput = modalEl?.querySelector(".db-search");
  if (searchInput) {
    searchInput.value = searchQuery;
  }

  renderList();
}

function updateCount(countOverride = null) {
  if (!modalEl) return;
  const countEl = modalEl.querySelector(".db-count");
  if (!countEl) return;

  let count = countOverride;
  if (count === null) {
    try {
      count = DB.getAll(currentType).length;
    } catch {
      count = 0;
    }
  }

  countEl.textContent = t("countValue", `${count}`).replace("{count}", `${count}`);
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

  if (!parts || parts.length !== 4 || parts.some(n => !Number.isFinite(n))) {
    return null;
  }

  const [x, y, w, h] = parts;
  if (w <= 0 || h <= 0) return null;

  return { x, y, w, h };
}

function resolveIconTint(iconData = {}) {
  const explicit = String(iconData?.color || "").split(",").map(v => Number(v.trim()));
  if (explicit.length >= 3 && explicit.every(v => Number.isFinite(v))) {
    const [r, g, b] = explicit;
    return {
      type: "solid",
      color: `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
    };
  }

  const role = String(iconData.fixedColorKey || iconData.fixedcolorkey || iconData.palette || iconData.role || iconData.type || "").toLowerCase();
  const palettes = {
    buff: ["rgb(95, 177, 123)", "rgb(111, 223, 149)", "rgb(155, 241, 176)"],
    debuff: ["rgb(205, 103, 124)", "rgb(230, 124, 149)", "rgb(249, 166, 185)"],
    damage: ["rgb(203, 89, 89)", "rgb(231, 116, 116)", "rgb(250, 151, 151)"],
    mental: ["rgb(137, 102, 215)", "rgb(166, 128, 241)", "rgb(197, 164, 255)"],
    electric: ["rgb(97, 146, 232)", "rgb(121, 173, 247)", "rgb(168, 206, 255)"],
    status: ["rgb(124, 167, 214)", "rgb(154, 194, 237)", "rgb(194, 218, 250)"],
    neutral: ["rgb(123, 156, 186)", "rgb(153, 186, 217)", "rgb(188, 213, 236)"]
  };
  const [low, mid, high] = palettes[role] || palettes.neutral;

  return {
    type: "gradient",
    colors: [low, mid, high]
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

  if (tint.type === "solid") {
    return tint.color || "transparent";
  }

  return tint.color || "transparent";
}

function getCssRgb(varName, fallback = null) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!raw) return fallback;
  if (raw.startsWith("rgb")) return raw;

  const parts = raw.split(" ").filter(Boolean);
  if (parts.length < 3) return fallback;

  return `rgb(${parts.slice(0, 3).join(", ")})`;
}

/* =========================================================
   PERSISTENCE
   ========================================================= */

function savePrefs() {
  const prefs = { sortMode, scaleIndex, isCompact, activeRoleFilter, controlsCollapsed };
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
    if (typeof prefs.controlsCollapsed === "boolean") {
      controlsCollapsed = prefs.controlsCollapsed;
    }
  } catch (err) {
    console.warn("Failed to load DB prefs", err);
  }
}
