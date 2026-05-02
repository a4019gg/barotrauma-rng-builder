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
  'violet-glow': { accent: '#be7bff', strong: '#d8b1ff' },
  'neon-blue': { accent: '#4e86ff', strong: '#9ab9ff' },
  'ember-red': { accent: '#ff6b57', strong: '#ffab9f' },
  'phosphor-lime': { accent: '#9cff57', strong: '#caf9a5' },
  'mono-contrast': {
    dark: { accent: '#ffffff', strong: '#ffffff' },
    light: { accent: '#101010', strong: '#2f2f2f' }
  }
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
  retroAccentPreset: 'terminal-green',
  themeAccentPreset: 'theme-base'
};

const listeners = new Set();
let themeAssetsPreloaded = false;

const state = {
  baseTheme: getAppSetting('baseTheme') || defaults.baseTheme,
  themeMode: getAppSetting('themeMode') || defaults.themeMode,
  themeStyle: getAppSetting('themeStyle') || defaults.themeStyle,
  uiScale: getAppSetting('uiScale') || defaults.uiScale,
  grid: getAppSetting('grid') ?? defaults.grid,
  chanceColorCoding: getAppSetting('chanceColorCoding') ?? defaults.chanceColorCoding,
  chanceInputMode: getAppSetting('chanceInputMode') || defaults.chanceInputMode,
  sfAccentPreset: getAppSetting('sfAccentPreset') || defaults.sfAccentPreset,
  retroAccentPreset: getAppSetting('retroAccentPreset') || defaults.retroAccentPreset,
  themeAccentPreset: getAppSetting('themeAccentPreset') || defaults.themeAccentPreset
};


export const THEME_ACCENT_PRESETS = {
  'theme-base': null,
  ...RETRO_ACCENT_PRESETS
};

function resolveRetroAccentPreset() {
  const preset = RETRO_ACCENT_PRESETS[state.retroAccentPreset] || RETRO_ACCENT_PRESETS[defaults.retroAccentPreset];
  if (preset?.[state.themeMode]) return preset[state.themeMode];
  return preset;
}

function ensureValidState() {
  if (!BASE_THEMES[state.baseTheme]) state.baseTheme = defaults.baseTheme;
  if (!THEME_MODES[state.themeMode]) state.themeMode = defaults.themeMode;
  if (!STYLE_VARIANTS[state.themeStyle]) state.themeStyle = defaults.themeStyle;
  if (!['fraction', 'percent'].includes(state.chanceInputMode)) state.chanceInputMode = defaults.chanceInputMode;
  if (!SF_ACCENT_PRESETS[state.sfAccentPreset]) state.sfAccentPreset = defaults.sfAccentPreset;
  if (!RETRO_ACCENT_PRESETS[state.retroAccentPreset]) state.retroAccentPreset = defaults.retroAccentPreset;
  if (!Object.prototype.hasOwnProperty.call(THEME_ACCENT_PRESETS, state.themeAccentPreset)) {
    state.themeAccentPreset = defaults.themeAccentPreset;
  }
}

function notifyThemeChange() {
  const snapshot = getThemeState();
  listeners.forEach(listener => listener(snapshot));
}

function preloadThemeStylesheets() {
  if (themeAssetsPreloaded || typeof document === 'undefined') return;
  themeAssetsPreloaded = true;

  Object.values(BASE_THEME_STYLESHEETS).forEach(href => {
    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'style';
    preloadLink.href = href;
    document.head.appendChild(preloadLink);
  });
}

export function applyTheme() {
  ensureValidState();
  preloadThemeStylesheets();

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
  const accentPreset = THEME_ACCENT_PRESETS[state.themeAccentPreset];
  if (state.themeAccentPreset === 'theme-base' || !accentPreset) {
    document.body.style.removeProperty('--ui-accent');
    document.body.style.removeProperty('--ui-accent-strong');
  } else {
    const resolved = accentPreset?.[state.themeMode] || accentPreset;
    document.body.style.setProperty('--ui-accent', resolved.accent);
    document.body.style.setProperty('--ui-accent-strong', resolved.strong);
  }
  const retroAccents = state.themeAccentPreset === 'theme-base' ? resolveRetroAccentPreset() : (accentPreset?.[state.themeMode] || accentPreset);
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
  setAppSetting('themeAccentPreset', state.themeAccentPreset);

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


export function setThemeAccentPreset(preset) {
  if (!THEME_ACCENT_PRESETS[preset]) return;
  state.themeAccentPreset = preset;
  applyTheme();
}
