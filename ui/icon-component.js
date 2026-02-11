import { getIconStyle, onThemeChange } from './theme-manager.js';

const ICON_ROOT = './assets/icons';
const FORCE_OUTLINE = new Set(['trash']);
const liveIcons = new Set();

function resolveStyle(name) {
  if (FORCE_OUTLINE.has(name)) return 'outline';
  return getIconStyle();
}

function iconPath(name, style) {
  return `${ICON_ROOT}/${style}/${name}.svg`;
}

function applyIconAsset(iconEl) {
  const name = iconEl.dataset.iconName;
  const style = resolveStyle(name);
  const path = iconPath(name, style);
  iconEl.style.setProperty('--icon-url', `url("${path}")`);
}

function registerIcon(iconEl) {
  liveIcons.add(iconEl);
}

function refreshLiveIcons() {
  liveIcons.forEach(iconEl => {
    if (!iconEl.isConnected) {
      liveIcons.delete(iconEl);
      return;
    }
    applyIconAsset(iconEl);
  });
}

onThemeChange(refreshLiveIcons);

export function createIcon(name, options = {}) {
  const iconEl = document.createElement('span');
  iconEl.className = `ui-icon ${options.className || ''}`.trim();
  iconEl.dataset.iconName = name;
  iconEl.setAttribute('aria-hidden', options.decorative === false ? 'false' : 'true');
  applyIconAsset(iconEl);
  registerIcon(iconEl);
  return iconEl;
}
