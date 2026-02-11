import { applyLocalization, getLang, onLangChange, setLang, t } from './localization.js';

const THEME_FILES = [
  { id: 'dark', file: './css/themes/dark.css' },
  { id: 'light', file: './css/themes/light.css' }
];

const defaults = {
  theme: 'dark',
  uiScale: '100',
  density: 'normal',
  shadows: true,
  grid: true,
  customThemeCss: ''
};

const state = {
  ...defaults,
  theme: localStorage.getItem('theme') || defaults.theme,
  uiScale: localStorage.getItem('uiScale') || defaults.uiScale,
  density: localStorage.getItem('nodeDensity') || defaults.density,
  shadows: localStorage.getItem('nodeShadows') !== 'false',
  grid: localStorage.getItem('bgGrid') !== 'false',
  customThemeCss: localStorage.getItem('customThemeCss') || ''
};

function applyTheme() {
  const themeLink = document.getElementById('theme-style');
  const themeFile = THEME_FILES.find(entry => entry.id === state.theme)?.file || THEME_FILES[0].file;
  themeLink.href = themeFile;

  document.body.dataset.uiScale = state.uiScale;
  document.body.dataset.nodeDensity = state.density;
  document.body.dataset.nodeShadows = state.shadows ? 'high' : 'off';
  document.body.dataset.bgGrid = state.grid ? 'visible' : 'off';

  const customStyle = document.getElementById('custom-theme-style');
  customStyle.textContent = state.customThemeCss;

  localStorage.setItem('theme', state.theme);
  localStorage.setItem('uiScale', state.uiScale);
  localStorage.setItem('nodeDensity', state.density);
  localStorage.setItem('nodeShadows', String(state.shadows));
  localStorage.setItem('bgGrid', String(state.grid));
  localStorage.setItem('customThemeCss', state.customThemeCss);
}

export function initSettingsController() {
  const settingsRoot = document.getElementById('settings-panel');
  const toggleBtn = document.getElementById('settings-toggle');

  toggleBtn.addEventListener('click', () => {
    settingsRoot.classList.toggle('open');
    applyLocalization(settingsRoot);
  });

  document.getElementById('theme-select').onchange = event => {
    state.theme = event.target.value;
    applyTheme();
  };

  document.getElementById('lang-select').onchange = event => {
    setLang(event.target.value);
  };

  document.getElementById('ui-scale-select').onchange = event => {
    state.uiScale = event.target.value;
    applyTheme();
  };

  document.getElementById('density-select').onchange = event => {
    state.density = event.target.value;
    applyTheme();
  };

  document.getElementById('toggle-shadows').onchange = event => {
    state.shadows = event.target.checked;
    applyTheme();
  };

  document.getElementById('toggle-grid').onchange = event => {
    state.grid = event.target.checked;
    applyTheme();
  };

  document.getElementById('theme-editor').oninput = event => {
    state.customThemeCss = event.target.value;
  };

  document.getElementById('save-custom-theme').onclick = () => {
    applyTheme();
  };

  document.getElementById('reset-custom-theme').onclick = () => {
    state.customThemeCss = '';
    document.getElementById('theme-editor').value = '';
    applyTheme();
  };

  document.getElementById('theme-select').value = state.theme;
  document.getElementById('lang-select').value = getLang();
  document.getElementById('ui-scale-select').value = state.uiScale;
  document.getElementById('density-select').value = state.density;
  document.getElementById('toggle-shadows').checked = state.shadows;
  document.getElementById('toggle-grid').checked = state.grid;
  document.getElementById('theme-editor').value = state.customThemeCss;

  onLangChange(() => {
    applyLocalization();
    document.getElementById('settings-toggle').textContent = t('settings');
  });

  applyTheme();
}
