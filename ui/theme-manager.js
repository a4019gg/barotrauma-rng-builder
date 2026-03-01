import { getAppSetting, setAppSetting } from '../state/app-settings.js';

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
  chanceColorCoding: true,
  chanceInputMode: 'fraction'
};

const listeners = new Set();

const state = {
  baseTheme: getAppSetting('baseTheme') || defaults.baseTheme,
  themeStyle: getAppSetting('themeStyle') || defaults.themeStyle,
  uiScale: getAppSetting('uiScale') || defaults.uiScale,
  grid: getAppSetting('grid') ?? defaults.grid,
  chanceColorCoding: getAppSetting('chanceColorCoding') ?? defaults.chanceColorCoding,
  chanceInputMode: getAppSetting('chanceInputMode') || defaults.chanceInputMode
};

function ensureValidState() {
  if (!BASE_THEMES[state.baseTheme]) state.baseTheme = defaults.baseTheme;
  if (!STYLE_VARIANTS[state.themeStyle]) state.themeStyle = defaults.themeStyle;
  if (!['fraction', 'percent'].includes(state.chanceInputMode)) state.chanceInputMode = defaults.chanceInputMode;
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

  setAppSetting('baseTheme', state.baseTheme);
  setAppSetting('themeStyle', state.themeStyle);
  setAppSetting('uiScale', state.uiScale);
  setAppSetting('grid', Boolean(state.grid));
  setAppSetting('chanceColorCoding', Boolean(state.chanceColorCoding));
  setAppSetting('chanceInputMode', state.chanceInputMode);

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

export function setChanceInputMode(mode) {
  state.chanceInputMode = mode;
  applyTheme();
}
