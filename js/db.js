// js/db.js — v0.9.401 — БАЗА ДАННЫХ С КЭШИРОВАНИЕМ ИКОНОК И ПОЛНОЙ ЛОКАЛИЗАЦИЕЙ

const DB_VERSION = "v0.9.401";
window.DB_VERSION = DB_VERSION;

class DatabaseManager {
  constructor() {
    this.afflictions = [];
    this.items = [];
    this.creatures = [];
    this.iconCache = new Map(); // Кэш иконок: ключ — строка с данными иконки
    this.loadData();
  }

  async loadData() {
    try {
      const [affResp, itemResp, creatureResp] = await Promise.all([
        fetch('data/afflictions.json'),
        fetch('data/items.json'),
        fetch('data/creatures.json')
      ]);

      if (affResp.ok) this.afflictions = await affResp.json();
      if (itemResp.ok) this.items = await itemResp.json();
      if (creatureResp.ok) this.creatures = await creatureResp.json();
    } catch (err) {
      console.error('Failed to load database', err);
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

    const tabs = this.createTabs();
    const search = this.createSearchInput();
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

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'db-tabs';

    ['afflictions', 'items', 'creatures'].forEach(tab => {
      const btn = document.createElement('button');
      btn.className = 'db-tab-btn' + (tab === 'afflictions' ? ' active' : '');
      btn.textContent = loc('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
      btn.onclick = () => this.renderGrid(tab);
      tabs.appendChild(btn);
    });

    return tabs;
  }

  createSearchInput() {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'db-search-input';
    input.placeholder = loc('searchPlaceholder');
    input.oninput = (e) => this.filterGrid(e.target.value);
    return input;
  }

  renderGrid(type) {
    const grid = document.getElementById('db-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const data = this[type] || [];

    if (data.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'db-empty';
      empty.textContent = loc('nothingFound');
      grid.appendChild(empty);
      return;
    }

    data.forEach(entry => {
      const card = this.createCard(entry, type);
      grid.appendChild(card);
    });
  }

  createCard(entry, type) {
    const card = document.createElement('div');
    card.className = 'db-entry-btn';
    card.style.padding = '12px';
    card.style.display = 'flex';
    card.style.flexDirection = 'column';
    card.style.gap = '8px';
    card.style.fontSize = '14px';

    // Верхняя часть: иконка + имя + identifier
    const top = document.createElement('div');
    top.style.display = 'flex';
    top.style.alignItems = 'center';
    top.style.gap = '12px';
    top.style.marginBottom = '8px';

    const icon = this.createIcon(entry.icon);
    top.appendChild(icon);

    const displayName = entry.name || loc(entry.name_key || '') || entry.identifier;
    const name = document.createElement('div');
    name.textContent = `${displayName} (${entry.identifier})`;
    name.style.fontWeight = 'bold';
    name.style.color = '#61afef';
    top.appendChild(name);

    card.appendChild(top);

    // Бейджики
    const badges = document.createElement('div');
    badges.style.display = 'flex';
    badges.style.gap = '8px';
    badges.style.flexWrap = 'wrap';
    badges.style.marginBottom = '8px';

    const typeBadge = document.createElement('span');
    typeBadge.textContent = `[${entry.type}]`;
    typeBadge.style.padding = '2px 8px';
    typeBadge.style.background = '#444';
    typeBadge.style.borderRadius = '4px';
    typeBadge.style.fontSize = '12px';
    badges.appendChild(typeBadge);

    const maxBadge = document.createElement('span');
    maxBadge.textContent = `[${loc('dbDetailMaxStrength')}: ${entry.maxstrength}]`;
    maxBadge.style.padding = '2px 8px';
    maxBadge.style.background = '#555';
    maxBadge.style.borderRadius = '4px';
    maxBadge.style.fontSize = '12px';
    badges.appendChild(maxBadge);

    if (entry.limbspecific) {
      const limbBadge = document.createElement('span');
      limbBadge.textContent = '[limb]';
      limbBadge.style.padding = '2px 8px';
      limbBadge.style.background = '#007acc';
      limbBadge.style.color = 'white';
      limbBadge.style.borderRadius = '4px';
      limbBadge.style.fontSize = '12px';
      badges.appendChild(limbBadge);
    }

    if (entry.isbuff) {
      const buffBadge = document.createElement('span');
      buffBadge.textContent = '[buff]';
      buffBadge.style.padding = '2px 8px';
      buffBadge.style.background = '#218c21';
      buffBadge.style.color = 'white';
      buffBadge.style.borderRadius = '4px';
      buffBadge.style.fontSize = '12px';
      badges.appendChild(buffBadge);
    }

    card.appendChild(badges);

    // Краткое описание
    const shortDesc = document.createElement('div');
    const descText = entry.description || loc(entry.desc_key || '') || '';
    shortDesc.textContent = descText.length > 60 ? descText.substring(0, 60) + '...' : descText;
    shortDesc.style.color = '#aaa';
    shortDesc.style.fontSize = '13px';
    shortDesc.style.marginBottom = '8px';
    card.appendChild(shortDesc);

    // Разделитель
    const separator = document.createElement('div');
    separator.style.height = '1px';
    separator.style.background = '#444';
    separator.style.margin = '8px 0';
    card.appendChild(separator);

    // Полное описание
    const fullDesc = document.createElement('div');
    fullDesc.textContent = descText || loc('noDescription');
    fullDesc.style.marginBottom = '8px';
    card.appendChild(fullDesc);

    // Детали с локализацией
    const details = [
      { key: 'dbDetailID', value: entry.identifier },
      { key: 'dbDetailType', value: entry.type },
      { key: 'dbDetailMaxStrength', value: entry.maxstrength },
      { key: 'dbDetailLimbSpecific', value: entry.limbspecific ? loc('yes') : loc('no') },
      { key: 'dbDetailIsBuff', value: entry.isbuff ? loc('yes') : loc('no') }
    ];

    details.forEach(d => {
      const line = document.createElement('div');
      const label = document.createElement('strong');
      label.textContent = loc(d.key) + ': ';
      line.appendChild(label);
      line.appendChild(document.createTextNode(d.value));
      line.style.fontSize = '13px';
      card.appendChild(line);
    });

    // Пустое пространство в конце
    const spacer = document.createElement('div');
    spacer.style.height = '8px';
    card.appendChild(spacer);

    return card;
  }

  createIcon(iconInfo) {
    const cacheKey = `${iconInfo.texture}|${iconInfo.sourcerect}|${iconInfo.color_theme_key}`;
    if (this.iconCache.has(cacheKey)) {
      return this.iconCache.get(cacheKey).cloneNode(true);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    // Прозрачный фон
    ctx.clearRect(0, 0, 48, 48);

    // Заглушка — белый силуэт (в будущем — реальное изображение из атласа)
    ctx.fillStyle = 'white';
    ctx.fillRect(8, 8, 32, 32);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 32, 32);

    // Применение цвета по color_theme_key
    const rgbVar = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${iconInfo.color_theme_key}-rgb`).trim();

    if (rgbVar) {
      const [r, g, b] = rgbVar.split(',').map(v => parseInt(v.trim()));
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(0, 0, 48, 48);
    }

    // Обводка закомментирована
    /*
    ctx.strokeStyle = '#61afef';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 44, 44);
    */

    // Кэшируем оригинал
    this.iconCache.set(cacheKey, canvas);

    return canvas.cloneNode(true);
  }

  filterGrid(query) {
    const grid = document.getElementById('db-grid');
    if (!grid) return;

    const cards = grid.querySelectorAll('.db-entry-btn');
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
  }
}

const dbManager = new DatabaseManager();
window.dbManager = dbManager;
