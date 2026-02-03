const dictionaries = new Map();
let currentLang = "en";

export function registerDictionary(lang, entries) {
  if (!lang || typeof entries !== "object") return;
  dictionaries.set(lang, { ...entries });
}

export function setLanguage(lang) {
  if (!lang || !dictionaries.has(lang)) return;
  currentLang = lang;
}

export function t(key, fallback = "") {
  const dict = dictionaries.get(currentLang);
  if (dict && key in dict) return dict[key];
  return fallback || key;
}

export function getLanguage() {
  return currentLang;
}

registerDictionary("en", {
  effects: "Effects",
  items: "Items",
  creatures: "Creatures",
  searchPlaceholder: "Search...",
  expandAll: "Expand / Collapse all",
  sortLabel: "Sort by ID",
  sortIdAsc: "ID A→Z",
  sortIdDesc: "ID Z→A",
  scaleLabel: "Scale UI",
  scaleValue: "{value}",
  copyId: "Copy ID",
  copyIdSuccess: "ID copied to clipboard",
  copyIdError: "Failed to copy ID",
  noEntries: "No entries",
  nothingFound: "Nothing found",
  typeLabel: "Type",
  maxStrengthLabel: "Max strength",
  limbSpecificLabel: "Limb specific",
  isBuffLabel: "Is buff",
  yes: "Yes",
  no: "No",
  tagsLabel: "Tags",
  legendTitle: "Legend",
  legendToggle: "Toggle legend",
  legendExpand: "⧉ — expand / collapse all",
  legendDetails: "ⓘ — toggle details",
  legendCopy: "Copy — copy ID"
});
