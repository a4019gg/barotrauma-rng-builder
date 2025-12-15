// js/db.ts — v0.9.401 — БАЗА ДАННЫХ С НОВЫМ ИНТЕРФЕЙСОМ АФФЛИКТОВ

import { loc } from './utils';

interface IconInfo {
  texture: string;
  sourcerect: string;
  color_theme_key: string;
  origin?: string;
}

interface AfflictionEntry {
  identifier: string;
  name?: string;
  name_key?: string;
  description?: string;
  desc_key?: string;
  type: string;
  maxstrength: string | number;
  limbspecific: boolean;
  isbuff: boolean;
  icon: IconInfo;
}

class DatabaseManager {
  private afflictions: AfflictionEntry[] = [];

  constructor() {
    this.loadAfflictions();
  }

  private async loadAfflictions() {
    try {
      const response = await fetch('data/afflictions.json');
      if (!response.ok) throw new Error('Failed to load afflictions');
      this.afflictions = await response.json();
      this.renderGrid('afflictions');
    } catch (err) {
      console.error('DB Error:', err);
      alert(loc('dbError'));
    }
  }

  openDB() {
    const overlay = document.createElement('div');
    overlay.className = 'db-modal-overlay';

    const content = document.createElement('div');
    content.className = 'db-modal-content';

    const header = document.createElement('div');
    header.className = 'db-modal-header';
    header.innerHTML = `<h2>${loc('dataBase')}</h2>`;

    const tabs = document.createElement('div');
    tabs.className = 'db-tabs';
    ['items', 'creatures', 'afflictions'].forEach(tab => {
      const btn = document.createElement('button');
      btn.className = 'db-tab-btn' + (tab === 'afflictions' ? ' active' : '');
      btn.textContent = loc('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
      btn.onclick = () => this.renderGrid(tab);
      tabs.appendChild(btn);
    });

    const search = document.createElement('input');
    search.type = 'text';
    search.className = 'db-search-input';
    search.placeholder = loc('searchPlaceholder');
    search.oninput = () => this.filterGrid(search.value);

    header.appendChild(tabs);
    header.appendChild(search);

    const grid = document.createElement('div');
    grid.className = 'db-grid';
    grid.id = 'db-grid';

    content.appendChild(header);
    content.appendChild(grid);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });

    this.renderGrid('afflictions');
  }

  private renderGrid(tab: string) {
    const grid = document.getElementById('db-grid') as HTMLElement;
    if (!grid) return;
    grid.innerHTML = '';

    const data = tab === 'afflictions' ? this.afflictions : [];

    if (data.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'db-empty';
      empty.textContent = loc('nothingFound');
      grid.appendChild(empty);
      return;
    }

    data.forEach(entry => {
      const card = this.createAfflictionCard(entry as AfflictionEntry);
      grid.appendChild(card);
    });
  }

  private createAfflictionCard(entry: AfflictionEntry): HTMLElement {
    const card = document.createElement('div');
    card.className = 'db-entry-btn';
    card.style.padding = '12px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '8px';
    card.style.fontSize = '14px';

    // Верхняя часть — иконка + имя + identifier
    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.alignItems = 'center';
    topRow.style.gap = '12px';

    const iconCanvas = this.createIconCanvas(entry.icon);
    topRow.appendChild(iconCanvas);

    const namePart = document.createElement('div');
    const displayName = entry.name || loc(entry.name_key || '') || entry.identifier;
    namePart.textContent = `${displayName} (${entry.identifier})`;
    namePart.style.fontWeight = 'bold';
    namePart.style.color = '#61afef';
    topRow.appendChild(namePart);

    card.appendChild(topRow);

    // Бейджики
    const badgesRow = document.createElement('div');
    badgesRow.style.display = 'flex';
    badgesRow.style.gap = '8px';
    badgesRow.style.alignItems = 'center';
    badgesRow.style.flexWrap = 'wrap';

    const typeBadge = document.createElement('span');
    typeBadge.textContent = `[${entry.type}]`;
    typeBadge.style.padding = '2px 8px';
    typeBadge.style.background = '#444';
    typeBadge.style.borderRadius = '4px';
    typeBadge.style.fontSize = '12px';
    badgesRow.appendChild(typeBadge);

    const maxBadge = document.createElement('span');
    maxBadge.textContent = `[Max: ${entry.maxstrength}]`;
    maxBadge.style.padding = '2px 8px';
    maxBadge.style.background = '#555';
    maxBadge.style.borderRadius = '4px';
    maxBadge.style.fontSize = '12px';
    badgesRow.appendChild(maxBadge);

    if (entry.limbspecific) {
      const limbBadge = document.createElement('span');
      limbBadge.textContent = '[limb]';
      limbBadge.style.padding = '2px 8px';
      limbBadge.style.background = '#007acc';
      limbBadge.style.color = 'white';
      limbBadge.style.borderRadius = '4px';
      limbBadge.style.fontSize = '12px';
      badgesRow.appendChild(limbBadge);
    }

    if (entry.isbuff) {
      const buffBadge = document.createElement('span');
      buffBadge.textContent = '[buff]';
      buffBadge.style.padding = '2px 8px';
      buffBadge.style.background = '#218c21';
      buffBadge.style.color = 'white';
      buffBadge.style.borderRadius = '4px';
      buffBadge.style.fontSize = '12px';
      badgesRow.appendChild(buffBadge);
    }

    card.appendChild(badgesRow);

    // Краткое описание
    const shortDesc = document.createElement('div');
    const descText = entry.description || loc(entry.desc_key || '') || '';
    shortDesc.textContent = descText.length > 60 ? descText.substring(0, 60) + '...' : descText;
    shortDesc.style.color = '#aaa';
    shortDesc.style.fontSize = '13px';
    shortDesc.style.marginTop = '4px';
    card.appendChild(shortDesc);

    // Разделитель
    const separator = document.createElement('div');
    separator.style.height = '1px';
    separator.style.background = '#444';
    separator.style.margin = '8px 0';
    card.appendChild(separator);

    // Полное описание и детали
    const fullDesc = document.createElement('div');
    fullDesc.textContent = descText || 'Нет описания';
    fullDesc.style.marginBottom = '8px';
    card.appendChild(fullDesc);

    const details = [
      { label: 'ID', value: entry.identifier },
      { label: 'Тип', value: entry.type },
      { label: 'Макс. сила', value: entry.maxstrength },
      { label: 'Локально', value: entry.limbspecific ? 'да' : 'нет' },
      { label: 'Бафф', value: entry.isbuff ? 'да' : 'нет' }
    ];

    details.forEach(d => {
      const line = document.createElement('div');
      line.innerHTML = `<strong>${d.label}:</strong> ${d.value}`;
      line.style.fontSize = '13px';
      card.appendChild(line);
    });

    // Пустая строка в конце
    const spacer = document.createElement('div');
    spacer.style.height = '8px';
    card.appendChild(spacer);

    return card;
  }

  private createIconCanvas(icon: IconInfo): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Заглушка — в будущем загрузим атлас и вырежем sourcerect
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, 48, 48);

    // Применение цвета по color_theme_key
    const rgbVar = getComputedStyle(document.documentElement).getPropertyValue(`--${icon.color_theme_key}-rgb`).trim();
    if (rgbVar) {
      const [r, g, b] = rgbVar.split(',').map(v => parseInt(v.trim()));
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
      ctx.fillRect(0, 0, 48, 48);
    }

    ctx.strokeStyle = '#61afef';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 44, 44);

    return canvas;
  }

  private filterGrid(query: string) {
    const grid = document.getElementById('db-grid') as HTMLElement;
    if (!grid) return;

    const cards = grid.querySelectorAll('.db-entry-btn');
    cards.forEach(card => {
      const text = card.textContent?.toLowerCase() || '';
      (card as HTMLElement).style.display = text.includes(query.toLowerCase()) ? 'flex' : 'none';
    });
  }
}

const dbManager = new DatabaseManager();
(window as any).dbManager = dbManager;

export default dbManager;
