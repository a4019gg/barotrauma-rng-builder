// js/utils.js — 0A2.0.701 — UTILITIES + LOCALIZATION + TOOLTIPS (CLEAN)

window.UTILS_VERSION = "0A2.0.701";

/* =========================
   LOCALIZATION
   ========================= */

let currentLang = "en";
const L = {};

function loc(key, fallback = "") {
  if (L[key]) return L[key];
  console.warn(`MISSING LOC KEY: "${key}"`);
  return fallback || `‹${key}›`;
}

function applyLocalization() {
  document.querySelectorAll("[data-l10n]").forEach(el => {
    const key = el.dataset.l10n;
    if (key && L[key]) {
      el.textContent = L[key];
    }
  });
}

// NEW: setLang() function
function setLang(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  const dict = lang === "ru" ? window.LANG_RU : window.LANG_EN;
  Object.assign(L, dict);

  applyLocalization();

}

/* =========================
   THEMES / UI SETTINGS
   ========================= */

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem("theme", theme);

  const s = document.getElementById("theme-style");
  if (!s) return;

  const themes = {
    dark: "css/themes/dark.css",
    light: "css/themes/light.css",
    "flopstyle-dark": "css/themes/flopstyle-dark.css",
    "turbo-vision-dark": "css/themes/turbo-vision-dark.css"
  };
  s.href = themes[theme] || themes.dark;

  const sel = document.getElementById("theme-select");
  if (sel) sel.value = theme;
}

// NEW: setLang and setTheme - now available globally
window.setLang = setLang;
window.setTheme = setTheme;

/* =========================
   SCRIPT VERSIONS
   ========================= */

function showScriptVersions() {
  const c = document.getElementById("script-versions");
  if (!c) return;

  const v = [
    { n: "main.js", v: window.MAIN_VERSION || "—" },
    { n: "db.js", v: window.DB_VERSION || "—" },
    { n: "utils.js", v: window.UTILS_VERSION || "—" },
    { n: "NodeFactory.js", v: window.NODES_VERSION || "—" },
    { n: "tree.js", v: window.TREE_VERSION || "—" },
    { n: "xml.js", v: window.XML_VERSION || "—" }
  ];

  c.innerHTML = v.map(x => `${x.n} → ${x.v}`).join("<br>");
}

/* =========================
   TOOLTIP SYSTEM (SMART)
   ========================= */

let tooltipEl = null;
let tooltipTarget = null;

function ensureTooltip() {
  if (tooltipEl) return tooltipEl;

  tooltipEl = document.createElement("div");
  tooltipEl.className = "ui-tooltip";
  tooltipEl.style.position = "fixed";
  tooltipEl.style.zIndex = 9999;
  tooltipEl.style.pointerEvents = "none";
  tooltipEl.style.opacity = "0";
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function showTooltip(target) {
  const key = target.dataset.tooltip;
  if (!key) return;

  const text = loc(key);
  if (!text) return;

  const tip = ensureTooltip();
  tip.textContent = text;
  tip.style.opacity = "1";

  tooltipTarget = target;
  positionTooltip();
}

function hideTooltip() {
  if (!tooltipEl) return;
  tooltipEl.style.opacity = "0";
  tooltipTarget = null;
}

function positionTooltip() {
  if (!tooltipEl || !tooltipTarget) return;

  const margin = 8;
  const rect = tooltipTarget.getBoundingClientRect();
  const tipRect = tooltipEl.getBoundingClientRect();

  let top = rect.bottom + margin;
  let left = rect.left;

  if (top + tipRect.height > window.innerHeight) {
    top = rect.top - tipRect.height - margin;
  }
  if (left + tipRect.width > window.innerWidth) {
    left = window.innerWidth - tipRect.width - margin;
  }
  if (left < margin) left = margin;
  if (top < margin) top = margin;

  tooltipEl.style.top = `${top}px`;
  tooltipEl.style.left = `${left}px`;
}

/* =========================
   TOOLTIP EVENTS
   ========================= */

document.addEventListener("mouseover", e => {
  const t = e.target.closest("[data-tooltip]");
  if (t) showTooltip(t);
});

document.addEventListener("mouseout", e => {
  if (tooltipTarget && !e.relatedTarget?.closest("[data-tooltip]")) {
    hideTooltip();
  }
});

document.addEventListener("focusin", e => {
  const t = e.target.closest("[data-tooltip]");
  if (t) showTooltip(t);
});

document.addEventListener("focusout", () => {
  hideTooltip();
});

window.addEventListener("scroll", positionTooltip);
window.addEventListener("resize", positionTooltip);

/* =========================
   GLOBAL INIT
   ========================= */

window.loc = loc;
window.applyLocalization = applyLocalization;

window.setLang = setLang;
window.setTheme = setTheme;

window.setUIScale = setUIScale;
window.setNodeDensity = setNodeDensity;
window.toggleShadows = toggleShadows;
window.toggleGrid = toggleGrid;
window.toggleSnap = toggleSnap;

window.setXMLFormat = setXMLFormat;
window.toggleValidation = toggleValidation;
window.toggleCheckDuplicateIDs = toggleCheckDuplicateIDs;

window.showScriptVersions = showScriptVersions;
window.populateDatalist = populateDatalist;

