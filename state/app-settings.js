const SETTINGS_KEY = 'rng-builder.settings.v2';

const DEFAULT_SETTINGS = {
  lang: 'en',
  baseTheme: 'dark',
  themeStyle: 'balanced',
  uiScale: '100',
  grid: true,
  chanceColorCoding: true,
  chanceInputMode: 'fraction',
  autoChanceMode: 'branch-split'
};

let state = { ...DEFAULT_SETTINGS };
const listeners = new Set();

function loadState() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      state = { ...DEFAULT_SETTINGS, ...parsed };
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
