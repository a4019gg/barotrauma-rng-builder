// js/db.js — v0.9.408 — БАЗА ДАННЫХ С ЛОКАЛИЗАЦИЕЙ ТОЛЬКО ИНТЕРФЕЙСА

const DB_VERSION = "v0.9.408";
window.DB_VERSION = DB_VERSION;

class DatabaseManager {
  constructor() {
    this.afflictions = [];
    this.items = [];
    this.creatures = [];
    this.iconCache = new Map();
    this.atlasCache = new Map();
    this.pendingAtlases = new Map();
    this.currentTab = 'afflictions';
    this.isModalOpen = false;
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
    if (this.isModalOpen) return;
    this.isModalOpen = true;

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
      if (e.target === overlay) {
        overlay.remove();
        this.isModalOpen = false;
      }
    });

    this.renderGrid('afflictions');
  }

  createTabs() {
    const tabs = document.createElement('div');
    tabs.className = 'db-tabs';

    ['afflictions', 'items', 'creatures'].forEach(tab => {
      const btn = document.createElement('button');
      btn.className = 'db-tab-btn';
      btn.textContent = loc('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
      btn.dataset.tab = tab;
      btn.onclick = () => {
        tabs.querySelectorAll('.db-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentTab = tab;
        this.renderGrid(tab);
      };
      if (tab === 'afflictions') btn.classList.add('active');
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

    // Верхняя часть: иконка + название
    const top = document.createElement('div');
    top.style.display = 'flex';
    top.style.alignItems = 'center';
    top.style.gap = '12px';
    top.style.marginBottom = '8px';

    const icon = this.createRealIcon(entry.icon || {});
    top.appendChild(icon);

    const displayName = entry.name || entry.identifier || 'Unknown';
    const nameDiv = document.createElement('div');
    nameDiv.textContent = displayName;
    nameDiv.style.fontWeight = 'bold';
    nameDiv.style.color = '#61afef';
    nameDiv.style.fontSize = '16px';
    top.appendChild(nameDiv);

    card.appendChild(top);

    // ID на отдельной строке
    const idLine = document.createElement('div');
    idLine.textContent = 'ID: ' + (entry.identifier || 'unknown');
    idLine.style.color = '#aaa';
    idLine.style.fontSize = '13px';
    idLine.style.wordBreak = 'break-all';
    card.appendChild(idLine);

    if (type === 'afflictions') {
      this.appendAfflictionDetails(card, entry);
    } else if (type === 'items') {
      this.appendItemDetails(card, entry);
    } else if (type === 'creatures') {
      this.appendCreatureDetails(card, entry);
    }

    return card;
  }

  appendAfflictionDetails(card, entry) {
    const badges = document.createElement('div');
    badges.style.display = 'flex';
    badges.style.gap = '8px';
    badges.style.flexWrap = 'wrap';
    badges.style.marginBottom = '8px';

    const typeBadge = document.createElement('span');
    typeBadge.textContent = `[${entry.type || 'unknown'}]`;
    typeBadge.style.padding = '2px 8px';
    typeBadge.style.background = '#444';
    typeBadge.style.borderRadius = '4px';
    typeBadge.style.fontSize = '12px';
    badges.appendChild(typeBadge);

    const maxBadge = document.createElement('span');
    maxBadge.textContent = `[Макс. сила: ${entry.maxstrength || '—'}]`;
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

    const descText = entry.description || '';
    const shortDesc = document.createElement('div');
    shortDesc.textContent = descText.length > 60 ? descText.substring(0, 60) + '...' : descText;
    shortDesc.style.color = '#aaa';
    shortDesc.style.fontSize = '13px';
    shortDesc.style.marginBottom = '8px';
    card.appendChild(shortDesc);

    const separator = document.createElement('div');
    separator.style.height = '1px';
    separator.style.background = '#444';
    separator.style.margin = '8px 0';
    card.appendChild(separator);

    const fullDesc = document.createElement('div');
    fullDesc.textContent = descText || 'Нет описания';
    fullDesc.style.marginBottom = '8px';
    card.appendChild(fullDesc);

    const details = [
      { label: 'Тип', value: entry.type || '—' },
      { label: 'Макс. сила', value: entry.maxstrength || '—' },
      { label: 'Локально', value: entry.limbspecific ? 'да' : 'нет' },
      { label: 'Бафф', value: entry.isbuff ? 'да' : 'нет' }
    ];

    details.forEach(d => {
      const line = document.createElement('div');
      const label = document.createElement('strong');
      label.textContent = d.label + ': ';
      line.appendChild(label);
      line.appendChild(document.createTextNode(d.value));
      line.style.fontSize = '13px';
      card.appendChild(line);
    });
  }

  appendItemDetails(card, entry) {
    const placeholder = document.createElement('div');
    placeholder.textContent = 'Предмет: ' + (entry.identifier || 'unknown');
    placeholder.style.color = '#aaa';
    placeholder.style.fontSize = '14px';
    card.appendChild(placeholder);
  }

  appendCreatureDetails(card, entry) {
    const placeholder = document.createElement('div');
    placeholder.textContent = 'Существо: ' + (entry.identifier || 'unknown');
    placeholder.style.color = '#aaa';
    placeholder.style.fontSize = '14px';
    card.appendChild(placeholder);
  }

  createRealIcon(iconInfo) {
    const texture = iconInfo.texture || 'assets/textures/MainIconsAtlas.png';
    const sourcerect = iconInfo.sourcerect || '0,0,128,128';
    const colorKey = iconInfo.color_theme_key || 'icon-status-gray';

    const cacheKey = `${texture}|${sourcerect}|${colorKey}`;

    if (this.iconCache.has(cacheKey)) {
      return this.iconCache.get(cacheKey).cloneNode(true);
    }

    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;

    const atlasImg = this.atlasCache.get(texture);
    if (atlasImg && atlasImg.complete) {
      this.drawIconFromAtlas(ctx, atlasImg, sourcerect, colorKey);
    } else {
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, 48, 48);
      ctx.fillStyle = '#666';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 24, 24);

      this.loadAtlasAsync(texture).then(img => {
        this.drawIconFromAtlas(ctx, img, sourcerect, colorKey);
      });
    }

    this.iconCache.set(cacheKey, canvas);
    return canvas.cloneNode(true);
  }

  loadAtlasAsync(texture) {
    if (this.pendingAtlases.has(texture)) {
      return this.pendingAtlases.get(texture);
    }

    const img = new Image();
    img.src = texture;

    const promise = new Promise(resolve => {
      img.onload = () => {
        this.atlasCache.set(texture, img);
        resolve(img);
      };
      img.onerror = () => resolve(null);
    });

    this.pendingAtlases.set(texture, promise);
    return promise;
  }

  drawIconFromAtlas(ctx, img, sourcerect, colorKey) {
    if (!img) return;

    const rect = sourcerect.split(',').map(v => parseInt(v.trim()));
    const [sx, sy, sw, sh] = rect;

    ctx.clearRect(0, 0, 48, 48);
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 48, 48);

    const rgbVar = getComputedStyle(document.documentElement)
      .getPropertyValue(`--${colorKey}-rgb`).trim();

    if (rgbVar) {
      const [r, g, b] = rgbVar.split(',').map(v => parseInt(v.trim()));
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect(0, 0, 48, 48);
    }
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
