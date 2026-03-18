import { getAppSetting, setAppSetting } from '../state/app-settings.js';
import { enUiDictionary } from './localization/en.js';
import { ruUiDictionary } from './localization/ru.js';
import { zhHansUiDictionary } from './localization/zh-Hans.js';
import { zhHantUiDictionary } from './localization/zh-Hant.js';
import { frUiDictionary } from './localization/fr.js';
import { esUiDictionary } from './localization/es.js';
import { deUiDictionary } from './localization/de.js';
import { plUiDictionary } from './localization/pl.js';

const dictionaries = new Map([
  ['en', { ...enUiDictionary }],
  ['ru', { ...ruUiDictionary }],
  ['zh-Hans', { ...zhHansUiDictionary }],
  ['zh-Hant', { ...zhHantUiDictionary }],
  ['fr', { ...frUiDictionary }],
  ['es', { ...esUiDictionary }],
  ['de', { ...deUiDictionary }],
  ['pl', { ...plUiDictionary }]
]);

let currentLang = getAppSetting('lang') || 'en';
if (!dictionaries.has(currentLang)) currentLang = 'en';

const listeners = new Set();
const pendingLocalizationRoots = new Set();
let localizationFrame = null;
let listenerFrame = null;
let pendingListenerLang = null;

function mergeDictionary(lang, entries) {
  if (!lang || !entries || typeof entries !== 'object') return;
  dictionaries.set(lang, {
    ...(dictionaries.get(lang) || {}),
    ...entries
  });
}

function flushLocalizationQueue() {
  const roots = [...pendingLocalizationRoots];
  pendingLocalizationRoots.clear();
  localizationFrame = null;
  roots.forEach(root => applyLocalizationImmediately(root));
}

function notifyListeners(lang) {
  pendingListenerLang = lang;
  if (listenerFrame != null) return;
  listenerFrame = requestAnimationFrame(() => {
    const nextLang = pendingListenerLang;
    pendingListenerLang = null;
    listenerFrame = null;
    listeners.forEach(listener => listener(nextLang));
  });
}

export function registerLocalizationBundle(_bundleName, bundleByLang) {
  if (!bundleByLang || typeof bundleByLang !== 'object') return;
  Object.entries(bundleByLang).forEach(([lang, entries]) => mergeDictionary(lang, entries));
}

export function hasLocalizationKey(key, lang = currentLang) {
  const dict = dictionaries.get(lang);
  return Boolean(dict && key in dict);
}

export function t(key, fallback = key) {
  const dict = dictionaries.get(currentLang) || {};
  const english = dictionaries.get('en') || {};
  return dict[key] ?? english[key] ?? fallback;
}

export function formatL10n(key, values = {}, fallback = key) {
  return Object.entries(values).reduce((text, [token, value]) => {
    return text.replaceAll(`{${token}}`, String(value));
  }, t(key, fallback));
}

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (!dictionaries.has(lang) || currentLang === lang) {
    if (dictionaries.has(lang)) setAppSetting('lang', lang);
    return;
  }
  currentLang = lang;
  setAppSetting('lang', lang);
  notifyListeners(lang);
}

export function onLangChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function applyLocalizedAttribute(root, selector, attribute) {
  root.querySelectorAll(selector).forEach(el => {
    const key = el.dataset[attribute];
    if (!key) return;
    const attrName = attribute === 'l10nPlaceholder'
      ? 'placeholder'
      : attribute === 'l10nTitle'
        ? 'title'
        : attribute === 'l10nAriaLabel'
          ? 'aria-label'
          : null;
    if (attrName) el.setAttribute(attrName, t(key));
  });
}

export function applyLocalizationImmediately(root = document) {
  root.querySelectorAll('[data-l10n]').forEach(el => {
    const key = el.dataset.l10n;
    if (key) el.textContent = t(key);
  });

  applyLocalizedAttribute(root, '[data-l10n-placeholder]', 'l10nPlaceholder');
  applyLocalizedAttribute(root, '[data-l10n-title]', 'l10nTitle');
  applyLocalizedAttribute(root, '[data-l10n-aria-label]', 'l10nAriaLabel');
}

export function applyLocalization(root = document) {
  pendingLocalizationRoots.add(root);
  if (localizationFrame != null) return;
  localizationFrame = requestAnimationFrame(flushLocalizationQueue);
}
