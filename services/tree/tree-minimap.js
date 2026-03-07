export function minimapSizeFromPreset(preset, custom, presets) {
  if (preset === 'auto') return custom;
  return presets[preset] || custom;
}
