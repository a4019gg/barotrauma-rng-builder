import { getIconStyle, onThemeChange } from './theme-manager.js';

const ICON_ROOT = new URL('../assets/icons/', import.meta.url).pathname;
const liveIcons = new Set();

function iconPath(name, style = getIconStyle()) {
  return `${ICON_ROOT}${name}-${style}.svg`;
}

function applyIconAsset(iconEl) {
  const name = iconEl.dataset.iconName;
  const style = getIconStyle();
  const path = iconPath(name, style);
  iconEl.style.setProperty('--icon-url', `url("${path}")`);
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
  liveIcons.add(iconEl);
  return iconEl;
}

export function appendIconLabel(target, { icon, label, l10nKey }) {
  const fallbackLabel = target.textContent?.trim();
  target.textContent = '';
  target.classList.add('button-with-icon');
  target.append(createIcon(icon));

  const textEl = document.createElement('span');
  if (label != null) textEl.textContent = label;
  else if (fallbackLabel) textEl.textContent = fallbackLabel;
  if (l10nKey) textEl.dataset.l10n = l10nKey;
  target.append(textEl);
}
