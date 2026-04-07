export function chanceHeatClass(probability, enabled) {
  if (!enabled || !Number.isFinite(probability)) return '';
  if (probability <= 0.05) return 'heat-prob-red';
  if (probability <= 0.2) return 'heat-prob-orange';
  if (probability <= 0.5) return 'heat-prob-yellow';
  return 'heat-prob-green';
}
