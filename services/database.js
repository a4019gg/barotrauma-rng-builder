// services/database.js
// Read-only static database service
// Loads JSON from /data and provides search & sort utilities
// NO UI, NO DOM, NO state mutations

const DATA_FILES = {
  items: "data/items.json",
  creatures: "data/creatures.json",
  afflictions: "data/afflictions.json"
};

const _cache = {
  loaded: false,
  data: {
    items: [],
    creatures: [],
    afflictions: []
  }
};

/* =========================
   LOAD
   ========================= */

/**
 * Loads all database JSON files.
 * Must be called once before using other methods.
 */
export async function load() {
  if (_cache.loaded) return;

  const entries = await Promise.all(
    Object.entries(DATA_FILES).map(async ([type, path]) => {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load ${path}`);
      }

      const json = await response.json();
      if (!Array.isArray(json)) {
        throw new Error(`Invalid format in ${path} (expected array)`);
      }

      return [type, normalizeList(json)];
    })
  );

  for (const [type, list] of entries) {
    _cache.data[type] = list;
  }

  _cache.loaded = true;
}

/* =========================
   PUBLIC READ API
   ========================= */

/**
 * Returns all entries of given type.
 * @param {"items"|"creatures"|"afflictions"} type
 */
export function getAll(type) {
  ensureLoaded();
  ensureType(type);
  return cloneArray(_cache.data[type]);
}

/**
 * Searches entries by id or name (case-insensitive).
 * Empty query returns all entries.
 * @param {"items"|"creatures"|"afflictions"} type
 * @param {string} query
 */
export function search(type, query) {
  ensureLoaded();
  ensureType(type);

  const q = String(query || "").trim().toLowerCase();
  if (!q) return getAll(type);

  return _cache.data[type].filter(entry => {
    const idMatch = entry.id.toLowerCase().includes(q);
    const nameMatch =
      typeof entry.name === "string" &&
      entry.name.toLowerCase().includes(q);

    return idMatch || nameMatch;
  }).map(cloneEntry);
}

/**
 * Sorts a list of entries by given mode.
 * Does NOT mutate original list.
 *
 * @param {Array} list
 * @param {"name-asc"|"name-desc"|"id-asc"|"id-desc"} mode
 */
export function sort(list, mode) {
  if (!Array.isArray(list)) return [];

  const sorted = [...list];

  sorted.sort((a, b) => {
    const aName = a.name || a.id;
    const bName = b.name || b.id;

    switch (mode) {
      case "name-asc":
        return compare(aName, bName);
      case "name-desc":
        return compare(bName, aName);
      case "id-desc":
        return compare(b.id, a.id);
      case "id-asc":
      default:
        return compare(a.id, b.id);
    }
  });

  return sorted.map(cloneEntry);
}

/* =========================
   INTERNAL HELPERS
   ========================= */

function ensureLoaded() {
  if (!_cache.loaded) {
    throw new Error("Database not loaded. Call load() first.");
  }
}

function ensureType(type) {
  if (!DATA_FILES[type]) {
    throw new Error(`Unknown database type: ${type}`);
  }
}

function normalizeList(list) {
  return list
    .filter(e => e && typeof e.id === "string")
    .map(e => normalizeEntry(e));
}

function normalizeEntry(entry) {
  return {
    id: String(entry.id),
    name: entry.name ? String(entry.name) : undefined,
    category: entry.category ? String(entry.category) : undefined,
    tags: Array.isArray(entry.tags) ? [...entry.tags] : undefined,
    icon: entry.icon ? entry.icon : undefined,
    description: entry.description ? String(entry.description) : undefined
  };
}

function cloneEntry(entry) {
  return {
    ...entry,
    tags: entry.tags ? [...entry.tags] : undefined
  };
}

function cloneArray(arr) {
  return arr.map(cloneEntry);
}

function compare(a, b) {
  return String(a).localeCompare(String(b), undefined, {
    sensitivity: "base",
    numeric: true
  });
}
