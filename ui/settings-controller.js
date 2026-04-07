import { applyLocalization, onLangChange } from './localization.js';
import {
  applyTheme,
  getThemeState,
  onThemeChange,
  setChanceColorCoding,
  setChanceInputMode,
  setGrid,
} from './theme-manager.js';
import { getAppSetting, setAppSetting } from '../state/app-settings.js';

export function initSettingsController() {
  const gridToggle = document.getElementById('toggle-grid');
  const chanceColorsToggle = document.getElementById('toggle-chance-colors');
  const buttonIconsToggle = document.getElementById('toggle-button-icons');

  const state = getThemeState();
  if (gridToggle) {
    gridToggle.checked = state.grid;
    gridToggle.onchange = event => setGrid(event.target.checked);
  }
  if (chanceColorsToggle) {
    chanceColorsToggle.checked = state.chanceColorCoding;
    chanceColorsToggle.onchange = event => setChanceColorCoding(event.target.checked);
  }
  if (buttonIconsToggle) {
    buttonIconsToggle.checked = getAppSetting('buttonIcons') !== false;
    buttonIconsToggle.onchange = event => setAppSetting('buttonIcons', event.target.checked);
  }
  setChanceInputMode(state.chanceInputMode);
  setAppSetting('autoChanceMode', getAppSetting('autoChanceMode') || 'off');

  onLangChange(() => applyLocalization());

  applyTheme();
  onThemeChange(currentState => {
    if (gridToggle) gridToggle.checked = currentState.grid;
    if (chanceColorsToggle) chanceColorsToggle.checked = currentState.chanceColorCoding;
    if (buttonIconsToggle) buttonIconsToggle.checked = getAppSetting('buttonIcons') !== false;
  });
}

export function openSettingsPanel() {
  applyLocalization();
}

export function closeSettingsPanel() {
  // Legacy floating panel removed.
}
