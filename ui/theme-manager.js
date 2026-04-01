import { getAppSetting, setAppSetting } from '../state/app-settings.js';

const BASE_THEMES = {
  debug: { id: 'debug', label: 'Normal' },
  'classic-luna': { id: 'classic-luna', label: 'Classic Luna' },
  'neon-ops': { id: 'neon-ops', label: 'Neon Ops' },
  'retro-terminal': { id: 'retro-terminal', label: 'Retro Terminal' },
  'soft-bloom': { id: 'soft-bloom', label: 'Soft Bloom' }
};


const BASE_THEME_STYLESHEETS = {
  debug: './css/themes/base/debug.css',
  'classic-luna': './css/themes/base/classic-luna.css',
  'neon-ops': './css/themes/base/neon-ops.css',
  'retro-terminal': './css/themes/base/retro-terminal.css',
  'soft-bloom': './css/themes/base/soft-bloom.css'
};

const THEME_MODES = {
  dark: { id: 'dark', label: 'Dark', iconStyle: 'outline' },
  light: { id: 'light', label: 'Light', iconStyle: 'solid' }
};

const STYLE_VARIANTS = {
  compact: { id: 'compact', label: 'Compact' },
  balanced: { id: 'balanced', label: 'Balanced' },
  soft: { id: 'soft', label: 'Soft' }
};

const SF_ACCENT_PRESETS = {
  'emerald-crimson': { success: '#38c172', failure: '#e25555' },
  'mint-rose': { success: '#53d79e', failure: '#f06f8e' },
  'neon-cherry': { success: '#2ce184', failure: '#ff4d6d' },
  'forest-ruby': { success: '#2f9e5f', failure: '#c63d4f' }
};

const defaults = {
  baseTheme: 'debug',
  themeMode: 'dark',
  themeStyle: 'balanced',
  uiScale: '100',
  grid: true,
  chanceColorCoding: true,
  chanceInputMode: 'fraction',
  sfAccentPreset: 'emerald-crimson'
};

const listeners = new Set();

const state = {
  baseTheme: getAppSetting('baseTheme') || defaults.baseTheme,
  themeMode: getAppSetting('themeMode') || defaults.themeMode,
  themeStyle: getAppSetting('themeStyle') || defaults.themeStyle,
  uiScale: getAppSetting('uiScale') || defaults.uiScale,
  grid: getAppSetting('grid') ?? defaults.grid,
  chanceColorCoding: getAppSetting('chanceColorCoding') ?? defaults.chanceColorCoding,
  chanceInputMode: getAppSetting('chanceInputMode') || defaults.chanceInputMode,
  sfAccentPreset: getAppSetting('sfAccentPreset') || defaults.sfAccentPreset
};

function ensureValidState() {
  if (!BASE_THEMES[state.baseTheme]) state.baseTheme = defaults.baseTheme;
  if (!THEME_MODES[state.themeMode]) state.themeMode = defaults.themeMode;
  if (!STYLE_VARIANTS[state.themeStyle]) state.themeStyle = defaults.themeStyle;
  if (!['fraction', 'percent'].includes(state.chanceInputMode)) state.chanceInputMode = defaults.chanceInputMode;
  if (!SF_ACCENT_PRESETS[state.sfAccentPreset]) state.sfAccentPreset = defaults.sfAccentPreset;
}

function notifyThemeChange() {
  const snapshot = getThemeState();
  listeners.forEach(listener => listener(snapshot));
}

export function applyTheme() {
  ensureValidState();

  const baseThemeLink = document.getElementById('base-theme-style');
  const stylesheet = BASE_THEME_STYLESHEETS[state.baseTheme] || BASE_THEME_STYLESHEETS[defaults.baseTheme];
  if (baseThemeLink && baseThemeLink.getAttribute('href') !== stylesheet) {
    baseThemeLink.href = stylesheet;
  }

  document.body.dataset.baseTheme = state.baseTheme;
  document.body.dataset.themeMode = state.themeMode;
  document.body.dataset.themeStyle = state.themeStyle;
  document.body.dataset.iconStyle = THEME_MODES[state.themeMode].iconStyle;
  document.body.dataset.uiScale = state.uiScale;
  document.body.dataset.bgGrid = state.grid ? 'visible' : 'off';
  const accents = SF_ACCENT_PRESETS[state.sfAccentPreset] || SF_ACCENT_PRESETS[defaults.sfAccentPreset];
  document.body.style.setProperty('--sf-success', accents.success);
  document.body.style.setProperty('--sf-failure', accents.failure);

  setAppSetting('baseTheme', state.baseTheme);
  setAppSetting('themeMode', state.themeMode);
  setAppSetting('themeStyle', state.themeStyle);
  setAppSetting('uiScale', state.uiScale);
  setAppSetting('grid', Boolean(state.grid));
  setAppSetting('chanceColorCoding', Boolean(state.chanceColorCoding));
  setAppSetting('chanceInputMode', state.chanceInputMode);
  setAppSetting('sfAccentPreset', state.sfAccentPreset);

  notifyThemeChange();
}

export function onThemeChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getThemeState() {
  return {
    ...state,
    iconStyle: THEME_MODES[state.themeMode]?.iconStyle || THEME_MODES[defaults.themeMode].iconStyle
  };
}

export function getIconStyle() {
  return getThemeState().iconStyle;
}

export function getBaseThemes() {
  return Object.values(BASE_THEMES);
}

export function getThemeModes() {
  return Object.values(THEME_MODES);
}

export function getStyleVariants() {
  return Object.values(STYLE_VARIANTS);
}

export function setBaseTheme(baseTheme) {
  state.baseTheme = baseTheme;
  applyTheme();
}

export function setThemeMode(themeMode) {
  state.themeMode = themeMode;
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

export function setSfAccentPreset(preset) {
  if (!SF_ACCENT_PRESETS[preset]) return;
  state.sfAccentPreset = preset;
  applyTheme();
}
