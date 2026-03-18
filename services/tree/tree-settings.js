export const DEFAULT_TREE_SETTINGS = {
  uiLevel: 'basic',
  displayPercent: 'links',
  autoChanceMode: 'off',
  dragEnabled: true,
  snapToGrid: true,
  showGrid: true,
  gridSize: 24,
  showMinimap: true,
  minimapDisplayPercent: 'links',
  minimapColorMode: 'success-failure',
  minimapMode: 'standard',
  minimapFocusMode: false,
  minimapTypeMode: 'dots',
  minimapPosition: { x: 18, y: 18 },
  minimapSizePreset: 'medium',
  minimapCustomSize: { width: 240, height: 150 },
  minimapScale: 1,
  smoothPaths: true,
  advancedExpanded: false,
  settingsCollapsed: false,
  showIntermediateNodes: true,
  debugBounds: false,
  showHeatmap: false
};

export function persistTreeSettings(settings, key = 'tree.settings.v2') {
  localStorage.setItem(key, JSON.stringify(settings));
}

export function loadTreeSettings(baseSettings, key = 'tree.settings.v2') {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...baseSettings, ...(parsed && typeof parsed === 'object' ? parsed : {}) };
  } catch (_) {
    return { ...baseSettings };
  }
}
