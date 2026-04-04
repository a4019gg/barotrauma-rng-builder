let tooltipEl = null;
let showTimer = null;
let activeTarget = null;
const SHOW_DELAY_MS = 240;

function ensureTooltip() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement('div');
  tooltipEl.className = 'app-tooltip';
  tooltipEl.setAttribute('role', 'tooltip');
  tooltipEl.hidden = true;
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

function positionTooltip(target) {
  const el = ensureTooltip();
  const rect = target.getBoundingClientRect();
  const { innerWidth, innerHeight } = window;
  const margin = 12;
  const tooltipRect = el.getBoundingClientRect();
  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
  let top = rect.top - tooltipRect.height - 10;

  if (left < margin) left = margin;
  if (left + tooltipRect.width > innerWidth - margin) left = innerWidth - tooltipRect.width - margin;
  if (top < margin) top = Math.min(innerHeight - tooltipRect.height - margin, rect.bottom + 10);

  el.style.left = `${Math.round(left)}px`;
  el.style.top = `${Math.round(top)}px`;
}

function hideTooltip() {
  if (showTimer) {
    clearTimeout(showTimer);
    showTimer = null;
  }
  activeTarget = null;
  if (!tooltipEl) return;
  tooltipEl.hidden = true;
  tooltipEl.classList.remove('is-visible');
}

function showTooltip(target) {
  const message = target?.dataset?.tooltip?.trim();
  if (!message) return;
  const el = ensureTooltip();
  activeTarget = target;
  el.textContent = message;
  el.hidden = false;
  requestAnimationFrame(() => {
    if (activeTarget !== target) return;
    positionTooltip(target);
    el.classList.add('is-visible');
  });
}

function scheduleShow(target) {
  hideTooltip();
  showTimer = window.setTimeout(() => {
    showTimer = null;
    showTooltip(target);
  }, SHOW_DELAY_MS);
}

function getTooltipTarget(eventTarget) {
  if (!(eventTarget instanceof Element)) return null;
  const target = eventTarget.closest('[data-tooltip]');
  if (!target) return null;
  // XML output has its own tooltip system; suppress global tooltips there to avoid duplicates.
  if (target.closest('.xml-highlight-layer')) return null;
  return target;
}

export function setTooltip(target, message) {
  if (!target || !message) return target;
  target.dataset.tooltip = message;
  target.setAttribute('aria-label', target.getAttribute('aria-label') || message);
  return target;
}

export function initTooltips() {
  if (document.body.dataset.tooltipsReady === 'true') return;
  document.body.dataset.tooltipsReady = 'true';

  document.addEventListener('pointerenter', event => {
    const target = getTooltipTarget(event.target);
    if (!target) return;
    scheduleShow(target);
  }, true);

  document.addEventListener('pointerleave', event => {
    const target = getTooltipTarget(event.target);
    if (!target) return;
    if (activeTarget === target || showTimer) hideTooltip();
  }, true);

  document.addEventListener('focusin', event => {
    const target = getTooltipTarget(event.target);
    if (!target) return;
    scheduleShow(target);
  });

  document.addEventListener('focusout', event => {
    const target = getTooltipTarget(event.target);
    if (!target) return;
    hideTooltip();
  });

  window.addEventListener('scroll', () => activeTarget && positionTooltip(activeTarget), true);
  window.addEventListener('resize', () => activeTarget && positionTooltip(activeTarget));
}
