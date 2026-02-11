import { applyLocalization, getLang, onLangChange, setLang, t } from './localization.js';
import {
  applyTheme,
  getThemeState,
  setBaseTheme,
  setGrid,
  setThemeStyle,
  setUiScale
} from './theme-manager.js';

export function initSettingsController() {
  const settingsRoot = document.getElementById('settings-panel');
  const toggleBtn = document.getElementById('settings-toggle');

  toggleBtn.addEventListener('click', () => {
    settingsRoot.classList.toggle('open');
    applyLocalization(settingsRoot);
  });

  document.getElementById('theme-select').onchange = event => {
    setBaseTheme(event.target.value);
  };

  document.getElementById('theme-style-select').onchange = event => {
    setThemeStyle(event.target.value);
  };

  document.getElementById('lang-select').onchange = event => {
    setLang(event.target.value);
  };

  document.getElementById('ui-scale-select').onchange = event => {
    setUiScale(event.target.value);
  };

  document.getElementById('toggle-grid').onchange = event => {
    setGrid(event.target.checked);
  };

  const state = getThemeState();
  document.getElementById('theme-select').value = state.baseTheme;
  document.getElementById('theme-style-select').value = state.themeStyle;
  document.getElementById('lang-select').value = getLang();
  document.getElementById('ui-scale-select').value = state.uiScale;
  document.getElementById('toggle-grid').checked = state.grid;

  onLangChange(() => {
    applyLocalization();
    const settingsLabel = document.querySelector('#settings-toggle [data-l10n]');
    if (settingsLabel) settingsLabel.textContent = t('settings');
  });

  applyTheme();
}
