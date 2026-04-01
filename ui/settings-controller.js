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

  const state = getThemeState();
  if (gridToggle) {
    gridToggle.checked = state.grid;
    gridToggle.onchange = event => setGrid(event.target.checked);
  }
  if (chanceColorsToggle) {
    chanceColorsToggle.checked = state.chanceColorCoding;
    chanceColorsToggle.onchange = event => setChanceColorCoding(event.target.checked);
  }
  setChanceInputMode(state.chanceInputMode);
  setAppSetting('autoChanceMode', getAppSetting('autoChanceMode') || 'off');

  onLangChange(() => applyLocalization());

  applyTheme();
  onThemeChange(currentState => {
    if (gridToggle) gridToggle.checked = currentState.grid;
    if (chanceColorsToggle) chanceColorsToggle.checked = currentState.chanceColorCoding;
  });
}

export function openSettingsPanel() {
  applyLocalization();
}

export function closeSettingsPanel() {
  // Legacy floating panel removed.
}
