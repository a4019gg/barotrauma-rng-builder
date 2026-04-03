import { buildHighlightedXml, formatXml } from './xml-syntax-service.js';

const DEFAULT_FEATURES = {
  syntax: true,
  warnings: true,
  tooltips: true,
  inlineHints: true,
  blockHover: true,
  clickable: true,
  diff: true
};

export class XmlViewerService {
  constructor({ textarea, layer, tooltip, searchInput, searchCount, onElementClick }) {
    this.textarea = textarea;
    this.layer = layer;
    this.tooltip = tooltip;
    this.searchInput = searchInput;
    this.searchCount = searchCount;
    this.onElementClick = onElementClick;
    this.mode = 'pretty';
    this.searchIndex = 0;
    this.searchMatches = [];
    this.features = { ...DEFAULT_FEATURES };
    this.previousText = '';
    this.rawText = '';
    this.bind();
  }

  bind() {
    this.textarea?.addEventListener('scroll', () => this.syncScroll());
    this.layer?.addEventListener('pointermove', event => this.handlePointerMove(event));
    this.layer?.addEventListener('pointerleave', () => this.clearHover());
    this.layer?.addEventListener('click', event => this.handleClick(event));
    this.searchInput?.addEventListener('input', () => this.render());
  }

  setFeatures(next = {}) {
    this.features = { ...this.features, ...next };
    this.render();
  }

  setMode(mode) {
    this.mode = mode === 'minify' ? 'minify' : 'pretty';
    this.render();
  }

  setXml(xmlText) {
    this.previousText = this.rawText;
    this.rawText = String(xmlText || '');
    this.textarea.value = formatXml(this.mode, this.rawText);
    this.render();
  }

  copyPlain() {
    return this.textarea.value;
  }

  goToSearch(direction = 1) {
    if (!this.searchMatches.length) return;
    this.searchIndex = (this.searchIndex + direction + this.searchMatches.length) % this.searchMatches.length;
    const match = this.searchMatches[this.searchIndex];
    const lineEl = this.layer.querySelector(`.xml-line[data-line="${match.lineIndex}"]`);
    lineEl?.scrollIntoView({ block: 'center' });
    this.updateSearchCounter();
  }

  render() {
    const query = this.searchInput?.value || '';
    const { html, searchMatches } = buildHighlightedXml(this.textarea.value, { searchQuery: query });
    this.searchMatches = searchMatches;
    if (this.searchIndex >= searchMatches.length) this.searchIndex = 0;

    let output = html;
    if (this.features.diff) output = this.applyDiff(output);
    this.layer.innerHTML = output;
    this.layer.dataset.mode = this.mode;
    this.layer.dataset.syntax = this.features.syntax ? 'on' : 'off';
    this.layer.dataset.warnings = this.features.warnings ? 'on' : 'off';
    this.layer.dataset.hints = this.features.inlineHints ? 'on' : 'off';
    this.syncScroll();
    this.updateSearchCounter();
  }

  applyDiff(html) {
    if (!this.previousText || this.previousText === this.rawText) return html;
    const prevLines = new Set(this.previousText.split('\n'));
    return html.replace(/<div class="xml-line" data-line="(\d+)"[^>]*>(.*?)<\/div>/g, (full, lineIndex, body) => {
      const textContent = body.replace(/<[^>]+>/g, '').replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
      if (!prevLines.has(textContent.trim())) return `<div class="xml-line xml-line-added" data-line="${lineIndex}">${body}</div>`;
      return full;
    });
  }

  syncScroll() {
    if (!this.layer || !this.textarea) return;
    this.layer.scrollTop = this.textarea.scrollTop;
    this.layer.scrollLeft = this.textarea.scrollLeft;
  }

  updateSearchCounter() {
    if (!this.searchCount) return;
    if (!this.searchMatches.length) {
      this.searchCount.textContent = '0/0';
      return;
    }
    this.searchCount.textContent = `${this.searchIndex + 1}/${this.searchMatches.length}`;
  }

  handlePointerMove(event) {
    const tag = event.target.closest('.xml-tag');
    if (!tag || !this.features.blockHover) {
      this.clearHover();
      return;
    }
    this.layer.querySelectorAll('.xml-tag-hover, .xml-line-hover').forEach(el => el.classList.remove('xml-tag-hover', 'xml-line-hover'));
    const tagName = tag.dataset.tag;
    this.layer.querySelectorAll(`.xml-tag[data-tag="${CSS.escape(tagName)}"]`).forEach(el => el.classList.add('xml-tag-hover'));
    const start = Number(tag.dataset.blockStart);
    const end = Number(tag.dataset.blockEnd);
    if (Number.isFinite(start) && Number.isFinite(end)) {
      for (let i = start; i <= end; i += 1) {
        this.layer.querySelector(`.xml-line[data-line="${i}"]`)?.classList.add('xml-line-hover');
      }
    }

    if (this.features.tooltips) {
      const tipTarget = event.target.closest('[data-tooltip], [data-entity]');
      if (tipTarget) {
        const text = tipTarget.dataset.tooltip || tipTarget.dataset.entity || '';
        this.showTooltip(text, event.clientX, event.clientY);
      } else {
        this.hideTooltip();
      }
    }
  }

  handleClick(event) {
    if (!this.features.clickable) return;
    const tag = event.target.closest('.xml-tag');
    if (!tag) return;
    const identifier = event.target.closest('.xml-string')?.textContent?.replaceAll('"', '') || '';
    this.onElementClick?.({ tag: tag.dataset.tag, identifier });
  }

  clearHover() {
    this.layer.querySelectorAll('.xml-tag-hover, .xml-line-hover').forEach(el => el.classList.remove('xml-tag-hover', 'xml-line-hover'));
    this.hideTooltip();
  }

  showTooltip(text, x, y) {
    if (!this.tooltip) return;
    this.tooltip.hidden = false;
    this.tooltip.textContent = text;
    this.tooltip.style.left = `${x + 12}px`;
    this.tooltip.style.top = `${y + 12}px`;
  }

  hideTooltip() {
    if (!this.tooltip) return;
    this.tooltip.hidden = true;
  }
}
