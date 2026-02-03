// services/database.js
// Read-only static database service
// Loads JSON from /data and provides search & sort utilities
// NO UI, NO DOM, NO schema normalization

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

      return [type, json.filter(isValidEntry).map(cloneEntry)];
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

export function getAll(type) {
  ensureLoaded();
  ensureType(type);
  return _cache.data[type].map(cloneEntry);
}

export function getById(type, id) {
  ensureLoaded();
  ensureType(type);
  if (!id) return null;
  const key = String(id).toLowerCase();
  const match = _cache.data[type].find(entry => entry.id?.toLowerCase() === key);
  return match ? cloneEntry(match) : null;
}

export function search(type, query) {
  ensureLoaded();
  ensureType(type);

  const q = String(query || "").trim().toLowerCase();
  if (!q) return getAll(type);

  return _cache.data[type]
    .filter(entry => {
      const idMatch =
        typeof entry.id === "string" &&
        entry.id.toLowerCase().includes(q);

      const nameMatch =
        typeof entry.name === "string" &&
        entry.name.toLowerCase().includes(q);

      return idMatch || nameMatch;
    })
    .map(cloneEntry);
}

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

function isValidEntry(entry) {
  return entry && typeof entry.id === "string";
}

function cloneEntry(entry) {
  return { ...entry };
}

function compare(a, b) {
  return String(a).localeCompare(String(b), undefined, {
    sensitivity: "base",
    numeric: true
  });
}
