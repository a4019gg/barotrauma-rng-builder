// services/db/db-icon-canvas.js
// Canvas-based icon renderer for DB preview ONLY
//
// Responsibilities:
// - Render atlas sourcerect to canvas
// - Scale icon to target size (canvas-equivalent of legacy drawImage)
// - One-time render, no re-draws
//
// NON-responsibilities:
// - No dynamic colors
// - No intensity
// - No theme logic
// - No Node UI usage
//
// This renderer intentionally uses canvas because
// Barotrauma icons are designed to be scaled.

const DEFAULT_ICON_SIZE = 28;

/**
 * Creates a canvas icon element for DB preview.
 *
 * @param {Object} options
 * @param {string} options.texture        Path to atlas image
 * @param {string|Array<number>} options.sourcerect "x,y,w,h" or [x,y,w,h]
 * @param {number} [options.size]         Target render size (px)
 *
 * @returns {HTMLCanvasElement|null}
 */
export function createDbIconCanvas(options = {}) {
  const { texture, sourcerect, size = DEFAULT_ICON_SIZE } = options;

  if (!texture || !sourcerect) {
    return null;
  }

  const rect = normalizeSourceRect(sourcerect);
  if (!rect) {
    return null;
  }

  const { x, y, w, h } = rect;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  canvas.className = "db-icon-canvas";

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }

  const img = new Image();
  img.src = texture;

  img.onload = () => {
    // Clear just in case
    ctx.clearRect(0, 0, size, size);

    // Canvas-equivalent of legacy Barotrauma logic:
    // drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)
    ctx.drawImage(
      img,
      x,
      y,
      w,
      h,
      0,
      0,
      size,
      size
    );
  };

  img.onerror = () => {
    // Fail silently — DB can live without icon
    console.warn("[DB ICON] Failed to load atlas:", texture);
  };

  return canvas;
}

/* =========================================================
   HELPERS
   ========================================================= */

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

  if (w <= 0 || h <= 0) {
    return null;
  }

  return { x, y, w, h };
}
