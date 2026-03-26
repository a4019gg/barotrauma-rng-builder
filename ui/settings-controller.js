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
  const chanceInputModeSelect = document.getElementById('chance-input-mode');
  const autoChanceGlobalSelect = document.getElementById('auto-chance-global');

  const state = getThemeState();
  if (gridToggle) {
    gridToggle.checked = state.grid;
    gridToggle.onchange = event => setGrid(event.target.checked);
  }
  if (chanceColorsToggle) {
    chanceColorsToggle.checked = state.chanceColorCoding;
    chanceColorsToggle.onchange = event => setChanceColorCoding(event.target.checked);
  }
  if (chanceInputModeSelect) {
    chanceInputModeSelect.value = state.chanceInputMode;
    chanceInputModeSelect.onchange = event => setChanceInputMode(event.target.value);
  }
  if (autoChanceGlobalSelect) {
    autoChanceGlobalSelect.value = getAppSetting('autoChanceMode') || 'off';
    autoChanceGlobalSelect.onchange = event => setAppSetting('autoChanceMode', event.target.value);
  }

  onLangChange(() => applyLocalization());

  applyTheme();
  onThemeChange(currentState => {
    if (gridToggle) gridToggle.checked = currentState.grid;
    if (chanceColorsToggle) chanceColorsToggle.checked = currentState.chanceColorCoding;
    if (chanceInputModeSelect) chanceInputModeSelect.value = currentState.chanceInputMode;
  });
}

export function openSettingsPanel() {
  applyLocalization();
}

export function closeSettingsPanel() {
  // Legacy floating panel removed.
}
