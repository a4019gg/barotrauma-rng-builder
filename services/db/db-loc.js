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
  sortLabel: "Sort",
  sortNameAsc: "Name A→Z",
  sortNameDesc: "Name Z→A",
  sortIdAsc: "ID A→Z",
  sortIdDesc: "ID Z→A",
  copyId: "Copy ID",
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
  legendExpand: "⧉ — expand / collapse all",
  legendDetails: "ⓘ — toggle details",
  legendCopy: "Copy — copy ID"
});
