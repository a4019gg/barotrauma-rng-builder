import * as DB from '../modules/db/database.js';

const THEME_STYLES = [
  './css/themes/base/debug.css',
  './css/themes/base/classic-luna.css',
  './css/themes/base/neon-ops.css',
  './css/themes/base/retro-terminal.css',
  './css/themes/base/soft-bloom.css'
];

const DB_TEXTURE_FALLBACKS = [
  './assets/CommandUIAtlas.png',
  './assets/CommandUIBackground.png',
  './assets/TalentsIcons4.png',
  './assets/MainIconsAtlas.png'
];

let didPreload = false;

function preloadStylesheets() {
  if (typeof document === 'undefined') return;
  const existing = new Set(Array.from(document.head.querySelectorAll('link[rel="preload"][as="style"]')).map(link => link.href));
  THEME_STYLES.forEach(href => {
    const absoluteHref = new URL(href, window.location.href).href;
    if (existing.has(absoluteHref)) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    document.head.appendChild(link);
  });
}

function preloadImage(src) {
  return new Promise(resolve => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
}

function collectDbTextures() {
  const textures = new Set(DB_TEXTURE_FALLBACKS);
  ['afflictions', 'items', 'creatures'].forEach(type => {
    DB.getAll(type).forEach(entry => {
      if (entry?.icon?.texture) textures.add(entry.icon.texture);
    });
  });
  return textures;
}

export async function preloadInitialResources() {
  if (didPreload) return;
  didPreload = true;

  preloadStylesheets();
  await DB.load();
  const textures = collectDbTextures();
  await Promise.allSettled(Array.from(textures).map(texture => preloadImage(texture)));
}
