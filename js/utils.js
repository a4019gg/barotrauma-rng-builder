// js/utils.js — 0A2.0.702 — UTILITIES + LOCALIZATION + UI SETTINGS + TOOLTIPS
// NOTE: utils — ЧИСТЫЙ СЛОЙ. НИКАКОЙ ЛОГИКИ НОД / DnD / XML.

window.UTILS_VERSION = "0A2.0.702";

/* =========================
   LOCALIZATION
   ========================= */

let currentLang = "en";
const L = {};

function loc(key, fallback = "") {
  if (L[key]) return L[key];
  console.error(`[i18n] MISSING LOC KEY: "${key}"`);
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

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem("lang", lang);

  const dict = lang === "ru" ? window.LANG_RU : window.LANG_EN;
  if (!dict) {
    console.error("[i18n] Language pack not found:", lang);
    return;
  }

  Object.keys(L).forEach(k => delete L[k]);
  Object.assign(L, dict);

  applyLocalization();

  const sel = document.getElementById("lang-select");
  if (sel) sel.value = lang;
}

/* =========================
   THEMES / UI SETTINGS
   ========================= */

function setTheme(theme) {
  document.body.dataset.theme = theme;
  localStorage.setItem("theme", theme);

  const s = document.getElementById("theme-style");
  if (!s) {
    console.error("[theme] <link id='theme-style'> not found");
    return;
  }

  const themes = {
    dark: "css/themes/dark.css",
    light: "css/themes/light.css",
    "flopstyle-dark": "css/themes/flopstyle-dark.css",
    "turbo-vision-dark": "css/themes/turbo-vision-dark.css"
  };

  if (!themes[theme]) {
    console.error("[theme] Unknown theme:", theme);
  }

  s.href = themes[theme] || themes.dark;

  const sel = document.getElementById("theme-select");
  if (sel) sel.value = theme;
}

function setUIScale(val) {
  document.body.dataset.uiScale = val;
  localStorage.setItem("uiScale", val);

  const sel = document.getElementById("scale-select");
  if (sel) sel.value = val;
}

function setNodeDensity(val) {
  document.body.dataset.nodeDensity = val;
  localStorage.setItem("nodeDensity", val);

  const sel = document.getElementById("density-select");
  if (sel) sel.value = val;
}

function toggleShadows(on) {
  document.body.dataset.nodeShadows = on ? "high" : "off";
  localStorage.setItem("nodeShadows", on.toString());
}

function toggleGrid(on) {
  document.body.dataset.bgGrid = on ? "visible" : "off";
  localStorage.setItem("bgGrid", on.toString());
}

function toggleSnap(on) {
  localStorage.setItem("snapToGrid", on.toString());
}

/* =========================
   XML / BEHAVIOR
   ========================= */

function setXMLFormat(val) {
  localStorage.setItem("xmlFormat", val);
}

function toggleValidation(on) {
  localStorage.setItem("validateXML", on.toString());
}

function toggleCheckDuplicateIDs(on) {
  localStorage.setItem("checkDuplicateIDs", on.toString());
}

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
   DATALIST (NO FALLBACKS)
   ========================= */
/*
  IMPORTANT:
  utils НЕ содержит fallback-данных.
  populateDatalist должен вызываться ТОЛЬКО после готовности DB.
*/

function populateDatalist() {
  const datalist = document.getElementById("item-datalist");
  if (!datalist) {
    console.error("[datalist] #item-datalist not found");
    return;
  }

  if (!window.dbManager || !window.dbManager.isReady) {
    console.error("[datalist] DB not ready. No fallback will be used.");
    return;
  }

  datalist.innerHTML = "";

  const ids = window.dbManager.getAllIds?.();
  if (!Array.isArray(ids)) {
    console.error("[datalist] DB returned invalid ID list");
    return;
  }

  ids.forEach(id => {
    const opt = document.createElement("option");
    opt.value = id;
    datalist.appendChild(opt);
  });
}

/* =========================
   TOOLTIP SYSTEM
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

document.addEventListener("focusout", hideTooltip);
window.addEventListener("scroll", positionTooltip);
window.addEventListener("resize", positionTooltip);

/* =========================
   EXPORTS
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
