const BASE_THEMES = {
  dark: {
    id: 'dark',
    label: 'Dark',
    file: './css/themes/dark.css',
    iconStyle: 'outline'
  },
  light: {
    id: 'light',
    label: 'Light',
    file: './css/themes/light.css',
    iconStyle: 'solid'
  }
};

const STYLE_VARIANTS = {
  compact: { id: 'compact', label: 'Compact' },
  balanced: { id: 'balanced', label: 'Balanced' },
  soft: { id: 'soft', label: 'Soft' }
};

const defaults = {
  baseTheme: 'dark',
  themeStyle: 'balanced',
  uiScale: '100',
  grid: true,
  chanceColorCoding: true
};

const listeners = new Set();

const state = {
  baseTheme: localStorage.getItem('baseTheme') || localStorage.getItem('theme') || defaults.baseTheme,
  themeStyle: localStorage.getItem('themeStyle') || defaults.themeStyle,
  uiScale: localStorage.getItem('uiScale') || defaults.uiScale,
  grid: localStorage.getItem('bgGrid') !== 'false',
  chanceColorCoding: localStorage.getItem('chanceColorCoding') !== 'false'
};

function ensureValidState() {
  if (!BASE_THEMES[state.baseTheme]) state.baseTheme = defaults.baseTheme;
  if (!STYLE_VARIANTS[state.themeStyle]) state.themeStyle = defaults.themeStyle;
}

function notifyThemeChange() {
  const snapshot = getThemeState();
  listeners.forEach(listener => listener(snapshot));
}

export function applyTheme() {
  ensureValidState();

  const themeLink = document.getElementById('theme-style');
  themeLink.href = BASE_THEMES[state.baseTheme].file;

  document.body.dataset.baseTheme = state.baseTheme;
  document.body.dataset.themeStyle = state.themeStyle;
  document.body.dataset.iconStyle = BASE_THEMES[state.baseTheme].iconStyle;
  document.body.dataset.uiScale = state.uiScale;
  document.body.dataset.bgGrid = state.grid ? 'visible' : 'off';

  localStorage.setItem('baseTheme', state.baseTheme);
  localStorage.setItem('themeStyle', state.themeStyle);
  localStorage.setItem('uiScale', state.uiScale);
  localStorage.setItem('bgGrid', String(state.grid));
  localStorage.setItem('chanceColorCoding', String(state.chanceColorCoding));

  notifyThemeChange();
}

export function onThemeChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getThemeState() {
  const base = BASE_THEMES[state.baseTheme] || BASE_THEMES[defaults.baseTheme];
  return {
    ...state,
    iconStyle: base.iconStyle
  };
}

export function getIconStyle() {
  return getThemeState().iconStyle;
}

export function getBaseThemes() {
  return Object.values(BASE_THEMES);
}

export function getStyleVariants() {
  return Object.values(STYLE_VARIANTS);
}

export function setBaseTheme(baseTheme) {
  state.baseTheme = baseTheme;
  applyTheme();
}

export function setThemeStyle(themeStyle) {
  state.themeStyle = themeStyle;
  applyTheme();
}

export function setUiScale(uiScale) {
  state.uiScale = uiScale;
  applyTheme();
}

export function setGrid(isVisible) {
  state.grid = isVisible;
  applyTheme();
}


export function setChanceColorCoding(enabled) {
  state.chanceColorCoding = !!enabled;
  applyTheme();
}
