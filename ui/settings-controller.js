import { applyLocalization, getLang, onLangChange, setLang, t } from './localization.js';
import {
  applyTheme,
  getThemeState,
  onThemeChange,
  setBaseTheme,
  setChanceColorCoding,
  setChanceInputMode,
  setGrid,
  setThemeStyle,
  setUiScale
} from './theme-manager.js';
import { appendIconLabel } from './icon-component.js';

function renderThemeToggle() {
  const state = getThemeState();
  const toggle = document.getElementById('theme-toggle');
  const nextTheme = state.baseTheme === 'dark' ? 'light' : 'dark';
  appendIconLabel(toggle, {
    icon: state.baseTheme === 'dark' ? 'moon' : 'sun',
    label: state.baseTheme === 'dark' ? 'Dark' : 'Light'
  });
  toggle.onclick = () => setBaseTheme(nextTheme);
}

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

  document.getElementById('theme-style-select').onchange = event => setThemeStyle(event.target.value);
  document.getElementById('lang-select').onchange = event => setLang(event.target.value);
  document.getElementById('ui-scale-select').onchange = event => setUiScale(event.target.value);
  document.getElementById('toggle-grid').onchange = event => setGrid(event.target.checked);
  document.getElementById('toggle-chance-colors').onchange = event => setChanceColorCoding(event.target.checked);
  document.getElementById('chance-input-mode').onchange = event => setChanceInputMode(event.target.value);

  const state = getThemeState();
  document.getElementById('theme-style-select').value = state.themeStyle;
  document.getElementById('lang-select').value = getLang();
  document.getElementById('ui-scale-select').value = state.uiScale;
  document.getElementById('toggle-grid').checked = state.grid;
  document.getElementById('toggle-chance-colors').checked = state.chanceColorCoding;
  document.getElementById('chance-input-mode').value = state.chanceInputMode;

  onLangChange(() => {
    applyLocalization();
    const settingsLabel = document.querySelector('#settings-toggle [data-l10n]');
    if (settingsLabel) settingsLabel.textContent = t('settings');
  });

  applyTheme();
  renderThemeToggle();
  onThemeChange(currentState => {
    document.getElementById('toggle-chance-colors').checked = currentState.chanceColorCoding;
    document.getElementById('chance-input-mode').value = currentState.chanceInputMode;
    renderThemeToggle();
  });
}
