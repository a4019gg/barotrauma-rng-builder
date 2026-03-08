import { applyLocalization, getLang, onLangChange, setLang, t } from './localization.js';
import {
  applyTheme,
  getThemeState,
  onThemeChange,
  setBaseTheme,
  setChanceColorCoding,
  setChanceInputMode,
  setGrid,
  setThemeMode,
  setThemeStyle,
  setUiScale
} from './theme-manager.js';
import { clearAppSettingsCache, getAppSetting, setAppSetting } from '../state/app-settings.js';

export function initSettingsController() {
  const settingsRoot = document.getElementById('settings-panel');
  const toggleBtn = document.getElementById('settings-toggle');

  toggleBtn.addEventListener('click', () => {
    settingsRoot.classList.toggle('open');
    applyLocalization(settingsRoot);
  });

  document.addEventListener('click', event => {
    if (!settingsRoot.classList.contains('open')) return;
    if (event.target.closest('#settings-panel') || event.target.closest('#settings-toggle')) return;
    settingsRoot.classList.remove('open');
  });

  document.getElementById('base-theme-select').onchange = event => setBaseTheme(event.target.value);
  document.getElementById('theme-mode-select').onchange = event => setThemeMode(event.target.value);
  document.getElementById('theme-style-select').onchange = event => setThemeStyle(event.target.value);
  document.getElementById('lang-select').onchange = event => setLang(event.target.value);
  document.getElementById('ui-scale-select').onchange = event => setUiScale(event.target.value);
  document.getElementById('toggle-grid').onchange = event => setGrid(event.target.checked);
  document.getElementById('toggle-chance-colors').onchange = event => setChanceColorCoding(event.target.checked);
  document.getElementById('chance-input-mode').onchange = event => setChanceInputMode(event.target.value);
  document.getElementById('auto-chance-global').onchange = event => setAppSetting('autoChanceMode', event.target.value);
  document.getElementById('clear-cache-btn').onclick = () => {
    clearAppSettingsCache();
    localStorage.removeItem('tree.settings.v2');
    location.reload();
  };

  const state = getThemeState();
  document.getElementById('base-theme-select').value = state.baseTheme;
  document.getElementById('theme-mode-select').value = state.themeMode;
  document.getElementById('theme-style-select').value = state.themeStyle;
  document.getElementById('lang-select').value = getLang();
  document.getElementById('ui-scale-select').value = state.uiScale;
  document.getElementById('toggle-grid').checked = state.grid;
  document.getElementById('toggle-chance-colors').checked = state.chanceColorCoding;
  document.getElementById('chance-input-mode').value = state.chanceInputMode;
  document.getElementById('auto-chance-global').value = getAppSetting('autoChanceMode') || 'branch-split';

  onLangChange(() => {
    applyLocalization();
    const settingsLabel = document.querySelector('#settings-toggle [data-l10n]');
    if (settingsLabel) settingsLabel.textContent = t('settings');
  });

  applyTheme();
  onThemeChange(currentState => {
    document.getElementById('base-theme-select').value = currentState.baseTheme;
    document.getElementById('theme-mode-select').value = currentState.themeMode;
    document.getElementById('toggle-chance-colors').checked = currentState.chanceColorCoding;
    document.getElementById('chance-input-mode').value = currentState.chanceInputMode;
  });
}
