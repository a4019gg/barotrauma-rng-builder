// ui/icon-renderer.js
// Unified icon renderer for DB and Node UI
//
// Responsibilities:
// - Create icon DOM element
// - Apply atlas + source rect via CSS variables
// - Apply semantic classes (role / palette / mode)
// - Compute normalized intensity (for dynamic mode only)
//
// NON-responsibilities:
// - No canvas rendering
// - No color calculations
// - No theme logic
// - No DB or Node awareness
//
// All visual decisions are delegated to CSS.

const DEFAULT_ICON_SIZE = 28;

/* =========================================================
   PUBLIC API
   ========================================================= */

/**
 * Creates an icon DOM element.
 *
 * @param {Object} options
 * @param {string} options.texture      Path to atlas image
 * @param {string|Array} options.sourcerect  "x,y,w,h" or [x,y,w,h]
 * @param {string} options.role          Semantic role (buff, debuff, damage, neutral)
 * @param {string} options.palette       Color palette key (poison, fire, etc.)
 * @param {"static"|"gradient"|"dynamic"} options.mode Rendering mode
 *
 * @param {number} [options.value]       Current value (Node only)
 * @param {number} [options.max]         Max value (Node only)
 *
 * @returns {HTMLElement}
 */
export function createIcon(options = {}) {
  const el = document.createElement("div");
  el.className = "icon";

  const {
    texture,
    sourcerect,
    role = "neutral",
    palette = role,
    mode = "static",
    value,
    max
  } = options;

  applyAtlas(el, texture, sourcerect);
  applySemantics(el, role, palette, mode);
  applyIntensity(el, mode, value, max);

  return el;
}

/* =========================================================
   ATLAS HANDLING
   ========================================================= */

/**
 * Applies atlas image and source rectangle.
 * Uses CSS variables for mask/background positioning.
 */
function applyAtlas(el, texture, sourcerect) {
  if (!texture || !sourcerect) return;

  const rect = normalizeSourceRect(sourcerect);
  if (!rect) return;

  const { x, y, w, h } = rect;

  el.style.setProperty("--icon-atlas", `url("${texture}")`);
  el.style.setProperty("--icon-x", `-${x}px`);
  el.style.setProperty("--icon-y", `-${y}px`);
  el.style.setProperty("--icon-w", `${w}px`);
  el.style.setProperty("--icon-h", `${h}px`);

  // Override default size if source rect differs
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;

  // These variables are expected by CSS
  el.style.setProperty("background-image", `var(--icon-atlas)`);
  el.style.setProperty("mask-image", `var(--icon-atlas)`);
}

/**
 * Normalizes sourcerect into numeric object.
 */
function normalizeSourceRect(src) {
  let parts = null;

  if (Array.isArray(src)) {
    parts = src;
  } else if (typeof src === "string") {
    parts = src.split(",").map(v => Number(v.trim()));
  }

  if (!parts || parts.length !== 4 || parts.some(isNaN)) {
    return null;
  }

  return {
    x: parts[0],
    y: parts[1],
    w: parts[2] || DEFAULT_ICON_SIZE,
    h: parts[3] || DEFAULT_ICON_SIZE
  };
}

/* =========================================================
   SEMANTIC CLASSES
   ========================================================= */

/**
 * Applies role / palette / mode classes.
 */
function applySemantics(el, role, palette, mode) {
  el.classList.add(
    `icon-role-${role}`,
    `icon-palette-${palette}`,
    `icon-mode-${mode}`
  );
}

/* =========================================================
   INTENSITY (DYNAMIC MODE ONLY)
   ========================================================= */

/**
 * Computes normalized intensity (0..1) and applies CSS variable.
 * JS only computes the number, CSS decides the visuals.
 */
function applyIntensity(el, mode, value, max) {
  if (mode !== "dynamic") return;

  const v = Number(value);
  const m = Number(max);

  if (!isFinite(v) || !isFinite(m) || m <= 0) {
    el.style.setProperty("--icon-intensity", "0");
    return;
  }

  const intensity = clamp(v / m, 0, 1);
  el.style.setProperty("--icon-intensity", intensity.toString());
}

/* =========================================================
   UTILS
   ========================================================= */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
