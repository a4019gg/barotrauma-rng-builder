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
  'mint-rose': { success: '#3fc7b4', failure: '#f8b24f' },
  'neon-cherry': { success: '#4e86ff', failure: '#ff66d0' },
  'forest-ruby': { success: '#9f7aea', failure: '#ffd166' },
  'lime-magenta': { success: '#6adf6d', failure: '#e667d6' },
  'aqua-ember': { success: '#38d9c7', failure: '#ff8c42' },
  'teal-violet': { success: '#30b7c7', failure: '#b783ff' },
  'sage-coral': { success: '#79c68a', failure: '#ff7f6a' },
  'sky-sun': { success: '#5cb7ff', failure: '#ffd54f' }
};

const RETRO_ACCENT_PRESETS = {
  'terminal-green': { accent: '#00ff00', strong: '#8dff8d' },
  'amber-phosphor': { accent: '#ffbf3f', strong: '#ffe28c' },
  'ice-cyan': { accent: '#5de8ff', strong: '#b3f5ff' },
  'plasma-magenta': { accent: '#ff71e7', strong: '#ffb5f3' },
  'paper-ink': { accent: '#000000', strong: '#303030' }
};

const defaults = {
  baseTheme: 'debug',
  themeMode: 'dark',
  themeStyle: 'balanced',
  uiScale: '100',
  grid: true,
  chanceColorCoding: true,
  chanceInputMode: 'fraction',
  sfAccentPreset: 'emerald-crimson',
  retroAccentPreset: 'terminal-green'
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
  sfAccentPreset: getAppSetting('sfAccentPreset') || defaults.sfAccentPreset,
  retroAccentPreset: getAppSetting('retroAccentPreset') || defaults.retroAccentPreset
};

function ensureValidState() {
  if (!BASE_THEMES[state.baseTheme]) state.baseTheme = defaults.baseTheme;
  if (!THEME_MODES[state.themeMode]) state.themeMode = defaults.themeMode;
  if (!STYLE_VARIANTS[state.themeStyle]) state.themeStyle = defaults.themeStyle;
  if (!['fraction', 'percent'].includes(state.chanceInputMode)) state.chanceInputMode = defaults.chanceInputMode;
  if (!SF_ACCENT_PRESETS[state.sfAccentPreset]) state.sfAccentPreset = defaults.sfAccentPreset;
  if (!RETRO_ACCENT_PRESETS[state.retroAccentPreset]) state.retroAccentPreset = defaults.retroAccentPreset;
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
  const retroAccents = RETRO_ACCENT_PRESETS[state.retroAccentPreset] || RETRO_ACCENT_PRESETS[defaults.retroAccentPreset];
  document.body.style.setProperty('--retro-accent-main', retroAccents.accent);
  document.body.style.setProperty('--retro-accent-strong', retroAccents.strong);

  setAppSetting('baseTheme', state.baseTheme);
  setAppSetting('themeMode', state.themeMode);
  setAppSetting('themeStyle', state.themeStyle);
  setAppSetting('uiScale', state.uiScale);
  setAppSetting('grid', Boolean(state.grid));
  setAppSetting('chanceColorCoding', Boolean(state.chanceColorCoding));
  setAppSetting('chanceInputMode', state.chanceInputMode);
  setAppSetting('sfAccentPreset', state.sfAccentPreset);
  setAppSetting('retroAccentPreset', state.retroAccentPreset);

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

export function setRetroAccentPreset(preset) {
  if (!RETRO_ACCENT_PRESETS[preset]) return;
  state.retroAccentPreset = preset;
  applyTheme();
}
