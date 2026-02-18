import { getThemeState } from './theme-manager.js';

function trimZeros(value) {
  return value.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

export function parseChanceInput(rawValue) {
  const mode = getThemeState().chanceInputMode;
  const text = String(rawValue ?? '').trim().replace(',', '.');
  if (!text) return 0;

  const hasPercentSign = text.endsWith('%');
  const numeric = Number(hasPercentSign ? text.slice(0, -1).trim() : text);
  if (!Number.isFinite(numeric)) return 0;

  const chance = hasPercentSign || mode === 'percent' ? numeric / 100 : numeric;
  return Math.max(0, Math.min(1, chance));
}

export function formatChanceForInput(chance) {
  const mode = getThemeState().chanceInputMode;
  const numericChance = Number(chance);
  const safeChance = Number.isFinite(numericChance) ? Math.max(0, Math.min(1, numericChance)) : 0;

  if (mode === 'percent') {
    return trimZeros((safeChance * 100).toFixed(2));
  }
  return trimZeros(safeChance.toFixed(4));
}

