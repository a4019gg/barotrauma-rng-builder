// ui/icon-renderer.js
// Unified icon renderer for DB preview and Node UI runtime
//
// Responsibilities:
// - Create icon DOM element
// - Apply atlas image and source rect correctly
// - Expose all geometry via CSS variables
// - Apply semantic classes (role / palette / mode)
// - Compute normalized intensity (dynamic mode only)
//
// NON-responsibilities:
// - No canvas rendering
// - No color calculation
// - No theme logic
// - No DB / Node awareness
//
// All visual behavior is controlled by CSS.

const DEFAULT_ICON_SIZE = 28;

/* =========================================================
   ATLAS SIZE REGISTRY
   ========================================================= */

const ATLAS_SIZES = {
  "MainIconsAtlas.png": [1024, 1024],
  "CommandUIAtlas.png": [1024, 1024],
  "CommandUIBackground.png": [1024, 1024],
  "TalentsIcons4.png": [1024, 512]
};

/* =========================================================
   PUBLIC API
   ========================================================= */

/**
 * Creates an icon DOM element.
 *
 * @param {Object} options
 * @param {string} options.texture            Path to atlas image
 * @param {string|Array<number>} options.sourcerect  "x,y,w,h" or [x,y,w,h]
 * @param {string} options.role               Semantic role
 * @param {string} options.palette            Palette key
 * @param {"static"|"gradient"|"dynamic"} options.mode
 *
 * @param {number} [options.value]             Current value (Node UI)
 * @param {number} [options.max]               Max value (Node UI)
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
   ATLAS / GEOMETRY
   ========================================================= */

/**
 * Applies atlas image and correct source rectangle.
 * IMPORTANT:
 * - x,y = offset in atlas
 * - w,h = size of rendered icon
 */
function applyAtlas(el, texture, sourcerect) {
  if (!texture || !sourcerect) return;

  const rect = normalizeSourceRect(sourcerect);
  if (!rect) return;

  const { x, y, w, h } = rect;
  const { width: atlasW, height: atlasH } = resolveAtlasSize(texture);

  /* Atlas reference */
  el.style.setProperty("--icon-atlas", `url("${texture}")`);

  /* Offset inside atlas (NEGATIVE, because background-position) */
  el.style.setProperty("--icon-x", `-${x}px`);
  el.style.setProperty("--icon-y", `-${y}px`);

  /* Atlas size (required for correct DB preview) */
  el.style.setProperty("--icon-atlas-w", `${atlasW}px`);
  el.style.setProperty("--icon-atlas-h", `${atlasH}px`);

  /* Rendered icon size = source rect size */
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;

  /* Renderer always sets both — CSS decides what to use */
  el.style.setProperty("background-image", `var(--icon-atlas)`);
  el.style.setProperty("mask-image", `var(--icon-atlas)`);
}

/**
 * Resolves atlas size from known registry.
 * Falls back to 1024x1024 if unknown.
 */
function resolveAtlasSize(texture) {
  const file = texture.split("/").pop();
  const size = ATLAS_SIZES[file];

  if (Array.isArray(size)) {
    return { width: size[0], height: size[1] };
  }

  return { width: 1024, height: 1024 };
}

/**
 * Normalizes sourcerect into numeric object.
 * Expected format: [x, y, w, h]
 */
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

  return {
    x,
    y,
    w: w > 0 ? w : DEFAULT_ICON_SIZE,
    h: h > 0 ? h : DEFAULT_ICON_SIZE
  };
}

/* =========================================================
   SEMANTIC CLASSES
   ========================================================= */

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
