// js/utils.js — 0A2.0.702
window.UTILS_VERSION = "0A2.0.702";

/* =========================
   LOCALIZATION CORE
   ========================= */

let currentLang = "en";
const L = Object.create(null);

function loc(key, fallback = "") {
  if (key in L) return L[key];
  console.warn(`[LOC] Missing key: ${key}`);
  return fallback || `‹${key}›`;
}

function applyLocalization() {
  document.querySelectorAll("[data-l10n]").forEach(el => {
    const key = el.dataset.l10n;
    if (!key) return;
    if (key in L) el.textContent = L[key];
  });
}

function setLang(lang) {
  if (!lang || lang === currentLang) return;

  const dict =
    lang === "ru" ? window.LANG_RU :
    lang === "en" ? window.LANG_EN :
    null;

  if (!dict) {
    console.error("[LOC] Language pack not found:", lang);
    return;
  }

  currentLang = lang;
  localStorage.setItem("lang", lang);

  // чисто обновляем словарь
  Object.keys(L).forEach(k => delete L[k]);
  Object.assign(L, dict);

  applyLocalization();

  // синхронизация селекта
  const sel = document.getElementById("lang-select");
  if (sel) sel.value = lang;
}

/* =========================
   THEME / UI SETTINGS
   ========================= */

function setTheme(theme) {
  if (!theme) return;

  document.body.dataset.theme = theme;
  localStorage.setItem("theme", theme);

  const link = document.getElementById("theme-style");
  if (link) {
    const map = {
      dark: "css/themes/dark.css",
      light: "css/themes/light.css",
      "system-dark": "css/themes/system-dark.css",
      "flopstyle-dark": "css/themes/flopstyle-dark.css",
      "turbo-vision-dark": "css/themes/turbo-vision-dark.css"
    };
    link.href = map[theme] || map.dark;
  }

  const sel = document.getElementById("theme-select");
  if (sel) sel.value = theme;
}

function setUIScale(val) {
  if (!val) return;
  document.body.dataset.uiScale = val;
  localStorage.setItem("uiScale", val);

  const sel = document.getElementById("scale-select");
  if (sel) sel.value = val;
}

function setNodeDensity(val) {
  if (!val) return;
  document.body.dataset.nodeDensity = val;
  localStorage.setItem("nodeDensity", val);

  const sel = document.getElementById("density-select");
  if (sel) sel.value = val;
}

function toggleShadows(on) {
  document.body.dataset.nodeShadows = on ? "high" : "off";
  localStorage.setItem("nodeShadows", String(on));
}

function toggleGrid(on) {
  document.body.dataset.bgGrid = on ? "visible" : "off";
  localStorage.setItem("bgGrid", String(on));
}

function toggleSnap(on) {
  localStorage.setItem("snapToGrid", String(on));
}

function setXMLFormat(val) {
  localStorage.setItem("xmlFormat", val);
}

function toggleValidation(on) {
  localStorage.setItem("validateXML", String(on));
}

function toggleCheckDuplicateIDs(on) {
  localStorage.setItem("checkDuplicateIDs", String(on));
}

/* =========================
   SCRIPT VERSIONS
   ========================= */

function showScriptVersions() {
  const c = document.getElementById("script-versions");
  if (!c) return;

  const rows = [
    ["main.js", window.MAIN_VERSION],
    ["utils.js", window.UTILS_VERSION],
    ["NodeFactory.js", window.NODES_VERSION],
    ["EditorState.js", window.MAIN_VERSION],
    ["UIController.js", window.UI_VERSION],
    ["db.js", window.DB_VERSION],
    ["tree.js", window.TREE_VERSION],
    ["xml.js", window.XML_VERSION]
  ];

  c.innerHTML = rows
    .map(([n, v]) => `${n} → ${v || "—"}`)
    .join("<br>");
}

/* =========================
   INIT (ONE TIME ONLY)
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
  // тема
  setTheme(localStorage.getItem("theme") || "dark");

  // язык
  setLang(localStorage.getItem("lang") || "en");

  // ui настройки
  setUIScale(localStorage.getItem("uiScale") || "100");
  setNodeDensity(localStorage.getItem("nodeDensity") || "normal");
  toggleShadows(localStorage.getItem("nodeShadows") !== "false");
  toggleGrid(localStorage.getItem("bgGrid") !== "false");
  toggleSnap(localStorage.getItem("snapToGrid") === "true");

  showScriptVersions();
});

/* =========================
   GLOBAL EXPORT
   ========================= */

window.loc = loc;
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

window.applyLocalization = applyLocalization;
window.showScriptVersions = showScriptVersions;
