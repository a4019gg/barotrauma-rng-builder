const SETTINGS_KEY = 'rng-builder.settings.v2';

const DEFAULT_SETTINGS = {
  lang: 'en',
  baseTheme: 'debug',
  themeMode: 'dark',
  themeStyle: 'balanced',
  uiScale: '100',
  grid: true,
  chanceColorCoding: true,
  chanceInputMode: 'fraction',
  autoChanceMode: 'off',
  editorMode: 'basic',
  viewMode: 'node'
};

let state = { ...DEFAULT_SETTINGS };
const listeners = new Set();

function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'en';
  const rawCandidates = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language || navigator.userLanguage || 'en'];
  const candidates = rawCandidates.map(value => String(value || '').toLowerCase());
  const direct = candidates.find(lang => ['en', 'ru', 'fr', 'es', 'de', 'pl', 'zh-hans', 'zh-hant'].includes(lang));
  if (direct) return direct === 'zh-hans' ? 'zh-Hans' : direct === 'zh-hant' ? 'zh-Hant' : direct;

  if (candidates.some(lang => lang.startsWith('ru'))) return 'ru';
  if (candidates.some(lang => lang.startsWith('fr'))) return 'fr';
  if (candidates.some(lang => lang.startsWith('es'))) return 'es';
  if (candidates.some(lang => lang.startsWith('de'))) return 'de';
  if (candidates.some(lang => lang.startsWith('pl'))) return 'pl';
  if (candidates.some(lang => lang.startsWith('zh-cn') || lang.startsWith('zh-sg') || lang === 'zh')) return 'zh-Hans';
  if (candidates.some(lang => lang.startsWith('zh-tw') || lang.startsWith('zh-hk') || lang.startsWith('zh-mo'))) return 'zh-Hant';
  return 'en';
}

function loadState() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      state = { ...DEFAULT_SETTINGS, lang: detectBrowserLanguage() };
      return;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      state = { ...DEFAULT_SETTINGS, ...parsed };
      if (!['basic', 'advanced'].includes(state.editorMode)) state.editorMode = 'basic';
    }
  } catch (_) {
    state = { ...DEFAULT_SETTINGS };
  }
}

function persist() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state));
}

loadState();

export function getDefaultSettings() {
  return { ...DEFAULT_SETTINGS };
}

export function getAppSetting(key) {
  return state[key];
}

export function getAppSettings() {
  return { ...state };
}

export function setAppSetting(key, value) {
  state[key] = value;
  persist();
  listeners.forEach(listener => listener(getAppSettings()));
}

export function subscribeAppSettings(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function clearAppSettingsCache() {
  state = { ...DEFAULT_SETTINGS };
  persist();
  listeners.forEach(listener => listener(getAppSettings()));
}
